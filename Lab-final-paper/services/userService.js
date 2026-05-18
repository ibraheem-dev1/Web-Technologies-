const User = require('../models/User');

async function registerUser({ name, email, password, confirmPassword }) {
    if (!name || !email || !password || !confirmPassword) {
        return { ok: false, reason: 'missing_fields' };
    }
    if (password.length < 6) {
        return { ok: false, reason: 'password_length' };
    }
    if (password !== confirmPassword) {
        return { ok: false, reason: 'password_mismatch' };
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
        return { ok: false, reason: 'email_exists' };
    }

    const user = await User.create({
        name,
        email,
        password,
        role: 'customer'
    });

    return { ok: true, user };
}

async function authenticateUser({ email, password }) {
    if (!email || !password) {
        return { ok: false, reason: 'missing_fields' };
    }

    const user = await User.findOne({ email });
    if (!user) {
        return { ok: false, reason: 'invalid_credentials' };
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
        return { ok: false, reason: 'invalid_credentials' };
    }

    return { ok: true, user };
}

async function authenticateAdmin({ email, password }) {
    const result = await authenticateUser({ email, password });
    if (!result.ok) {
        return result;
    }

    if (result.user.role !== 'admin') {
        return { ok: false, reason: 'invalid_credentials' };
    }

    return result;
}

module.exports = {
    registerUser,
    authenticateUser,
    authenticateAdmin
};
