function isLoggedIn(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    if (req.session && req.session.user) {
        req.flash('error', 'Access Denied.');
        return res.redirect('/');
    }
    req.flash('error', 'Please log in as admin.');
    return res.redirect('/admin/login');
}

module.exports = {
    isLoggedIn,
    isAdmin
};
