function getSessionCart(req) {
    if (!req.session.cart) {
        req.session.cart = { items: {} };
    }
    return req.session.cart;
}

function buildCartSummary(cart) {
    const items = Object.values(cart.items || {});
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return { items, totalQty, total };
}

module.exports = {
    getSessionCart,
    buildCartSummary
};
