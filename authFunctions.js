// UI handler functions for login/register modals

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    if (!username || !password) {
        alert('Please enter username and password.');
        return;
    }
    fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            localStorage.setItem('username', data.username);
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('user-info').innerText = data.username;
            document.getElementById('user-info').classList.remove('hidden');
            document.getElementById('logout-btn').style.display = 'flex';
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('profile-btn').style.display = 'flex';
            if (window.updateAdminUI) window.updateAdminUI();
            // Optionally reload or update UI
        }
    });
}

function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    if (!username || !password || !confirm) {
        alert('Please fill all fields.');
        return;
    }
    if (password !== confirm) {
        alert('Passwords do not match.');
        return;
    }
    fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert('Registration successful! Please log in.');
            showLoginModal();
        }
    });
}

function showRegisterModal() {
    document.getElementById('login-modal').style.display = 'none';
    // Note: register modal not implemented in HTML, so just hide login modal
}

function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

export { login, register, showRegisterModal, showLoginModal };