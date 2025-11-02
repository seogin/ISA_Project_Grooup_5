// Logic for home.html
// - Basic guard: if no token, redirect to login
// - Optionally, fetch profile to verify token (disabled here until backend is ready)

import { requireAuth } from "./auth.js";
import { UI_STRINGS } from "./constants.js";
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

// Shows a dismissible-looking warning banner inside the specified element
function showApiWarning(message) {
  // Avoid duplicating the banner if already present
  var warningDiv = document.getElementById("api-limit-warning");
  if (!warningDiv) {
    warningDiv = document.createElement("div");
    warningDiv.id = "api-limit-warning";
    warningDiv.className = "warning";
    warningDiv.classList.add(
      "bg-amber-300",
      "border-amber-600",
      "text-amber-700",
      "p-4",
      "m-4",
      "rounded"
    );
    warningDiv.textContent = message || UI_STRINGS.API_LIMIT_WARNING;
  }
}

// Example usage (uncomment when your API starts returning a warning flag):
// document.addEventListener('DOMContentLoaded', function () {
//   // if (someApiResult && someApiResult.apiLimitWarning) {
//   //   showApiWarning();
//   // }
// });
