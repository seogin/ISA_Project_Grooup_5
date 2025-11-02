// Logic for home.html
// - Basic guard: if no token, redirect to login
// - Optionally, fetch profile to verify token (disabled here until backend is ready)

import { requireAuth } from "./auth.js";
// import { api } from './apiClient.js';

requireAuth("login.html");

// Example profile fetch once backend is ready:
// (async () => {
//   try {
//     const currentUser = await api.currentUser();
//     console.log('Current user:', currentUser);
//   } catch (err) {
//     console.warn('Token not valid, redirecting to login');
//     window.location.href = 'login.html';
//   }
// })();
