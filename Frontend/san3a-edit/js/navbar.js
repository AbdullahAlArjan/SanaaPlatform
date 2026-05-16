/**
 * navbar.js — Self-contained auth-aware navbar updater for Sanaa Platform
 *
 * Intentionally has ZERO imports. Reads localStorage directly so it
 * cannot fail due to a broken module import chain.
 *
 * Load as a plain script (NOT type="module") on every public page:
 *   <script src="js/navbar.js"></script>
 *
 * Required IDs in each page's <header>:
 *
 *   Guest state (shown when NOT logged in):
 *     #authButtons    — wrapper div for Login + Register buttons
 *     #loginBtn       — Login button
 *     #registerBtn    — Register button
 *
 *   User state (shown when logged in):
 *     #userProfile    — wrapper div for avatar + dropdown
 *     #userAvatar     — <img> for the user's avatar
 *     #navProfileLink — <a> link to the user's dashboard
 *     #logoutBtn      — <a> or <button> that triggers logout
 */

(function () {
    // ── Read auth state directly from localStorage ────────────────────────────
    function _getToken()  { return localStorage.getItem('accessToken'); }
    function _getUser()   {
        try { return JSON.parse(localStorage.getItem('currentUser')); }
        catch { return null; }
    }
    function _isLoggedIn() { return Boolean(_getToken() && _getUser()); }

    // ── Logout: clear storage and go to login page ────────────────────────────
    function _logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'Login.html';
    }

    // ── Navigate to the right dashboard based on stored role ─────────────────
    function _goToDashboard(role) {
        var r = (role || '').toLowerCase().trim();
        if      (r === 'admin')      window.location.href = 'Admin.html';
        else if (r === 'freelancer') window.location.href = 'freelancer.html';
        else                         window.location.href = 'customer.html';
    }

    // ── Main function ─────────────────────────────────────────────────────────
    function updateNavbarAuthUI() {
        var loggedIn = _isLoggedIn();
        var user     = loggedIn ? _getUser() : null;

        // Toggle guest ↔ user sections
        var authButtons = document.getElementById('authButtons');
        var userProfile = document.getElementById('userProfile');
        if (authButtons) authButtons.style.display = loggedIn ? 'none' : '';
        if (userProfile) userProfile.style.display  = loggedIn ? 'flex' : 'none';

        if (loggedIn && user) {
            // Personalise avatar
            var avatar = document.getElementById('userAvatar');
            if (avatar) {
                avatar.src = 'https://ui-avatars.com/api/?name='
                    + encodeURIComponent(user.fullName || 'User')
                    + '&background=3498db&color=fff';
                avatar.alt = user.fullName || 'User';
            }

            // Wire dashboard link
            var profileLink = document.getElementById('navProfileLink');
            if (profileLink) {
                profileLink.textContent = 'لوحة التحكم (' + (user.fullName || 'User') + ')';
                profileLink.href = '#';
                profileLink.onclick = function (e) {
                    e.preventDefault();
                    _goToDashboard(user.role);
                };
            }

            // Wire logout
            var logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.onclick = function (e) {
                    e.preventDefault();
                    _logout();
                };
            }
        } else {
            // Wire login / register buttons
            var loginBtn    = document.getElementById('loginBtn');
            var registerBtn = document.getElementById('registerBtn');
            if (loginBtn)    loginBtn.onclick    = function () { window.location.href = 'Login.html'; };
            if (registerBtn) registerBtn.onclick = function () { window.location.href = 'Register.html'; };
        }
    }

    // Run as soon as the DOM is ready (works whether script is in head or body)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateNavbarAuthUI);
    } else {
        updateNavbarAuthUI();
    }

    // Expose globally so login/logout flows can call it without a page reload
    window.updateNavbarAuthUI = updateNavbarAuthUI;
})();
