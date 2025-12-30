/**
 * ============================================
 * APPLE WALLET ONLY - Push Notification Service
 * ============================================
 * 
 * ⚠️  IMPORTANT: This module is EXCLUSIVELY for Apple Wallet updates.
 * Do NOT use this for Google Wallet - Google Wallet uses direct API calls.
 * 
 * This module handles sending APNs (Apple Push Notification Service) push notifications
 * to registered devices when Apple Wallet pass data changes (e.g., points update).
 * 
 * How Apple Wallet Updates Work:
 * 1. This function sends a silent push notification to registered devices
 * 2. Apple's servers receive the notification and fetch the updated pass from our server
 * 3. The pass is updated in the user's Wallet app automatically
 * 
 * Prerequisites:
 * 1. APNs certificate from Apple Developer Portal
 * 2. Environment variables configured (see below)
 * 3. Device registrations stored in pass_registrations table
 * 
 * Environment Variables Required:
 * - APNS_KEY_ID: Your APNs key ID
 * - APNS_TEAM_ID: Your Apple Team ID
 * - APNS_KEY_BASE64: Your APNs key file (.p8) encoded as Base64
 * - APNS_PRODUCTION: true for production, false for sandbox
 * - PASS_TYPE_ID: Your Pass Type ID (e.g., pass.com.vigocoffee.loyalty)
 * 
 * For Google Wallet updates, use: lib/google-wallet/pass-updater.ts
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import apn from 'node-apn';

/**
 * Sends push notification to all devices registered for a pass
 * This tells Apple that the pass has been updated, and Apple will
 * then fetch the latest version from your server
 * 
 * @param serialNumber - User ID (pass serial number)
 * @param passTypeIdentifier - Pass Type ID
 * @returns Number of devices notified
 */
export async function notifyPassUpdate(
  serialNumber: string,
  passTypeIdentifier: string = process.env.PASS_TYPE_ID || 'pass.com.vigocoffee.loyalty'
): Promise<number> {
  try {
    // Get all registered devices for this pass
    // Use service role to bypass RLS since this is called from API routes
    const supabase = createServiceRoleClient();
    const { data: registrations, error } = await supabase
      .from('pass_registrations')
      .select('device_library_identifier, push_token')
      .eq('serial_number', serialNumber)
      .eq('pass_type_identifier', passTypeIdentifier)
      .not('push_token', 'is', null);

    if (error) {
      console.error('🍎 [APPLE WALLET] Error fetching registrations:', error);
      return 0;
    }

    if (!registrations || registrations.length === 0) {
      console.log(`🍎 [APPLE WALLET] ⚠️  No registered devices found for pass ${serialNumber}`);
      console.log(`🍎 [APPLE WALLET]    Pass must be registered first for instant updates`);
      console.log(`🍎 [APPLE WALLET]    Apple will register automatically within 1-2 minutes of adding pass to Wallet`);
      console.log(`🍎 [APPLE WALLET]    Until then, pass will update when user opens it in Wallet`);
      return 0;
    }

    // Check if APNs is configured
    if (!isPushNotificationsConfigured()) {
        console.log(`🍎 [APPLE WALLET] ⚠️  APNs not configured, skipping push notification for pass ${serialNumber}`);
        console.log(`🍎 [APPLE WALLET]    Would send push notifications to ${registrations.length} devices`);
        return registrations.length;
    }

    try {
        // Convert Base64 key to Buffer (for Vercel/serverless compatibility)
        const keyBuffer = Buffer.from(process.env.APNS_KEY_BASE64 || '', 'base64');
        const options = {
            token: {
                key: keyBuffer,
                keyId: process.env.APNS_KEY_ID || '',
                teamId: process.env.APNS_TEAM_ID || '',
            },
            production: process.env.APNS_PRODUCTION === 'true',
        };

        const apnProvider = new apn.Provider(options);

        // Create notification for each device
        const notifications = registrations.map(reg => {
            // Extract push token - handle both plain string and JSON string formats
            let pushToken = reg.push_token;
            if (typeof pushToken === 'string' && pushToken.startsWith('{')) {
                try {
                    const parsed = JSON.parse(pushToken);
                    pushToken = parsed.pushToken || parsed.push_token || pushToken;
                } catch (e) {
                    // If JSON parsing fails, use as-is
                    console.warn(`🍎 [APPLE WALLET] ⚠️  Could not parse push token JSON for device ${reg.device_library_identifier}`);
                }
            }
            
            const notification = new apn.Notification();
            notification.topic = passTypeIdentifier;
            notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
            // For Wallet pass updates, we need a SILENT background notification
            // This tells Apple to fetch the updated pass without showing an alert to the user
            notification.contentAvailable = true;
            notification.payload = {};
            
            return apnProvider.send(notification, pushToken);
        });

        const results = await Promise.all(notifications);
        apnProvider.shutdown();
        
        const successCount = results.filter(result => result.sent && result.sent.length > 0).length;
        const failedCount = results.filter(result => result.failed && result.failed.length > 0).length;

        // Log detailed results
        results.forEach((result, index) => {
            if (result.sent && result.sent.length > 0) {
                console.log(`🍎 [APPLE WALLET] ✅ Push notification sent successfully to device ${index + 1}`);
            }
            if (result.failed && result.failed.length > 0) {
                result.failed.forEach((failure: any) => {
                    console.error(`🍎 [APPLE WALLET] ❌ Failed to send push notification to device ${index + 1}:`, failure);
                    if (failure.response) {
                        console.error(`🍎 [APPLE WALLET]    APNs error:`, failure.response);
                    }
                });
            }
        });

        if (successCount > 0) {
            console.log(`🍎 [APPLE WALLET] ✅ Push notifications sent to ${successCount} devices for pass ${serialNumber}`);
            console.log(`🍎 [APPLE WALLET] 📱 Apple should fetch updated pass within a few seconds`);
        }
        if (failedCount > 0) {
            console.warn(`🍎 [APPLE WALLET] ⚠️  Failed to send push notifications to ${failedCount} devices`);
        }

        return successCount;
    } catch (apnsError: any) {
        console.error('🍎 [APPLE WALLET] ❌ Error sending APNs push notifications:', apnsError);
        return 0;
    }
  } catch (error: any) {
    console.error('🍎 [APPLE WALLET] Error in notifyPassUpdate:', error);
    return 0;
  }
}
/**
 * Sends push notification when a reward is earned
 * 
 * @param serialNumber - User ID
 * @param rewardType - 'coffee' or 'meal'
 * @param passTypeIdentifier - Pass Type ID
 */
export async function notifyRewardEarned(
  serialNumber: string,
  rewardType: 'coffee' | 'meal',
  passTypeIdentifier: string = process.env.PASS_TYPE_ID || 'pass.com.vigocoffee.loyalty'
): Promise<void> {
  const rewardMessage = rewardType === 'meal' 
    ? '🎉 You earned a FREE MEAL! 🍽️'
    : '🎉 You earned a FREE COFFEE! ☕️';
  
  console.log(`🍎 [APPLE WALLET] 🎁 Reward earned notification: ${rewardMessage} for user ${serialNumber}`);
  
  // Send update notification (device will fetch latest pass)
  await notifyPassUpdate(serialNumber, passTypeIdentifier);

  // TODO: When APNs is configured, you can send a custom alert:
  /*
  // Custom alert for reward (requires APNs implementation)
  const notification = new apn.Notification();
  notification.alert = rewardMessage;
  notification.sound = 'default';
  notification.badge = 1;
  // ... send via APNs
  */
}

/**
 * Checks if push notifications are configured
 */
export function isPushNotificationsConfigured(): boolean {
  return !!(
    process.env.APNS_KEY_ID &&
    process.env.APNS_TEAM_ID &&
    process.env.APNS_KEY_BASE64 &&
    process.env.PASS_TYPE_ID
  );
}

