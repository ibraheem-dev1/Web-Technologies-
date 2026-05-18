const orderService = require('../../services/orderService');
const cartService = require('../../services/cartService');

async function listOrders(req, res) {
    try {
        const orders = await orderService.listOrdersForUser(req.session.user.id);
        return res.render('orders', { active: 'orders', orders });
    } catch (err) {
        console.error('Orders list error:', err);
        return res.status(500).send('Error loading orders.');
    }
}

async function orderDetail(req, res) {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) {
            return res.status(404).send('Order not found.');
        }

        const isAdminUser = req.session.user && req.session.user.role === 'admin';
        if (!isAdminUser && String(order.userId) !== String(req.session.user.id)) {
            req.flash('error', 'Access denied.');
            return res.redirect('/orders');
        }

        return res.render('order_detail', { active: 'orders', order });
    } catch (err) {
        console.error('Order detail error:', err);
        return res.status(500).send('Error loading order.');
    }
}

function showCheckout(req, res) {
    const cart = cartService.getSessionCart(req);
    const summary = cartService.buildCartSummary(cart);
    if (summary.items.length === 0) {
        req.flash('info', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    return res.render('checkout', {
        active: 'checkout',
        items: summary.items,
        total: summary.total,
        totalQty: summary.totalQty,
        address: {}
    });
}

async function checkout(req, res) {
    const cart = cartService.getSessionCart(req);
    const summary = cartService.buildCartSummary(cart);
    if (summary.items.length === 0) {
        req.flash('info', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    try {
        const result = await orderService.createOrderFromCart({
            userSession: req.session.user,
            addressInput: req.body,
            summaryItems: summary.items
        });

        if (!result.ok) {
            if (result.reason === 'address_incomplete') {
                req.flash('error', 'Please fill in all address fields.');
                return res.redirect('/checkout');
            }
            if (result.reason === 'stock_issues') {
                req.flash('error', result.issues.join(' '));
                return res.redirect('/cart');
            }
            if (result.reason === 'stock_changed') {
                req.flash('error', 'Stock changed. Please review your cart.');
                return res.redirect('/cart');
            }

            req.flash('error', 'Unable to place order. Please try again.');
            return res.redirect('/checkout');
        }

        req.session.cart = { items: {} };
        req.flash('success', 'Order placed successfully.');
        return res.redirect(`/orders/${result.order._id}`);
    } catch (err) {
        console.error('Checkout error:', err);
        req.flash('error', 'Unable to place order. Please try again.');
        return res.redirect('/checkout');
    }
}

module.exports = {
    listOrders,
    orderDetail,
    showCheckout,
    checkout
};
