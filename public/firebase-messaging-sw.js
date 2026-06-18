// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Obtener parámetros de configuración desde la URL de registro
const params = new URLSearchParams(location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

// Inicializar Firebase si los parámetros básicos están presentes
if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);
    
    const notificationTitle = payload.data?.title || payload.notification?.title || "Área Mecánica INACAP";
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || "",
      icon: '/next.svg',
      badge: '/next.svg',
      data: {
        url: payload.data?.url || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase no inicializado: faltan parámetros de configuración.');
}

// Escuchar clics en la notificación para redirigir al usuario a la URL de acción
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana con la misma URL, enfocarla
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // De lo contrario, abrir una pestaña nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
