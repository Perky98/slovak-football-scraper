// Firebase Messaging service worker
// Handles background push notifications (FCM)
// Config is sent from the main app via postMessage after registration

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

let messaging = null;

self.addEventListener("message", (event) => {
  if (event.data?.type !== "FIREBASE_MESSAGING_CONFIG") return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
    }
    messaging = firebase.messaging();
  } catch (e) {
    console.warn("[FCM SW] init failed", e);
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title ?? "Slovak Football AI";
    const body = data.notification?.body ?? "Nová správa";
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: "sfa-notification",
        renotify: true,
      })
    );
  } catch {}
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow("/");
    })
  );
});
