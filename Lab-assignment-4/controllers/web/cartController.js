const Product = require('../../models/Product');
const { getSessionCart, buildCartSummary } = require('../../services/cartService');

async function viewCart(req, res) {
    const cart = getSessionCart(req);
    const summary = buildCartSummary(cart);
    const ids = summary.items.map(item => item.productId);

    try {
        const products = await Product.find({ _id: { $in: ids } })
            .select('stock')
            .lean();
        const stockMap = new Map(products.map(p => [String(p._id), p.stock || 0]));
        const items = summary.items.map(item => ({
            ...item,
            stock: stockMap.get(String(item.productId)) || 0
        }));

        return res.render('cart', {
            active: 'cart',
            items,
            total: summary.total,
            totalQty: summary.totalQty
        });
    } catch (err) {
        console.error('Cart load error:', err);
        return res.status(500).send('Error loading cart.');
    }
}

async function addToCart(req, res) {
    const productId = (req.body.productId || '').trim();
    const qty = Math.max(parseInt(req.body.qty, 10) || 1, 1);
    const redirectTo = req.get('referer') || '/cart';
    const acceptHeader = req.get('Accept') || '';
    const wantsJson = req.xhr || acceptHeader.includes('application/json');

    function respondError(message, status = 400) {
        if (wantsJson) {
            return res.status(status).json({ ok: false, message });
        }
        req.flash('error', message);
        return res.redirect(redirectTo);
    }

    if (!productId) {
        return respondError('Unable to add item to cart.');
    }

    try {
        const product = await Product.findById(productId).lean();
        if (!product) {
            return respondError('Product not found.', 404);
        }

        if (!product.stock || product.stock <= 0) {
            return respondError('This product is out of stock.');
        }

        const cart = getSessionCart(req);
        const existing = cart.items[productId];
        const existingQty = existing ? existing.qty : 0;
        if (existingQty + qty > product.stock) {
            return respondError(`Only ${product.stock} item(s) left in stock.`);
        }

        if (existing) {
            existing.qty += qty;
        } else {
            cart.items[productId] = {
                productId,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl || '/images/banner.jpg',
                qty
            };
        }

        const summary = buildCartSummary(cart);
        if (wantsJson) {
            return res.json({
                ok: true,
                cartCount: summary.totalQty,
                message: `${product.name} added to cart.`
            });
        }

        req.flash('success', `${product.name} added to cart.`);
        return res.redirect(redirectTo);
    } catch (err) {
        console.error('Cart add error:', err);
        return respondError('Unable to add item to cart.', 500);
    }
}

function removeFromCart(req, res) {
    const productId = (req.body.productId || '').trim();
    const cart = getSessionCart(req);

    if (productId && cart.items[productId]) {
        delete cart.items[productId];
        req.flash('info', 'Item removed from cart.');
    }

    return res.redirect('/cart');
}

async function adjustCart(req, res) {
    const productId = (req.body.productId || '').trim();
    const deltaRaw = parseInt(req.body.delta, 10);
    const delta = deltaRaw === -1 ? -1 : 1;
    const acceptHeader = req.get('Accept') || '';
    const wantsJson = req.xhr || acceptHeader.includes('application/json');

    function respondAdjust(message, status = 400) {
        if (wantsJson) {
            return res.status(status).json({ ok: false, message });
        }
        req.flash('error', message);
        return res.redirect('/cart');
    }

    if (!productId) {
        return respondAdjust('Unable to update cart.');
    }

    const cart = getSessionCart(req);
    const item = cart.items[productId];
    if (!item) {
        return respondAdjust('Cart item not found.');
    }

    if (delta < 0) {
        item.qty -= 1;
        if (item.qty <= 0) {
            delete cart.items[productId];
        }

        if (wantsJson) {
            const summary = buildCartSummary(cart);
            return res.json({ ok: true, cartCount: summary.totalQty, qty: item.qty || 0 });
        }

        return res.redirect('/cart');
    }

    try {
        const product = await Product.findById(productId).select('stock').lean();
        const stock = product && product.stock ? product.stock : 0;
        if (stock <= 0 || item.qty + 1 > stock) {
            return respondAdjust(`Only ${stock} item(s) left in stock.`);
        }

        item.qty += 1;
        if (wantsJson) {
            const summary = buildCartSummary(cart);
            return res.json({ ok: true, cartCount: summary.totalQty, qty: item.qty });
        }

        return res.redirect('/cart');
    } catch (err) {
        console.error('Cart adjust error:', err);
        return respondAdjust('Unable to update cart.', 500);
    }
}

module.exports = {
    viewCart,
    addToCart,
    removeFromCart,
    adjustCart
};
