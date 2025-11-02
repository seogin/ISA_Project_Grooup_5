// Logic for forgot-password-code.html
// - Collects 6-digit code
// - Calls /auth/password/verify and stores code if valid

import { api } from './apiClient.js';
import { getSavedEmailForReset, saveResetCode } from './auth.js';
import { $, $$, on, onSubmit, setDisabled } from './dom.js';

const form = $('form');
const inputs = $$('#code-1, #code-2, #code-3, #code-4, #code-5, #code-6');
const submitBtn = $('#check-pw-reset-code-btn');

// UX: move focus to next input automatically
inputs.forEach((input, idx) => {
  on(input, 'input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 1);
    if (input.value && idx < inputs.length - 1) inputs[idx + 1].focus();
  });
  on(input, 'keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
  });
});

onSubmit(form, async () => {
  const email = getSavedEmailForReset();
  if (!email) {
    alert('Missing email from previous step');
    return;
  }

  const code = inputs.map((i) => i.value).join('');
  if (code.length !== 6) {
    alert('Please enter the 6-digit code');
    return;
  }

  setDisabled(submitBtn, true);
  try {
    await api.verifyResetCode(email, code);
    saveResetCode(code);
    window.location.href = 'reset-password.html';
  } catch (err) {
    alert(err.message || 'Invalid code');
  } finally {
    setDisabled(submitBtn, false);
  }
});
