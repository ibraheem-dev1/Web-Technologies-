const cartService = require('../../services/cartService');

async function viewCart(req, res) {
    try {
        const cart = cartService.getSessionCart(req);
        const viewData = await cartService.getCartViewData(cart);
        return res.render('cart', {
            active: 'cart',
            items: viewData.items,
            total: viewData.total,
            totalQty: viewData.totalQty
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

    try {
        const cart = cartService.getSessionCart(req);
        const result = await cartService.addItem(cart, productId, qty);
        if (!result.ok) {
            return respondError(result.message, result.status);
        }

        if (wantsJson) {
            return res.json({
                ok: true,
                cartCount: result.summary.totalQty,
                message: result.message
            });
        }

        req.flash('success', result.message);
        return res.redirect(redirectTo);
    } catch (err) {
        console.error('Cart add error:', err);
        return respondError('Unable to add item to cart.', 500);
    }
}

function removeFromCart(req, res) {
    const productId = (req.body.productId || '').trim();
    const cart = cartService.getSessionCart(req);
    const result = cartService.removeItem(cart, productId);
    if (result.removed) {
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

    try {
        const cart = cartService.getSessionCart(req);
        const result = await cartService.adjustItem(cart, productId, delta);
        if (!result.ok) {
            return respondAdjust(result.message, result.status);
        }

        if (wantsJson) {
            return res.json({ ok: true, cartCount: result.summary.totalQty, qty: result.qty });
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
