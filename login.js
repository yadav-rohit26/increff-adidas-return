/**
 * Hardcoded Credentials for Prototype/Internal Access.
 * Note: In Production, this must be an API call to a backend.
 */
const AUTH_CONFIG = { user: "admin@increff", pass: "increff@2026" };

const loginBtn       = document.getElementById('login-btn');
const togglePassword = document.getElementById('toggle-password');
const passwordField  = document.getElementById('login-pass');
const eyeIcon        = document.getElementById('eye-icon');

/**
 * Handle Password Visibility Toggle
 */
if(togglePassword) {
    togglePassword.addEventListener('click', () => {
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);
        // Switch Eye/Eye-Slash icons
        eyeIcon.classList.toggle('fa-eye');
        eyeIcon.classList.toggle('fa-eye-slash');
    });
}

/**
 * Login Handler Logic
 */
if(loginBtn) {
    loginBtn.addEventListener('click', () => {
        const u = document.getElementById('login-user').value.trim();
        const p = passwordField.value.trim();

        // Basic Check
        if (u === AUTH_CONFIG.user && p === AUTH_CONFIG.pass) {
            localStorage.setItem('isLoggedIn', 'true'); // Create session
            window.location.href = 'upload.html';       // Navigate to app
        } else {
            const error = document.getElementById('login-error');
            error.classList.remove('d-none');
            // Feedback: Change button color briefly
            loginBtn.classList.replace('btn-primary', 'btn-danger');
            setTimeout(() => {
                loginBtn.classList.replace('btn-danger', 'btn-primary');
                error.classList.add('d-none');
            }, 2000);
        }
    });
}