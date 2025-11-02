// Logic for signup.html
// - Intercepts form submit
// - Calls placeholder /auth/signup endpoint
// - Stores token and redirects to home.html

import { api } from './apiClient.js';
import { setToken, redirectIfAuthenticated } from './auth.js';
import { $, onSubmit, setDisabled } from './dom.js';

redirectIfAuthenticated('home.html');

const form = $('form');
const emailInput = $('#email');
const passwordInput = $('#password');
const confirmInput = $('#confirm-password');
const submitBtn = $('#signup-btn');

onSubmit(form, async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  if (password !== confirm) {
    alert('Passwords do not match');
    return;
  }

  setDisabled(submitBtn, true);
  try {
    const res = await api.signup(email, password);
    const token = res.token || res.data?.token || 'demo-token';
    setToken(token);
    window.location.href = 'home.html';
  } catch (err) {
    alert(err.message || 'Signup failed');
  } finally {
    setDisabled(submitBtn, false);
  }
});
