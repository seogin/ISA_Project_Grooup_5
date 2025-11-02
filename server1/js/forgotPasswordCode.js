// Logic for forgot-password-code.html
// - Collects 6-digit code
// - Calls /auth/password/verify and stores code if valid

import { api } from './apiClient.js';
import { getSavedEmailForReset, saveResetCode } from './auth.js';

const pwRecoveryCodeForm = document.getElementById('pw-recovery-code-form');
const inputs = [
  document.getElementById('code-1'),
  document.getElementById('code-2'),
  document.getElementById('code-3'),
  document.getElementById('code-4'),
  document.getElementById('code-5'),
  document.getElementById('code-6'),
];
const submitBtn = document.getElementById('check-pw-reset-code-btn');

// Move focus to next input automatically
inputs.forEach((input, idx) => {
  if (!input) return;
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 1);
    if (input.value && idx < inputs.length - 1) inputs[idx + 1]?.focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1]?.focus();
  });
});

pwRecoveryCodeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = getSavedEmailForReset();
  if (!email) {
    alert('Missing email from previous step');
    return;
  }

  const code = inputs.map((i) => (i ? i.value : '')).join('');
  if (code.length !== 6) {
    alert('Please enter the 6-digit code');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  try {
    await api.verifyResetCode(email, code);
    saveResetCode(code);
    window.location.href = 'reset-password.html';
  } catch (err) {
    alert(err.message || 'Invalid code');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
