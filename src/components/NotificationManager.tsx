import { useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { db, doc, messaging, getToken, onMessage, updateDoc, VAPID_KEY } from '@/firebase';

// Membership and stock notifications are created and pushed by the daily server job
// (notifications.ts). This component only registers the device for push and shows
// pushes that arrive while the app is open.
export default function NotificationManager() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !messaging) return;

    const registerDevice = async () => {
      try {
        if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return;
        const permission = Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          // Own scope so it doesn't replace the app's main service worker (sw.js)
          scope: '/firebase-cloud-messaging-push-scope',
        });
        const token = await getToken(messaging!, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
        if (token && token !== profile?.fcmToken) {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: token, lastSync: new Date().toISOString() });
        }
      } catch (err) {
        console.error('Push registration failed:', err);
      }
    };

    // Pushes received while the app is open in the foreground
    const unsubscribe = onMessage(messaging, async (payload) => {
      const data = payload.data || {};
      if (Notification.permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(data.title || 'RichFit', {
        body: data.body || '',
        icon: '/icon.png',
        badge: '/icon.png',
        data: { url: data.url || '/' },
      });
    });

    registerDevice();
    return () => unsubscribe();
  }, [user, profile?.fcmToken]);

  return null;
}
