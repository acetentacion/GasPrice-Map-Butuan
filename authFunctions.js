import config from './config.js';

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    if (!username || !password) {
        showErrorMessage('Please enter username and password.');
        return;
    }
    fetch(`${config.API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.error) {
            showErrorMessage(data.error);
        } else if (data.message === 'Login successful') {
            localStorage.setItem('username', data.username);
            window.username = data.username;
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('user-info').innerText = data.username;
            document.getElementById('user-info').classList.remove('hidden');
            document.getElementById('logout-btn').style.display = 'flex';
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('profile-btn').style.display = 'flex';
            const loginNavBtn = document.getElementById('login-nav-btn');
            const profileNavBtn = document.getElementById('profile-nav-btn');
            const logoutNavBtn = document.getElementById('logout-nav-btn');
            if (loginNavBtn) loginNavBtn.style.display = 'none';
            if (profileNavBtn) profileNavBtn.style.display = 'flex';
            if (logoutNavBtn) logoutNavBtn.style.display = 'flex';
            if (window.updateAdminUI) window.updateAdminUI();
        } else {
            showErrorMessage('Invalid response from server.');
        }
    })
    .catch(err => {
        console.error('Login error:', err);
        showNetworkErrorModal();
    });
}

function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    if (!username || !password || !confirm) {
        showErrorMessage('Please fill all fields.');
        return;
    }
    if (password !== confirm) {
        showErrorMessage('Passwords do not match.');
        return;
    }
    fetch(`${config.API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showErrorMessage(data.error);
        } else {
            showSuccessMessage('Registration successful! Please log in.');
            showLoginModal();
        }
    })
    .catch(err => {
        console.error('Registration error:', err);
        showNetworkErrorModal();
    });
}

function showRegisterModal() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('register-modal').style.display = 'flex';
}

function showLoginModal() {
    document.getElementById('register-modal').style.display = 'none';
    document.getElementById('login-modal').style.display = 'flex';
}

export { login, register, showRegisterModal, showLoginModal };
