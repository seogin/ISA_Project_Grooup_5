// Logic for reset-password.html
// - Reads email and code from session storage
// - Calls /auth/password/reset and redirects to home or login

import { api } from './apiClient.js';
import { getSavedEmailForReset, getSavedResetCode, clearResetFlow } from './auth.js';

const resetPwForm = document.getElementById('reset-password-form');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm-password');
const submitBtn = document.getElementById('reset-password-btn');

resetPwForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = getSavedEmailForReset();
  const code = getSavedResetCode();

  if (!email || !code) {
    alert('Missing email or code from previous steps');
    return;
  }

  const password = passwordInput.value;
  const confirm = confirmInput.value;
  if (password !== confirm) {
    alert('Passwords do not match');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  try {
    await api.resetPassword(email, code, password);
    clearResetFlow();
    window.location.href = 'login.html';
  } catch (err) {
    alert(err.message || 'Password reset failed');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
