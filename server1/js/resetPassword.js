// Logic for reset-password.html
// - Reads email and code from session storage
// - Calls /auth/password/reset and redirects to home or login

import { api } from './apiClient.js';
import { getSavedEmailForReset, getSavedResetCode, clearResetFlow } from './auth.js';
import { $, onSubmit, setDisabled } from './dom.js';

const form = $('form');
const passwordInput = $('#password');
const confirmInput = $('#confirm-password');
const submitBtn = $('#reset-password-btn');

onSubmit(form, async () => {
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

  setDisabled(submitBtn, true);
  try {
    await api.resetPassword(email, code, password);
    clearResetFlow();
    window.location.href = 'login.html';
  } catch (err) {
    alert(err.message || 'Password reset failed');
  } finally {
    setDisabled(submitBtn, false);
  }
});
