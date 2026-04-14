/**
 * Returns the correct WebSocket base URL.
 * In production, uses VITE_WS_URL or derives it from VITE_API_URL.
 * In development, uses the current window host (Vite proxy handles it).
 */
export function getWsBase() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}
