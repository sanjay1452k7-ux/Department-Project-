import { api } from './api.js';

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export async function getSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Ask for permission, subscribe with the server's VAPID key and register the
 * subscription. Throws a human-readable message on every failure path so the
 * settings screen can just show it.
 */
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support push notifications');

  const { key, enabled } = await api.get('/notifications/vapid-public-key');
  if (!enabled || !key) {
    throw new Error('Push is not configured on the server yet — ask an admin to set the VAPID keys');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted');

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));

  await api.post('/notifications/subscribe', subscription.toJSON());
  return subscription;
}

export async function disablePush() {
  const subscription = await getSubscription();
  if (!subscription) return;
  await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
}
