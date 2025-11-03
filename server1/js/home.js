// Logic for home.html
// - Basic guard: if no token, redirect to login
// - Fetch profile to verify token and check API limits

import { requireAuth } from "./auth.js";
import { api, showApiLimitWarning, hideApiLimitWarning } from './apiClient.js';

requireAuth("login.html");

// Check user status and API limits on page load
document.addEventListener('DOMContentLoaded', async function () {
  try {
    const currentUser = await api.currentUser();
    if (currentUser.success && currentUser.user && currentUser.user.apiLimitExceeded) {
      showApiLimitWarning();
    } else {
      hideApiLimitWarning();
    }
  } catch (err) {
    console.warn('Failed to fetch user info:', err);
    // Don't redirect on error, just log it
  }
});

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



// Example usage (uncomment when your API starts returning a warning flag):
// document.addEventListener('DOMContentLoaded', function () {
//   // if (someApiResult && someApiResult.apiLimitWarning) {
//   //   showApiWarning();
//   // }
// });
