function flashMiddleware(req, res, next) {
    res.locals.user = req.session.user || null;
    const cartItems = req.session.cart && req.session.cart.items ? Object.values(req.session.cart.items) : [];
    res.locals.cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    res.locals.flash = {
        success: req.flash('success') || [],
        error: req.flash('error') || [],
        info: req.flash('info') || []
    };
    next();
}

function setFlash(req, type, message) {
    req.flash(type, message);
}

module.exports = {
    flashMiddleware,
    setFlash
};
