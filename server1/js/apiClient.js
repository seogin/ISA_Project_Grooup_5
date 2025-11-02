// Uses fetch with JSON, attaches token if present

import { BACKEND_SERVER_URL } from "./constants.js";
import { getToken, clearToken } from "./auth.js";

async function makeRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`; // Attach JWT if available
  }

  const respond = await fetch(`${BACKEND_SERVER_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (respond.status === 401 && auth) {
    clearToken();
    window.location.href = "login.html";
    return;
  }

  // Attempt JSON; if it fails, create a uniform error
  let data;
  try {
    data = await respond.json();
  } catch (_) {
    data = { success: respond.ok };
  }

  if (!respond.ok) {
    const message = data?.message || `Request failed (${respond.status})`;
    throw new Error(message);
  }

  return data;
}

// Temporary endpoints in one place for easy use
export const api = {
  login: (email, password) =>
    makeRequest("/auth/login", { method: "POST", body: { email, password } }),

  signup: (email, password) =>
    makeRequest("/auth/signup", { method: "POST", body: { email, password } }),

  currentUser: () => makeRequest("/auth/me", { method: "GET", auth: true }),

  requestPasswordReset: (email) =>
    makeRequest("/auth/password/request", { method: "POST", body: { email } }),

  verifyResetCode: (email, code) =>
    makeRequest("/auth/password/verify", {
      method: "POST",
      body: { email, code },
    }),

  resetPassword: (email, code, password) =>
    makeRequest("/auth/password/reset", {
      method: "POST",
      body: { email, code, password },
    }),
};
