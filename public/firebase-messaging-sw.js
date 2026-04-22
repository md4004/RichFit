importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Tactical Firebase Configuration
firebase.initializeApp({
  apiKey: "AIzaSyAveixeZokoakClMBV6CJPoa3d3V5201wE",
  authDomain: "gen-lang-client-0430129528.firebaseapp.com",
  projectId: "gen-lang-client-0430129528",
  storageBucket: "gen-lang-client-0430129528.firebasestorage.app",
  messagingSenderId: "236411176275",
  appId: "1:236411176275:web:485cf91df970e6e433cda6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Tactical Message Detected in Background:', payload);
  
  const notificationTitle = payload.notification?.title || 'RICHFIT Priority Update';
  const notificationOptions = {
    body: payload.notification?.body || 'New protocol briefing received.',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
