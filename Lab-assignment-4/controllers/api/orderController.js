const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');

async function create(req, res) {
    const addressInput = req.body.address || {};
    const address = {
        name: (addressInput.name || '').trim(),
        phone: (addressInput.phone || '').trim(),
        street: (addressInput.street || '').trim(),
        city: (addressInput.city || '').trim(),
        postal: (addressInput.postal || '').trim(),
        country: (addressInput.country || '').trim()
    };

    if (!address.name || !address.phone || !address.street || !address.city || !address.postal || !address.country) {
        return res.status(400).json({ ok: false, message: 'Please provide a complete address.' });
    }

    const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];
    const normalizedItems = itemsInput
        .map(item => ({
            productId: (item.productId || '').trim(),
            qty: Math.max(parseInt(item.qty, 10) || 0, 0)
        }))
        .filter(item => item.productId && item.qty > 0);

    if (normalizedItems.length === 0) {
        return res.status(400).json({ ok: false, message: 'No order items provided.' });
    }

    const invalidIds = normalizedItems.filter(item => !mongoose.Types.ObjectId.isValid(item.productId));
    if (invalidIds.length > 0) {
        return res.status(400).json({ ok: false, message: 'One or more product IDs are invalid.' });
    }

    try {
        const user = await User.findById(req.user.user_id).lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found.' });
        }

        const productIds = normalizedItems.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } }).lean();
        const productMap = new Map(products.map(p => [String(p._id), p]));

        const issues = [];
        const orderItems = [];
        let totalQty = 0;
        let totalAmount = 0;

        normalizedItems.forEach(item => {
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

        if (issues.length > 0) {
            return res.status(400).json({ ok: false, message: 'Unable to place order.', issues });
        }

        const updated = [];
        for (const item of normalizedItems) {
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.productId, stock: { $gte: item.qty } },
                { $inc: { stock: -item.qty } },
                { new: true }
            );

            if (!updatedProduct) {
                for (const entry of updated) {
                    await Product.findByIdAndUpdate(entry.productId, { $inc: { stock: entry.qty } });
                }
                return res.status(409).json({ ok: false, message: 'Stock changed. Please retry.' });
            }

            updated.push({ productId: item.productId, qty: item.qty });
        }

        const order = await Order.create({
            userId: user._id,
            user: {
                name: user.name || 'Customer',
                email: user.email
            },
            address,
            items: orderItems,
            totalQty,
            totalAmount
        });

        return res.status(201).json({
            ok: true,
            order: {
                id: String(order._id),
                totalQty: order.totalQty,
                totalAmount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt,
                items: order.items,
                address: order.address
            }
        });
    } catch (err) {
        console.error('API order create error:', err);
        return res.status(500).json({ ok: false, message: 'Unable to place order.' });
    }
}

module.exports = {
    create
};
