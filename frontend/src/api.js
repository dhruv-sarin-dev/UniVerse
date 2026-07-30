const hostname = window.location.hostname;

// Check env var FIRST (set in Vercel/Render dashboard)
let API_URL = import.meta.env.VITE_API_URL || 'https://universe-backend-kh4w.onrender.com';

if (hostname === 'localhost') {
  API_URL = 'http://localhost:8000';
} else if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
  API_URL = `http://${hostname}:8000`;
}

export default API_URL;
