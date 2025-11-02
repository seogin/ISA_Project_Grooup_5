// Uses fetch with JSON, attaches token if present

import { BACKEND_SERVER_URL } from './constants.js';
import { getToken } from './auth.js';

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`; // Attach JWT if available
  }

  const res = await fetch(`${BACKEND_SERVER_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Attempt JSON; if it fails, create a uniform error
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = { success: res.ok };
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// Temporary endpoints in one place for easy use
export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  signup: (email, password) =>
    request('/auth/signup', { method: 'POST', body: { email, password } }),

  me: () => request('/auth/me', { method: 'GET', auth: true }),

  requestPasswordReset: (email) =>
    request('/auth/password/request', { method: 'POST', body: { email } }),

  verifyResetCode: (email, code) =>
    request('/auth/password/verify', { method: 'POST', body: { email, code } }),

  resetPassword: (email, code, password) =>
    request('/auth/password/reset', { method: 'POST', body: { email, code, password } }),
};
