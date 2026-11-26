/**
 * Auth - login with two roles for IRON WILL.
 *
 *   admin -> full access (add / edit / delete, settings)
 *   user  -> read only (can view every page except Settings)
 *
 * This is a client-side gate for a static site: passwords are compared as
 * hashes so the plaintext is not stored, and the login is remembered for the
 * browser tab (sessionStorage). It keeps casual users out of the admin
 * controls; it is not server-enforced security. Real write protection comes
 * from the GitHub token: only give the admin's devices a token that can write.
 *
 * Load this script in <head> on every page, before the stylesheet's content
 * renders, so the redirect and role class apply without a flash.
 */
(function () {
    var TOKEN_KEY = 'github_token';          // same key Store uses
    var SESSION_KEY = 'ironwill-session';
    var HASH_KEY_PREFIX = 'ironwill-hash-';
    var TOKEN_LOADED_FLAG = 'ironwill-token-loaded';
    var LOGIN_PAGE = 'login.html';
    var ADMIN_ONLY_PAGES = ['settings.html'];

    // Default passwords are kept only as salted hashes (SHA-256 for https,
    // djb2 'fb' form for file://) so the plaintext is never in the source.
    // A password changed in Settings is stored per device and takes priority.
    var USERS = {
        admin: {
            role: 'admin',
            label: 'Admin',
            defaultHash: { sha256: '8bf3a4b14258221d63461f9ad72d8f813f00f06d1ab218fa4f8b6a877b68e882', fallback: 'fb8e05398c' },
        },
        user: {
            role: 'user',
            label: 'User',
            defaultHash: { sha256: '0141ac9d1c4c3545cfeefaf7006f1ecf63fd4de891b504612e31f848078fe0bd', fallback: 'fb2daf5f9d' },
        },
    };

    function currentPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }

    /* ---------- Token passed by link / QR (#token=...) ---------- */
    // Runs first so a token arriving by link is saved even before login.
    (function loadTokenFromUrl() {
        var hash = window.location.hash || '';
        var m = hash.match(/[#&]token=([^&]+)/);
        if (!m) return;
        var incoming = '';
        try { incoming = decodeURIComponent(m[1]); } catch (e) { incoming = m[1]; }
        incoming = (incoming || '').trim();
        // Remove the token from the address bar right away.
        history.replaceState(null, '', window.location.pathname + window.location.search);
        if (!incoming) return;
        localStorage.setItem(TOKEN_KEY, incoming);
        sessionStorage.setItem(TOKEN_LOADED_FLAG, '1');
    })();

    /* ---------- Hashing ---------- */
    function canUseSubtle() {
        return !!(window.crypto && window.crypto.subtle && window.isSecureContext === true);
    }

    function sha256(text) {
        var enc = new TextEncoder().encode(text);
        return window.crypto.subtle.digest('SHA-256', enc).then(function (buf) {
            var bytes = new Uint8Array(buf);
            var hex = '';
            for (var i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
            return hex;
        });
    }

    // Deterministic non-crypto fallback (djb2) for file:// where SubtleCrypto is unavailable.
    function fallbackHash(text) {
        var h = 5381;
        for (var i = 0; i < text.length; i++) {
            h = ((h << 5) + h) + text.charCodeAt(i);
            h = h & 0xffffffff;
        }
        return 'fb' + (h >>> 0).toString(16);
    }

    // Hash a password, salted with the username so both accounts never share a hash.
    function hashPassword(username, password) {
        var text = 'ironwill:' + username + ':' + password;
        if (!canUseSubtle()) return Promise.resolve(fallbackHash(text));
        return sha256(text).catch(function () { return fallbackHash(text); });
    }

    // Hash using the same method the stored hash was made with, so a password
    // set over https still verifies when opened via file:// and vice versa
    // (as long as the method is available).
    function hashLike(stored, username, password) {
        var text = 'ironwill:' + username + ':' + password;
        if (stored && stored.indexOf('fb') === 0) return Promise.resolve(fallbackHash(text));
        if (!canUseSubtle()) return Promise.resolve(null);
        return sha256(text).catch(function () { return null; });
    }

    function getStoredHash(username) {
        return localStorage.getItem(HASH_KEY_PREFIX + username) || '';
    }

    /* ---------- Session ---------- */
    function getSession() {
        try {
            var s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
            if (s && USERS[s.username] && s.role === USERS[s.username].role) return s;
        } catch (e) { /* ignore */ }
        return null;
    }

    var Auth = {
        USERS: USERS,
        LOGIN_PAGE: LOGIN_PAGE,

        getSession: getSession,

        isLoggedIn: function () { return !!getSession(); },

        isAdmin: function () {
            var s = getSession();
            return !!(s && s.role === 'admin');
        },

        // Resolves true when the password matches the account's stored hash,
        // or its default password if it has never been changed.
        verify: function (username, password) {
            var user = USERS[username];
            if (!user || !password) return Promise.resolve(false);
            var stored = getStoredHash(username);
            if (!stored) {
                stored = canUseSubtle() ? user.defaultHash.sha256 : user.defaultHash.fallback;
            }
            return hashLike(stored, username, password).then(function (h) {
                return !!h && h === stored;
            });
        },

        login: function (username, password) {
            username = (username || '').trim().toLowerCase();
            return Auth.verify(username, password).then(function (ok) {
                if (ok) {
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                        username: username,
                        role: USERS[username].role,
                        at: new Date().toISOString(),
                    }));
                }
                return ok;
            });
        },

        logout: function () {
            sessionStorage.removeItem(SESSION_KEY);
            window.location.href = LOGIN_PAGE;
        },

        // Admin only: change the password of either account on this device.
        setPassword: function (username, newPassword) {
            if (!Auth.isAdmin() || !USERS[username]) return Promise.resolve(false);
            return hashPassword(username, newPassword).then(function (h) {
                localStorage.setItem(HASH_KEY_PREFIX + username, h);
                return true;
            });
        },

        // Admin only: forget a changed password so the default works again.
        resetPassword: function (username) {
            if (!Auth.isAdmin() || !USERS[username]) return false;
            localStorage.removeItem(HASH_KEY_PREFIX + username);
            return true;
        },

        // Link that carries the GitHub token to another device's login page.
        buildTokenTransferUrl: function (token) {
            if (!token) return null;
            var base = window.location.href.split('#')[0].split('?')[0];
            base = base.substring(0, base.lastIndexOf('/') + 1);
            return base + LOGIN_PAGE + '#token=' + encodeURIComponent(token);
        },

        // Only allow redirects to pages of this app (no open redirect).
        safeNext: function (next) {
            return /^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(next || '') && next !== LOGIN_PAGE ? next : 'index.html';
        },
    };
    window.Auth = Auth;

    /* ---------- Page guard (runs immediately, in <head>) ---------- */
    var page = currentPage();
    var session = getSession();
    var root = document.documentElement;

    if (page !== LOGIN_PAGE) {
        if (!session) {
            root.style.visibility = 'hidden';
            window.location.replace(LOGIN_PAGE + '?next=' + encodeURIComponent(page + window.location.search));
            return;
        }
        if (session.role !== 'admin' && ADMIN_ONLY_PAGES.indexOf(page) !== -1) {
            root.style.visibility = 'hidden';
            window.location.replace('index.html');
            return;
        }
        root.classList.add(session.role === 'admin' ? 'role-admin' : 'role-user');
    }

    /* ---------- Nav: user badge + logout, hide admin links ---------- */
    document.addEventListener('DOMContentLoaded', function () {
        if (sessionStorage.getItem(TOKEN_LOADED_FLAG) === '1') {
            sessionStorage.removeItem(TOKEN_LOADED_FLAG);
            setTimeout(function () {
                if (window.Utils && Utils.showToast) Utils.showToast('GitHub token loaded from link');
            }, 300);
        }

        if (page === LOGIN_PAGE || !session) return;

        document.querySelectorAll('.nav-links a').forEach(function (a) {
            if (ADMIN_ONLY_PAGES.indexOf(a.getAttribute('href')) !== -1) {
                a.parentElement.classList.add('admin-only');
            }
        });

        var nav = document.querySelector('.nav-links');
        if (!nav) return;
        var li = document.createElement('li');
        li.className = 'nav-user';
        var name = document.createElement('span');
        name.className = 'nav-user-name';
        name.textContent = USERS[session.username].label;
        var badge = document.createElement('span');
        badge.className = 'role-badge role-badge-' + session.role;
        badge.textContent = session.role === 'admin' ? 'Full access' : 'Read only';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-danger';
        btn.textContent = 'Logout';
        btn.addEventListener('click', Auth.logout);
        li.appendChild(name);
        li.appendChild(badge);
        li.appendChild(btn);
        nav.appendChild(li);
    });
})();
