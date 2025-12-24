/**
 * Apple Push Notification Service (APNs) for Wallet Pass Updates
 * 
 * This module handles sending push notifications to registered devices
 * when pass data changes (e.g., points update).
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
 */

import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient();
    const { data: registrations, error } = await supabase
      .from('pass_registrations')
      .select('device_library_identifier, push_token')
      .eq('serial_number', serialNumber)
      .eq('pass_type_identifier', passTypeIdentifier)
      .not('push_token', 'is', null);

    if (error) {
      console.error('Error fetching registrations:', error);
      return 0;
    }

    if (!registrations || registrations.length === 0) {
      console.log(`No registered devices found for pass ${serialNumber}`);
      return 0;
    }

    // Check if APNs is configured
    if (!isPushNotificationsConfigured()) {
        console.log(`⚠️  APNs not configured, skipping push notification for pass ${serialNumber}`);
        console.log(`📱 Would send push notifications to ${registrations.length} devices`);
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
            const notification = new apn.Notification();
            notification.topic = passTypeIdentifier;
            notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
            notification.sound = 'default';
            notification.alert = 'Your loyalty card has been updated!';
            notification.payload = { 'aps': { 'content-available': 1 } };
            
            return apnProvider.send(notification, reg.push_token);
        });

        const results = await Promise.all(notifications);
        apnProvider.shutdown();
        
        const successCount = results.filter(result => result.sent).length;
        const failedCount = results.filter(result => !result.sent).length;

        if (successCount > 0) {
            console.log(`✅ Push notifications sent to ${successCount} devices for pass ${serialNumber}`);
        }
        if (failedCount > 0) {
            console.warn(`⚠️  Failed to send push notifications to ${failedCount} devices`);
        }

        return successCount;
    } catch (apnsError: any) {
        console.error('❌ Error sending APNs push notifications:', apnsError);
        return 0;
    }
  } catch (error: any) {
    console.error('Error in notifyPassUpdate:', error);
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
  
  console.log(`🎁 Reward earned notification: ${rewardMessage} for user ${serialNumber}`);
  
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

