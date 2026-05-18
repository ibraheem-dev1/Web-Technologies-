const mongoose = require('mongoose');
const { orderStatusOptions } = require('../shared/constants');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

function normalizeAddress(addressInput) {
    const address = {
        name: (addressInput.name || '').trim(),
        phone: (addressInput.phone || '').trim(),
        street: (addressInput.street || '').trim(),
        city: (addressInput.city || '').trim(),
        postal: (addressInput.postal || '').trim(),
        country: (addressInput.country || '').trim()
    };

    const missing = !address.name || !address.phone || !address.street || !address.city || !address.postal || !address.country;
    if (missing) {
        return { ok: false, reason: 'address_incomplete' };
    }

    return { ok: true, address };
}

function normalizeItems(itemsInput) {
    const items = Array.isArray(itemsInput) ? itemsInput : [];
    const normalizedItems = items
        .map(item => ({
            productId: (item.productId || '').trim(),
            qty: Math.max(parseInt(item.qty, 10) || 0, 0)
        }))
        .filter(item => item.productId && item.qty > 0);

    if (normalizedItems.length === 0) {
        return { ok: false, reason: 'no_items' };
    }

    const invalidIds = normalizedItems.filter(item => !mongoose.Types.ObjectId.isValid(item.productId));
    if (invalidIds.length > 0) {
        return { ok: false, reason: 'invalid_ids' };
    }

    return { ok: true, items: normalizedItems };
}

async function buildProductMap(productIds) {
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    return new Map(products.map(p => [String(p._id), p]));
}

function buildOrderItemsFromProducts(items, productMap) {
    const issues = [];
    const orderItems = [];
    let totalQty = 0;
    let totalAmount = 0;

    items.forEach(item => {
        const product = productMap.get(String(item.productId));
        if (!product) {
            issues.push(`Product ${item.productId} is no longer available.`);
            return;
        }
        if (!product.stock || product.stock < item.qty) {
            issues.push(`${product.name} has only ${product.stock || 0} left.`);
        }

        orderItems.push({
            productId: product._id,
            name: product.name,
            price: product.price,
            qty: item.qty,
            imageUrl: product.imageUrl || ''
        });
        totalQty += item.qty;
        totalAmount += product.price * item.qty;
    });

    return { issues, orderItems, totalQty, totalAmount };
}

async function decrementStock(items) {
    const updated = [];
    for (const item of items) {
        const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.productId, stock: { $gte: item.qty } },
            { $inc: { stock: -item.qty } },
            { new: true }
        );

        if (!updatedProduct) {
            await rollbackStock(updated);
            return { ok: false };
        }

        updated.push({ productId: item.productId, qty: item.qty });
    }

    return { ok: true, updated };
}

async function rollbackStock(updated) {
    if (updated.length === 0) {
        return;
    }

    await Promise.all(
        updated.map(entry =>
            Product.findByIdAndUpdate(entry.productId, { $inc: { stock: entry.qty } })
        )
    );
}

async function createOrderFromApi({ userId, addressInput, itemsInput }) {
    try {
        const addressResult = normalizeAddress(addressInput || {});
        if (!addressResult.ok) {
            return { ok: false, status: 400, reason: addressResult.reason };
        }

        const itemsResult = normalizeItems(itemsInput);
        if (!itemsResult.ok) {
            return { ok: false, status: 400, reason: itemsResult.reason };
        }

        const user = await User.findById(userId).lean();
        if (!user) {
            return { ok: false, status: 404, reason: 'user_not_found' };
        }

        const productMap = await buildProductMap(itemsResult.items.map(item => item.productId));
        const { issues, orderItems, totalQty, totalAmount } = buildOrderItemsFromProducts(itemsResult.items, productMap);

        if (issues.length > 0) {
            return { ok: false, status: 400, reason: 'stock_issues', issues };
        }

        const stockResult = await decrementStock(itemsResult.items);
        if (!stockResult.ok) {
            return { ok: false, status: 409, reason: 'stock_changed' };
        }

        const order = await Order.create({
            userId: user._id,
            user: {
                name: user.name || 'Customer',
                email: user.email
            },
            address: addressResult.address,
            items: orderItems,
            totalQty,
            totalAmount
        });

        return { ok: true, order };
    } catch (err) {
        console.error('API order create error:', err);
        return { ok: false, status: 500, reason: 'server_error' };
    }
}

async function createOrderFromCart({ userSession, addressInput, summaryItems }) {
    const addressResult = normalizeAddress(addressInput || {});
    if (!addressResult.ok) {
        return { ok: false, reason: 'address_incomplete' };
    }

    const productIds = summaryItems.map(item => item.productId);
    const productMap = await buildProductMap(productIds);

    const issues = [];
    summaryItems.forEach(item => {
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
        return { ok: false, reason: 'stock_issues', issues };
    }

    let stockResult = null;
    try {
        stockResult = await decrementStock(summaryItems);
        if (!stockResult.ok) {
            return { ok: false, reason: 'stock_changed' };
        }

        const totalQty = summaryItems.reduce((sum, item) => sum + item.qty, 0);
        const totalAmount = summaryItems.reduce((sum, item) => sum + item.price * item.qty, 0);

        const order = await Order.create({
            userId: userSession.id,
            user: {
                name: userSession.name || 'Customer',
                email: userSession.email
            },
            address: addressResult.address,
            items: summaryItems.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                qty: item.qty,
                imageUrl: item.imageUrl
            })),
            totalQty,
            totalAmount
        });

        return { ok: true, order };
    } catch (err) {
        console.error('Checkout error:', err);
        if (stockResult && stockResult.updated) {
            await rollbackStock(stockResult.updated);
        }
        return { ok: false, reason: 'server_error' };
    }
}

async function listOrdersForUser(userId) {
    return Order.find({ userId }).sort({ createdAt: -1 }).lean();
}

async function getOrderById(orderId) {
    return Order.findById(orderId).lean();
}

async function listAllOrders() {
    return Order.find({}).sort({ createdAt: -1 }).lean();
}

async function updateOrderStatus(orderId, status) {
    await Order.findByIdAndUpdate(orderId, { status });
}

function isValidStatus(status) {
    return orderStatusOptions.includes(status);
}

module.exports = {
    normalizeAddress,
    normalizeItems,
    createOrderFromApi,
    createOrderFromCart,
    listOrdersForUser,
    getOrderById,
    listAllOrders,
    updateOrderStatus,
    isValidStatus
};
