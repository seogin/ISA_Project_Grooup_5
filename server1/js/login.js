// Logic for login.html
// - Intercepts form submit and login button click
// - Calls placeholder /auth/login endpoint
// - Stores token and redirects to home.html

import { api } from './apiClient.js';
import { setToken, redirectIfAuthenticated } from './auth.js';
import { $, on, onSubmit, setDisabled } from './dom.js';

// If user is already logged in, skip the page
redirectIfAuthenticated('home.html');

const form = $('form');
const emailInput = $('#email');
const passwordInput = $('#password');
const submitBtn = $('#login-btn');

async function handleLogin() {
  setDisabled(submitBtn, true);
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Call placeholder login endpoint
    const res = await api.login(email, password);

    // Expect token in response; adjust to your API shape
    const token = res.token || res.data?.token || 'demo-token';
    setToken(token);

    // Navigate to home on success
    window.location.href = 'home.html';
  } catch (err) {
    alert(err.message || 'Login failed');
  } finally {
    setDisabled(submitBtn, false);
  }
}

// Prevent inline onclick navigation when we handle click
on(submitBtn, 'click', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  handleLogin();
});

// Also handle full form submit (e.g., Enter key)
onSubmit(form, () => handleLogin());
