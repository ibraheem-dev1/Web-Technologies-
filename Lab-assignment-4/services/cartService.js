const Product = require('../models/Product');

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

async function getCartViewData(cart) {
    const summary = buildCartSummary(cart);
    const ids = summary.items.map(item => item.productId);

    const products = await Product.find({ _id: { $in: ids } })
        .select('stock')
        .lean();
    const stockMap = new Map(products.map(p => [String(p._id), p.stock || 0]));
    const items = summary.items.map(item => ({
        ...item,
        stock: stockMap.get(String(item.productId)) || 0
    }));

    return {
        items,
        total: summary.total,
        totalQty: summary.totalQty
    };
}

async function addItem(cart, productId, qty) {
    if (!productId) {
        return { ok: false, status: 400, message: 'Unable to add item to cart.' };
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
        return { ok: false, status: 404, message: 'Product not found.' };
    }

    if (!product.stock || product.stock <= 0) {
        return { ok: false, status: 400, message: 'This product is out of stock.' };
    }

    const existing = cart.items[productId];
    const existingQty = existing ? existing.qty : 0;
    if (existingQty + qty > product.stock) {
        return { ok: false, status: 400, message: `Only ${product.stock} item(s) left in stock.` };
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
    return {
        ok: true,
        summary,
        message: `${product.name} added to cart.`
    };
}

function removeItem(cart, productId) {
    if (productId && cart.items[productId]) {
        delete cart.items[productId];
        return { removed: true };
    }
    return { removed: false };
}

async function adjustItem(cart, productId, delta) {
    if (!productId) {
        return { ok: false, status: 400, message: 'Unable to update cart.' };
    }

    const item = cart.items[productId];
    if (!item) {
        return { ok: false, status: 400, message: 'Cart item not found.' };
    }

    if (delta < 0) {
        item.qty -= 1;
        if (item.qty <= 0) {
            delete cart.items[productId];
        }

        const summary = buildCartSummary(cart);
        return { ok: true, summary, qty: item.qty || 0 };
    }

    const product = await Product.findById(productId).select('stock').lean();
    const stock = product && product.stock ? product.stock : 0;
    if (stock <= 0 || item.qty + 1 > stock) {
        return { ok: false, status: 400, message: `Only ${stock} item(s) left in stock.` };
    }

    item.qty += 1;
    const summary = buildCartSummary(cart);
    return { ok: true, summary, qty: item.qty };
}

module.exports = {
    getSessionCart,
    buildCartSummary,
    getCartViewData,
    addItem,
    removeItem,
    adjustItem
};
