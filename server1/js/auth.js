// Auth token management and simple guards

const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'auth_email'; // Used through the password reset flow
const RESET_CODE_KEY = 'auth_reset_code';

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function saveEmailForReset(email) {
  sessionStorage.setItem(EMAIL_KEY, email);
}

export function getSavedEmailForReset() {
  return sessionStorage.getItem(EMAIL_KEY);
}

export function saveResetCode(code) {
  sessionStorage.setItem(RESET_CODE_KEY, code);
}

export function getSavedResetCode() {
  return sessionStorage.getItem(RESET_CODE_KEY);
}

export function clearResetFlow() {
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(RESET_CODE_KEY);
}

// Redirect to login if not authenticated
export function requireAuth(redirectTo = 'login.html') {
  if (!isAuthenticated()) {
    window.location.href = redirectTo;
  }
}

// If user already logged in, navigate to home
export function redirectIfAuthenticated(target = 'home.html') {
  if (isAuthenticated()) {
    window.location.href = target;
  }
}
