import { createClient } from '@supabase/supabase-js';
import { notifyError } from './toastBridge';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
export const API_BASE_URL = (env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
let supabaseClientPromise = null;
let refreshAccessTokenPromise = null;
let proactiveRefreshTimer = null;

// Single source of truth for what counts as a real role. Backends can and
// do occasionally send garbage into this field (the literal string "null",
// "undefined", empty/whitespace, stray casing, etc.) — every one of those
// is truthy in JS, so `payload?.user_type || fallback` silently treats them
// as valid. Anything read into user_type anywhere in the app should be
// funneled through this first so bad values collapse to '' (unknown/guest)
// instead of leaking through as visible text or breaking role-keyed lookups.
const VALID_USER_TYPES = ['creator', 'clipper', 'brand', 'admin'];

export function normalizeUserType(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return VALID_USER_TYPES.includes(v) ? v : '';
}

function getStoredAccessToken() {
  return localStorage.getItem('access_token') || localStorage.getItem('access') || '';
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = typeof window !== 'undefined' && window.atob
      ? window.atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// NEW: recover the email from the JWT itself as a fallback when the
// stored `user` object (localStorage) is missing or incomplete.
export function getEmailFromAccessToken() {
  const token = getStoredAccessToken();
  const payload = decodeJwtPayload(token);
  return payload?.email || payload?.sub || null;
}

function clearProactiveRefreshTimer() {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

export function scheduleTokenRefresh() {
  clearProactiveRefreshTimer();

  if (typeof window === 'undefined') return;

  const token = getStoredAccessToken();
  if (!token) return;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return;

  const expiresAt = payload.exp * 1000;
  const refreshAheadMs = 60 * 1000;
  const delay = Math.max(0, expiresAt - Date.now() - refreshAheadMs);

  if (delay <= 0) {
    refreshAccessToken().catch(() => {});
    return;
  }

  proactiveRefreshTimer = setTimeout(async () => {
    try {
      await refreshAccessToken();
      scheduleTokenRefresh();
    } catch (err) {
      if (err?.isNetworkError) {
        // Offline — retry shortly instead of logging the user out or
        // hammering the network in a tight loop.
        proactiveRefreshTimer = setTimeout(() => scheduleTokenRefresh(), 5000);
      } else {
        clearAuthStorage();
      }
    }
  }, delay);
}

function readStoredRefreshToken() {
  return localStorage.getItem('refresh_token') || localStorage.getItem('refresh') || '';
}

async function refreshAccessToken() {
  if (refreshAccessTokenPromise) {
    return refreshAccessTokenPromise;
  }

  refreshAccessTokenPromise = (async () => {
    const refreshToken = readStoredRefreshToken();
    if (!refreshToken) {
      clearAuthStorage();
      throw new Error('Your session has expired. Please sign in again.');
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch {
      // fetch() itself threw — offline / DNS failure / server unreachable.
      // This says NOTHING about whether the refresh token is valid, so
      // don't touch localStorage here.
      const err = new Error('Network error while refreshing session.');
      err.isNetworkError = true;
      throw err;
    }

    if (!response.ok) {
      // A real response came back saying the token is bad — this IS a
      // genuine auth failure.
      clearAuthStorage();
      throw new Error('Your session has expired. Please sign in again.');
    }

    const data = await response.json().catch(() => ({}));
    if (data?.access) {
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('access', data.access);
      if (data?.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('refresh', data.refresh);
      }
      scheduleTokenRefresh();
      return data.access;
    }

    clearAuthStorage();
    throw new Error('Your session has expired. Please sign in again.');
  })();

  try {
    return await refreshAccessTokenPromise;
  } finally {
    refreshAccessTokenPromise = null;
  }
}

export function getDashboardPath(role, fallback = '/dashboard') {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return '/admin/dashboard';
    case 'brand':
      return '/brand/dashboard';
    case 'creator':
      return '/creator/dashboard';
    case 'clipper':
      return '/clipper/dashboard';
    default:
      return fallback;
  }
}

export function getStoredUserType() {
  return normalizeUserType(localStorage.getItem('user_type'));
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Sign-In is only available in the browser.'));
      return;
    }

    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Sign-In failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Sign-In failed to load.'));
    document.head.appendChild(script);
  });
}

function createLocalTestAccessToken(email, type = 'creator') {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ email, sub: email, name: email, type }));
  return `${header}.${payload}.signature`;
}

async function loadSupabaseConfig() {
  const envUrl = env.VITE_SUPABASE_URL;
  const envAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envAnonKey) {
    return { url: envUrl, anonKey: envAnonKey };
  }

  try {
    const config = await api('/api/auth/public-config/');
    return {
      url: config?.VITE_SUPABASE_URL || envUrl || null,
      anonKey: config?.VITE_SUPABASE_ANON_KEY || envAnonKey || null,
    };
  } catch {
    return { url: null, anonKey: null };
  }
}

export async function getSupabaseClient() {
  if (supabaseClientPromise) {
    return supabaseClientPromise;
  }

  supabaseClientPromise = (async () => {
    const { url, anonKey } = await loadSupabaseConfig();
    if (!url || !anonKey) {
      return null;
    }

    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  })();

  return supabaseClientPromise;
}

export async function loginWithGoogle(type = null, next = '/dashboard') {
  const clientId = env.VITE_GOOGLE_CLIENT_ID;
  const supabaseClient = await getSupabaseClient();
  const normalizedType = normalizeUserType(type) || null;

  if (supabaseClient) {
    const redirectUrl = env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`;
    const redirectTo = new URL(redirectUrl);
    if (normalizedType) redirectTo.searchParams.set('type', normalizedType);
    redirectTo.searchParams.set('next', next);

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      throw error;
    }

    if (data?.url) {
      window.location.assign(data.url);
      return { pending: true };
    }
  }

  if (!clientId) {
    const email = typeof window !== 'undefined' ? window.prompt('Enter an email for local OAuth testing', 'test@example.com') : '';
    if (!email) {
      throw new Error('Email is required for local OAuth testing.');
    }

    const accessToken = createLocalTestAccessToken(email, normalizedType || 'creator');
    const payload = await api('/api/auth/google/', {
      method: 'POST',
      body: {
        id_token: accessToken,
        provider: 'google',
        ...(normalizedType ? { type: normalizedType } : {}),
      },
    });

    setAuthStorage(payload);
    return payload;
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.id;
      client.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response.credential) {
            reject(new Error('Google sign-in was cancelled.'));
            return;
          }

          try {
            const payload = await api('/api/auth/google/', {
              method: 'POST',
              body: {
                id_token: response.credential,
                provider: 'google',
                ...(normalizedType ? { type: normalizedType } : {}),
              },
            });

            setAuthStorage(payload);
            resolve(payload);
          } catch (error) {
            reject(error);
          }
        },
      });

      client.prompt();
    } catch (error) {
      reject(error);
    }
  });
}

export async function finishGoogleAuth(type = null) {
  const supabaseClient = await getSupabaseClient();
  if (!supabaseClient) {
    throw new Error('Supabase auth is not configured.');
  }

  const normalizedType = normalizeUserType(type) || null;

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    throw error;
  }

  let accessToken = data?.session?.access_token;
  if (!accessToken) {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const tokenFromHash = params.get('access_token');

    if (tokenFromHash) {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
        access_token: tokenFromHash,
        refresh_token: params.get('refresh_token') || '',
      });

      if (sessionError) {
        throw sessionError;
      }

      accessToken = sessionData?.session?.access_token;
    }
  }

  if (!accessToken) {
    throw new Error('Google sign-in session was not found.');
  }

  return api('/api/auth/google/', {
    method: 'POST',
    body: {
      access_token: accessToken,
      provider: 'google',
      ...(normalizedType ? { type: normalizedType } : {}),
    },
  });
}

function formatErrorMessage(data) {
  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') {
      return data.detail;
    }

    if (typeof data.error === 'string') {
      return data.error;
    }

    if (typeof data.message === 'string') {
      return data.message;
    }

    const entries = Object.entries(data).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => {
          if (typeof item === 'string') {
            return `${key}: ${item}`;
          }

          if (item && typeof item === 'object' && typeof item.message === 'string') {
            return `${key}: ${item.message}`;
          }

          return `${key}: ${JSON.stringify(item)}`;
        });
      }

      if (typeof value === 'string') {
        return [`${key}: ${value}`];
      }

      if (value && typeof value === 'object' && typeof value.message === 'string') {
        return [`${key}: ${value.message}`];
      }

      return [`${key}: ${JSON.stringify(value)}`];
    });

    if (entries.length) {
      return entries.join(' ');
    }
  }

  return 'Request failed';
}

function humanizeDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function buildFriendlyErrorMessage(response, data) {
  if (response.status === 429) {
    const headerSeconds = Number(response.headers.get('Retry-After'));
    const rawText = typeof data === 'string' ? data : data?.detail || '';
    const bodyMatch = String(rawText).match(/available in\s+(\d+(?:\.\d+)?)\s+seconds/i);
    const bodySeconds = bodyMatch ? Number(bodyMatch[1]) : null;
    const seconds = headerSeconds || bodySeconds;

    return seconds
      ? `You're doing that a bit too fast. Try again in about ${humanizeDuration(seconds)}.`
      : "You're doing that a bit too fast. Please wait a moment and try again.";
  }

  if (response.status >= 500) {
    return 'Something went wrong on our end. Please try again in a moment.';
  }

  return formatErrorMessage(data);
}

// `silent` defaults to true: this call will NOT auto-toast on failure.
// Pages that render their own error UI (via useApiResource + ErrorState,
// or their own try/catch) should leave this alone. Set `silent: false` on
// calls where a toast is the only feedback needed — background/fire-and-
// forget actions like "like a post", "join a campaign", etc.
export async function api(path, { method = 'GET', body, headers = {}, silent = true, ...options } = {}, retryCount = 0) {
  const token = getStoredAccessToken();
  try {
    // avoid printing the token itself in logs
    console.debug('[api] request', { path, method, hasToken: Boolean(token) });
  } catch (err) {
    // swallow logging errors
  }
  const isPublicAuthEndpoint = path === '/api/auth/google/' || path === '/api/auth/google' || path === '/api/auth/login/' || path === '/api/auth/login' || path === '/api/auth/public-config/' || path === '/api/auth/public-config' || path === '/api/token/' || path === '/api/token/refresh/' || path === '/api/token/verify/';
  const isFormData = body instanceof FormData;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token && !isPublicAuthEndpoint ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      ...options,
    });
  } catch (fetchErr) {
    // fetch() itself threw — this is ALWAYS a network-level failure
    // (offline, DNS failure, server unreachable, CORS, etc.), never an
    // auth failure. There is no server response here to say anything
    // about the token's validity, so this must never be marked as a 401
    // or treated as "session expired" — that would force a bogus logout
    // every time the user's connection drops.
    const message = 'You appear to be offline. Please check your connection and try again.';
    const err = new Error(message);
    err.isNetworkError = true;
    if (!silent) notifyError(message);
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok && response.status === 401 && retryCount === 0 && !isPublicAuthEndpoint) {
    try {
      const refreshedAccessToken = await refreshAccessToken();
      const updatedToken = refreshedAccessToken || getStoredAccessToken();
      const nextHeaders = {
        ...headers,
        ...(updatedToken ? { Authorization: `Bearer ${updatedToken}` } : {}),
      };
      return api(path, { method, body, headers: nextHeaders, silent, ...options }, 1);
    } catch (refreshErr) {
      // Same distinction applies here: if refreshAccessToken() failed
      // because we're offline (isNetworkError), that's not proof the
      // session is invalid — don't force a logout for it. Only a genuine
      // server-confirmed refresh rejection should read as "session expired."
      const message = refreshErr?.isNetworkError
        ? 'You appear to be offline. Please check your connection and try again.'
        : 'Your session has expired. Please sign in again.';
      const err = new Error(message);
      err.isNetworkError = Boolean(refreshErr?.isNetworkError);
      if (!err.isNetworkError) err.status = 401;
      if (!silent) notifyError(message);
      throw err;
    }
  }

  if (!response.ok) {
    try {
      console.debug('[api] response error', { path, status: response.status });
    } catch (e) {}

    const message = buildFriendlyErrorMessage(response, data);
    const err = new Error(message);
    err.status = response.status;

    if (!silent && !isPublicAuthEndpoint) {
      notifyError(message);
    }

    throw err;
  }

  return data;
}

export function setAuthStorage(payload) {
  if (payload?.access) {
    localStorage.setItem('access_token', payload.access);
    localStorage.setItem('access', payload.access);
  }
  if (payload?.refresh) {
    localStorage.setItem('refresh_token', payload.refresh);
    localStorage.setItem('refresh', payload.refresh);
  }
  if (payload?.user) localStorage.setItem('user', JSON.stringify(payload.user));

  // Guard against bad backend values (the literal string "null"/"undefined",
  // wrong casing, stray whitespace, etc.) — normalize before ever writing
  // user_type to storage, so nothing downstream has to re-check this.
  const userType = normalizeUserType(payload?.user_type || payload?.user?.user_type);
  if (userType) {
    localStorage.setItem('user_type', userType);
  } else {
    // Don't leave a stale/bad value sitting in storage if this login
    // genuinely has no valid role yet (e.g. pre-role-selection signup).
    localStorage.removeItem('user_type');
  }

  scheduleTokenRefresh();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-changed'));
}

export function clearAuthStorage() {
  clearProactiveRefreshTimer();
  ['access_token', 'access', 'refresh_token', 'refresh', 'user', 'user_type'].forEach((key) => {
    localStorage.removeItem(key);
  });
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-changed'));
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => scheduleTokenRefresh());
  scheduleTokenRefresh();
}