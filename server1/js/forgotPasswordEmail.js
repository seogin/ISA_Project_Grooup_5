// Logic for forgot-password-email.html
// - Captures email and calls /auth/password/request
// - Stores email in session storage and navigates to code page

import { api } from './apiClient.js';
import { saveEmailForReset } from './auth.js';
import { $, onSubmit, setDisabled } from './dom.js';

const form = $('form');
const emailInput = $('#email');
const submitBtn = $('#send-pw-reset-code-btn');

onSubmit(form, async () => {
  const email = emailInput.value.trim();
  if (!email) {
    alert('Please enter your email');
    return;
  }

  setDisabled(submitBtn, true);
  try {
    await api.requestPasswordReset(email);
    saveEmailForReset(email);
    window.location.href = 'forgot-password-code.html';
  } catch (err) {
    alert(err.message || 'Failed to send reset code');
  } finally {
    setDisabled(submitBtn, false);
  }
});
