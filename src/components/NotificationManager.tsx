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

    const checkSubscriptions = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Check current user's subscription
      if (profile?.subscriptionEnd) {
        const subEnd = new Date(profile.subscriptionEnd);
        subEnd.setHours(0, 0, 0, 0);
        const diffTime = subEnd.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const notificationId = `sub_alert_${user.uid}_${profile.subscriptionEnd}`;
        
        if (diffDays === 1) {
          // 1 day before
          const docRef = doc(db, 'notifications', notificationId);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            await setDoc(docRef, {
              userId: user.uid,
              title: 'Subscription Alert',
              message: 'Your tactical access expires in 24 hours. Renew now to maintain protocol continuity.',
              type: 'warning',
              read: false,
              createdAt: new Date().toISOString()
            });
          }
          sendBrowserNotification('Subscription Alert', 'Your tactical access expires in 24 hours. Renew now.');
        } else if (diffDays <= 0) {
          // Expired
          const expiredId = `sub_expired_${user.uid}_${profile.subscriptionEnd}`;
          const docRef = doc(db, 'notifications', expiredId);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            await setDoc(docRef, {
              userId: user.uid,
              title: 'Access Terminated',
              message: 'Your subscription has expired. Access to advanced protocols is now restricted.',
              type: 'critical',
              read: false,
              createdAt: new Date().toISOString()
            });
          }
          sendBrowserNotification('Access Terminated', 'Your subscription has expired. Access restricted.');
        }
      }

      // 2. If admin, check all users
      if (isAdmin) {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const members = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        for (const member of members) {
          if (member.role === 'admin' || !member.subscriptionEnd) continue;

          const subEnd = new Date(member.subscriptionEnd);
          subEnd.setHours(0, 0, 0, 0);
          const diffTime = subEnd.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 3 && diffDays > 0) {
            // Nearing end (3 days or less)
            const adminNotificationId = `admin_sub_alert_${member.id}_${member.subscriptionEnd}`;
            const docRef = doc(db, 'notifications', adminNotificationId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
              await setDoc(docRef, {
                userId: user.uid, // Admin's ID
                title: 'Personnel Alert',
                message: `Member ${member.name}'s subscription is ending in ${diffDays} days.`,
                type: 'warning',
                read: false,
                createdAt: new Date().toISOString()
              });
            }
            sendBrowserNotification('Personnel Alert', `${member.name}'s subscription is ending in ${diffDays} days.`);
          } else if (diffDays <= 0) {
            // Expired
            const adminExpiredId = `admin_sub_expired_${member.id}_${member.subscriptionEnd}`;
            const docRef = doc(db, 'notifications', adminExpiredId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
              await setDoc(docRef, {
                userId: user.uid, // Admin's ID
                title: 'Personnel Expired',
                message: `Member ${member.name}'s subscription has expired.`,
                type: 'critical',
                read: false,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
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

    // 3. User-specific event triggers (Simple examples)
    const checkEventTriggers = () => {
      const lastCheck = localStorage.getItem('last_notif_check');
      const now = Date.now();
      
      // Check once every 4 hours for sample events to avoid spamming
      if (!lastCheck || now - parseInt(lastCheck) > 1000 * 60 * 60 * 4) {
        const hour = new Date().getHours();
        
        // Workout reminder (8 AM or 5 PM)
        if (hour === 8 || hour === 17) {
          sendBrowserNotification(
            "Time to hit the iron, Michel!", 
            "Your tactical workout protocol starts now. Gear up."
          );
        }

        // Random "Stock" alert sample
        if (Math.random() < 0.1) {
          sendBrowserNotification(
            "Stock Alert: Inventory Restock",
            "Your favorite protein shake is back in stock at the HQ."
          );
        }

        localStorage.setItem('last_notif_check', now.toString());
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
        if (change.type === 'added') {
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
    checkEventTriggers();
    
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
