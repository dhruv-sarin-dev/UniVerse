const hostname = window.location.hostname;

// Check env var FIRST (set in Vercel/Render dashboard)
let API_URL = import.meta.env.VITE_API_URL || 'https://universe-backend-kh4w.onrender.com';

if (hostname === 'localhost') {
  API_URL = 'http://localhost:8000';
} else if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
  API_URL = `http://${hostname}:8000`;
}

export default API_URL;

/**
 * GET JSON from the API, retrying on failure.
 *
 * Render's free tier spins the backend down when idle, and the request that
 * wakes it can take 30s or longer — or fail outright. Callers that swallowed
 * that failure showed a permanently empty page with no error and no way to
 * retry, which is why navigating away and back "fixed" it: the second visit
 * hit an already-warm server.
 *
 * Throws the last error if every attempt fails, so callers can show a real
 * message instead of an empty state that looks like "there is no data".
 */
export async function fetchJson(path, { retries = 2, timeoutMs = 20000, ...init } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      await new Promise(r => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
  throw lastError;
}
