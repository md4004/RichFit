import React, { useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { db, collection, onSnapshot, query, where, addDoc, getDocs, doc, setDoc, OperationType, handleFirestoreError, getDoc, messaging, getToken, onMessage, updateDoc, orderBy, limit } from '@/firebase';

export default function NotificationManager() {
  const { user, profile, isAdmin } = useAuth();

  useEffect(() => {
    if (!user) return;

    // 1. FCM Token Management
    const setupFCM = async () => {
      try {
        if (!messaging) return;
        
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Attempt to get token - note: using a placeholder vapidKey
          // User should replace with real key from Firebase Console
          const currentToken = await getToken(messaging).catch(err => {
            console.warn("FCM Token retrieval failed without VAPID key. Protocol restricted.");
            return null;
          });

          if (currentToken && currentToken !== profile?.fcmToken) {
            console.log("Tactical Update: New FCM Token secured:", currentToken);
            await updateDoc(doc(db, 'users', user.uid), {
              fcmToken: currentToken,
              lastSync: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error("FCM Protocol error:", err);
      }
    };

    // 2. Foreground Message Handler
    let unsubscribeMessaging: () => void = () => {};
    if (messaging) {
      unsubscribeMessaging = onMessage(messaging, (payload) => {
        console.log('Tactical Message Received in Foreground:', payload);
        if (payload.notification) {
          sendBrowserNotification(
            payload.notification.title || "RICHFIT SYSTEM", 
            payload.notification.body || "Priority update received."
          );
        }
      });
    }

    // Creates the notification once (deterministic ID) and pushes a browser
    // notification only the first time, so alerts are never lost or repeated.
    const notifyOnce = async (id: string, title: string, message: string, type: 'warning' | 'critical') => {
      const docRef = doc(db, 'notifications', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) return;
      await setDoc(docRef, {
        userId: user.uid,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString()
      });
      sendBrowserNotification(title, message);
    };

    const daysLeft = (subscriptionEnd: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const subEnd = new Date(subscriptionEnd);
      subEnd.setHours(0, 0, 0, 0);
      return Math.ceil((subEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const WARNING_DAYS = 3;

    const checkSubscriptions = async () => {
      try {
        // 1. Current user's own subscription
        if (profile?.subscriptionEnd && !isAdmin && (profile.status ?? 'active') === 'active') {
          const diffDays = daysLeft(profile.subscriptionEnd);
          if (diffDays <= WARNING_DAYS && diffDays > 0) {
            await notifyOnce(
              `sub_alert_${user.uid}_${profile.subscriptionEnd}`,
              'Subscription Alert',
              `Your subscription expires in ${diffDays} day${diffDays === 1 ? '' : 's'}. Renew now to keep your access.`,
              'warning'
            );
          } else if (diffDays <= 0) {
            await notifyOnce(
              `sub_expired_${user.uid}_${profile.subscriptionEnd}`,
              'Subscription Expired',
              'Your subscription has expired. Renew to restore your access.',
              'critical'
            );
          }
        }

        // 2. Admin: check every active member
        if (isAdmin) {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const members = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

          for (const member of members) {
            if (member.role === 'admin' || member.role === 'coach' || !member.subscriptionEnd) continue;
            if ((member.status ?? 'active') !== 'active') continue;

            const diffDays = daysLeft(member.subscriptionEnd);
            if (diffDays <= WARNING_DAYS && diffDays > 0) {
              await notifyOnce(
                `admin_sub_alert_${member.id}_${member.subscriptionEnd}`,
                'Membership Ending',
                `${member.name}'s subscription ends in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
                'warning'
              );
            } else if (diffDays <= 0) {
              await notifyOnce(
                `admin_sub_expired_${member.id}_${member.subscriptionEnd}`,
                'Membership Expired',
                `${member.name}'s subscription has expired.`,
                'critical'
              );
            }
          }
        }
      } catch (err) {
        console.error('Subscription check failed:', err);
      }
    };

    const sendBrowserNotification = async (title: string, message: string) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification(title, {
              body: message,
              icon: '/icon.png',
              badge: '/icon.png'
            });
          } catch (e) {
            console.error("SW notification failed:", e);
            // Fallback
            new Notification(title, { body: message, icon: '/icon.png' });
          }
        } else {
          new Notification(title, { body: message, icon: '/icon.png' });
        }
      }
    };

    // 4. Firestore Notification Listener (Real-time trigger for UI and Browser Notifications)
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // Subscription alerts are already pushed by notifyOnce; skip them here to avoid duplicates
        if (change.type === 'added' && !/^(admin_)?sub_/.test(change.doc.id)) {
          const data = change.doc.data();
          // Avoid triggering on initial load of historical unread notifications
          const createdTime = new Date(data.createdAt).getTime();
          const now = Date.now();
          if (now - createdTime < 10000) { // Only notify if created in last 10 seconds
            sendBrowserNotification(data.title, data.message);
          }
        }
      });
    });

    // Run checks once on mount
    setupFCM();
    checkSubscriptions();
    
    // Optional: Run every hour if the app stays open
    const interval = setInterval(checkSubscriptions, 1000 * 60 * 60);
    return () => {
      clearInterval(interval);
      unsubscribeMessaging();
      unsubscribeFirestore();
    };
  }, [user, profile, isAdmin]);

  return null;
}
