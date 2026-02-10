function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/pages/auth.html';
        return Promise.reject('No token');
    }

    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
}
