async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    if (!token) {
        console.warn("No token found, redirecting to login...");
        window.location.href = '/pages/auth.html';
        return Promise.reject('No token');
    }

    const fetchOptions = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(url, fetchOptions);

        if (response.status === 401 || response.status === 403) {
            console.error("Session expired or unauthorized. Clearing storage...");
            localStorage.removeItem('token');
            window.location.href = '/pages/auth.html';
            return Promise.reject('Session expired');
        }

        return response;
    } catch (error) {
        console.error("Network error in authFetch:", error);
        throw error;
    }
}