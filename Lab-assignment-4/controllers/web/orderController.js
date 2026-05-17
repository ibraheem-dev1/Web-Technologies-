const Order = require('../../models/Order');
const Product = require('../../models/Product');
const { getSessionCart, buildCartSummary } = require('../../services/cartService');

async function listOrders(req, res) {
    try {
        const orders = await Order.find({ userId: req.session.user.id })
            .sort({ createdAt: -1 })
            .lean();
        return res.render('orders', { active: 'orders', orders });
    } catch (err) {
        console.error('Orders list error:', err);
        return res.status(500).send('Error loading orders.');
    }
}

async function orderDetail(req, res) {
    try {
        const order = await Order.findById(req.params.id).lean();
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
    const cart = getSessionCart(req);
    const summary = buildCartSummary(cart);
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
    const cart = getSessionCart(req);
    const summary = buildCartSummary(cart);
    if (summary.items.length === 0) {
        req.flash('info', 'Your cart is empty.');
        return res.redirect('/cart');
    }

    const address = {
        name: (req.body.name || '').trim(),
        phone: (req.body.phone || '').trim(),
        street: (req.body.street || '').trim(),
        city: (req.body.city || '').trim(),
        postal: (req.body.postal || '').trim(),
        country: (req.body.country || '').trim()
    };

    if (!address.name || !address.phone || !address.street || !address.city || !address.postal || !address.country) {
        req.flash('error', 'Please fill in all address fields.');
        return res.redirect('/checkout');
    }

    const updated = [];

    try {
        const productIds = summary.items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } }).lean();
        const productMap = new Map(products.map(p => [String(p._id), p]));

        const issues = [];
        summary.items.forEach(item => {
            const product = productMap.get(String(item.productId));
            if (!product) {
                issues.push(`${item.name} is no longer available.`);
                return;
            }
            if (!product.stock || product.stock < item.qty) {
                issues.push(`${product.name} has only ${product.stock || 0} left.`);
            }
        });

        if (issues.length > 0) {
            req.flash('error', issues.join(' '));
            return res.redirect('/cart');
        }

        for (const item of summary.items) {
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.productId, stock: { $gte: item.qty } },
                { $inc: { stock: -item.qty } },
                { new: true }
            );

            if (!updatedProduct) {
                for (const entry of updated) {
                    await Product.findByIdAndUpdate(entry.productId, { $inc: { stock: entry.qty } });
                }
                req.flash('error', 'Stock changed. Please review your cart.');
                return res.redirect('/cart');
            }

            updated.push({ productId: item.productId, qty: item.qty });
        }

        const order = await Order.create({
            userId: req.session.user.id,
            user: {
                name: req.session.user.name || 'Customer',
                email: req.session.user.email
            },
            address,
            items: summary.items.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                qty: item.qty,
                imageUrl: item.imageUrl
            })),
            totalQty: summary.totalQty,
            totalAmount: summary.total
        });

        req.session.cart = { items: {} };
        req.flash('success', 'Order placed successfully.');
        return res.redirect(`/orders/${order._id}`);
    } catch (err) {
        console.error('Checkout error:', err);
        if (updated.length > 0) {
            await Promise.all(
                updated.map(entry =>
                    Product.findByIdAndUpdate(entry.productId, { $inc: { stock: entry.qty } })
                )
            );
        }
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
