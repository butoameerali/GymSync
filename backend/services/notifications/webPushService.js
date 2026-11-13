import webpush from 'web-push';
import PushSubscription from '../../models/PushSubscription.js';

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Fallback auto-generation if keys are not in environment
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  try {
    const generated = webpush.generateVAPIDKeys();
    vapidKeys = generated;
  } catch (err) {
    console.warn('⚠️ Web Push key generation notice:', err.message);
  }
}

try {
  if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_CONTACT_EMAIL || 'mailto:support@gymsync.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  }
} catch (err) {
  console.warn('⚠️ Web Push initialization notice:', err.message);
}

export function getVapidPublicKey() {
  return vapidKeys.publicKey || '';
}

/**
 * Send Web Push notification to user's registered devices.
 * Automatically deletes stale subscriptions (HTTP 410 / 404).
 */
export async function sendPushNotification(userId, { title, body, icon, link, type, data = {} }) {
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    return { success: false, reason: 'VAPID keys not configured' };
  }

  try {
    const subscriptions = await PushSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, count: 0, reason: 'No active push subscriptions' };
    }

    const payload = JSON.stringify({
      title: title || 'GymSync',
      body: body || '',
      icon: icon || '/favicon.ico',
      data: {
        link: link || '/notifications',
        url: link || '/notifications',
        type: type || 'system',
        ...data
      }
    });

    let sent = 0;
    const errors = [];

    await Promise.all(
      subscriptions.map(async (subDoc) => {
        const pushSubscription = {
          endpoint: subDoc.endpoint,
          keys: {
            p256dh: subDoc.keys.p256dh,
            auth: subDoc.keys.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (pushErr) {
          // If subscription has expired or is unsubscribed (410 Gone / 404 Not Found), purge it
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await PushSubscription.deleteOne({ _id: subDoc._id });
          } else {
            errors.push(pushErr.message);
          }
        }
      })
    );

    return {
      success: true,
      sent,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (err) {
    console.error('sendPushNotification error:', err.message);
    return { success: false, error: err.message };
  }
}

export default {
  getVapidPublicKey,
  sendPushNotification
};
