const User = require('../../models/User');

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

    if (!name || !email || !password || !confirmPassword) {
        req.flash('error', 'Please fill all required fields.');
        return res.redirect('/register');
    }
    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters.');
        return res.redirect('/register');
    }
    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match.');
        return res.redirect('/register');
    }

    try {
        const existing = await User.findOne({ email }).lean();
        if (existing) {
            req.flash('error', 'Email already registered.');
            return res.redirect('/register');
        }

        const newUser = await User.create({
            name,
            email,
            password,
            role: 'customer'
        });

        req.session.user = {
            id: String(newUser._id),
            role: newUser.role,
            email: newUser.email,
            name: newUser.name
        };
        req.flash('success', `Welcome, ${newUser.name}!`);
        return res.redirect('/');
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

    if (!email || !password) {
        req.flash('error', 'Please enter email and password.');
        return res.redirect('/login');
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        req.session.user = {
            id: String(user._id),
            role: user.role,
            email: user.email,
            name: user.name
        };

        req.flash('success', `Welcome back, ${user.name}!`);
        if (user.role === 'admin') {
            return res.redirect('/admin');
        }
        return res.redirect('/');
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
