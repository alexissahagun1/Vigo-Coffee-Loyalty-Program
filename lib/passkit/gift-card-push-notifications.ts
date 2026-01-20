/**
 * Gift Card Push Notification Service
 * 
 * Handles sending APNs push notifications for gift card balance updates
 */

import { notifyPassUpdate } from './push-notifications';

/**
 * Sends push notification when gift card balance is updated
 * 
 * @param serialNumber - Gift card serial number (used as pass serial number)
 * @returns Number of devices notified
 */
export async function notifyGiftCardUpdate(
  serialNumber: string
): Promise<number> {
  const passTypeIdentifier = process.env.GIFT_CARD_PASS_TYPE_ID || 'pass.com.vigocoffee.giftcard';
  
  console.log(`💳 [GIFT CARD] Sending push notification for gift card ${serialNumber}`);
  console.log(`💳 [GIFT CARD]    Pass Type: ${passTypeIdentifier}`);
  
  return await notifyPassUpdate(serialNumber, passTypeIdentifier);
}
