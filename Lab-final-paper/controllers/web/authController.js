const webAuthService = require('../../services/webAuthService');

function showRegister(req, res) {
    if (req.session.user) {
        return res.redirect('/profile');
    }
    return res.render('auth/register', { active: 'register' });
}

async function register(req, res) {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';

    try {
        const result = await webAuthService.registerFlow({
            name,
            email,
            password,
            confirmPassword
        });
        if (!result.ok) {
            req.flash(result.flash.type, result.flash.message);
            return res.redirect(result.redirectTo);
        }

        const newUser = result.user;
        req.session.user = {
            id: String(newUser._id),
            role: newUser.role,
            email: newUser.email,
            name: newUser.name
        };
        req.flash(result.flash.type, result.flash.message);
        return res.redirect(result.redirectTo);
    } catch (err) {
        console.error('Register error:', err);
        req.flash('error', 'Registration failed. Please try again.');
        return res.redirect('/register');
    }
}

function showLogin(req, res) {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/profile');
    }
    return res.render('auth/login', { active: 'login' });
}

async function login(req, res) {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    try {
        const result = await webAuthService.loginFlow({ email, password });
        if (!result.ok) {
            req.flash(result.flash.type, result.flash.message);
            return res.redirect(result.redirectTo);
        }

        const user = result.user;
        req.session.user = {
            id: String(user._id),
            role: user.role,
            email: user.email,
            name: user.name
        };

        req.flash(result.flash.type, result.flash.message);
        return res.redirect(result.redirectTo);
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'Login failed. Please try again.');
        return res.redirect('/login');
    }
}

function logout(req, res) {
    req.session.user = null;
    req.flash('success', 'You have successfully logged out.');
    return res.redirect('/login');
}

function profile(req, res) {
    return res.render('profile', { active: 'profile', user: req.session.user });
}

module.exports = {
    showRegister,
    register,
    showLogin,
    login,
    logout,
    profile
};
