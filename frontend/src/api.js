const hostname = window.location.hostname;

// Deploy dashboards often hand over a bare host with no scheme — render.yaml's
// `property: host` does exactly that. A scheme-less value yields an unusable
// "example.com/api/..." fetch URL and makes `new WebSocket()` throw outright,
// which takes the War Room down with it.
function normalizeApiUrl(url) {
  if (!url) return null;
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Check env var FIRST (set in Vercel/Render dashboard)
let API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL) || 'https://universe-backend-kh4w.onrender.com';

if (hostname === 'localhost' || hostname === '127.0.0.1') {
  API_URL = 'http://localhost:8000';
} else if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
  API_URL = `http://${hostname}:8000`;
}

export default API_URL;
