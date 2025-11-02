// Logic for forgot-password-email.html
// - Captures email and calls /auth/password/request
// - Stores email in session storage and navigates to code page

import { api } from './apiClient.js';
import { saveEmailForReset } from './auth.js';

const pwRecoveryEmailForm = document.getElementById('pw-recovery-email-form');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('send-pw-reset-code-btn');

pwRecoveryEmailForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email) {
    alert('Please enter your email');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  try {
    await api.requestPasswordReset(email);
    saveEmailForReset(email);
    window.location.href = 'forgot-password-code.html';
  } catch (err) {
    alert(err.message || 'Failed to send reset code');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
