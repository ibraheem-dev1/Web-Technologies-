const userService = require('./userService');

async function registerFlow({ name, email, password, confirmPassword }) {
    const result = await userService.registerUser({
        name,
        email,
        password,
        confirmPassword
    });

    if (!result.ok) {
        if (result.reason === 'missing_fields') {
            return { ok: false, flash: { type: 'error', message: 'Please fill all required fields.' }, redirectTo: '/register' };
        }
        if (result.reason === 'password_length') {
            return { ok: false, flash: { type: 'error', message: 'Password must be at least 6 characters.' }, redirectTo: '/register' };
        }
        if (result.reason === 'password_mismatch') {
            return { ok: false, flash: { type: 'error', message: 'Passwords do not match.' }, redirectTo: '/register' };
        }
        if (result.reason === 'email_exists') {
            return { ok: false, flash: { type: 'error', message: 'Email already registered.' }, redirectTo: '/register' };
        }
        return { ok: false, flash: { type: 'error', message: 'Registration failed. Please try again.' }, redirectTo: '/register' };
    }

    return {
        ok: true,
        user: result.user,
        flash: { type: 'success', message: `Welcome, ${result.user.name}!` },
        redirectTo: '/'
    };
}

async function loginFlow({ email, password }) {
    const result = await userService.authenticateUser({ email, password });
    if (!result.ok) {
        if (result.reason === 'missing_fields') {
            return { ok: false, flash: { type: 'error', message: 'Please enter email and password.' }, redirectTo: '/login' };
        }
        return { ok: false, flash: { type: 'error', message: 'Invalid email or password.' }, redirectTo: '/login' };
    }

    const redirectTo = result.user.role === 'admin' ? '/admin' : '/';
    return {
        ok: true,
        user: result.user,
        flash: { type: 'success', message: `Welcome back, ${result.user.name}!` },
        redirectTo
    };
}

module.exports = {
    registerFlow,
    loginFlow
};
