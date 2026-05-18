const orderService = require('../../services/orderService');

async function create(req, res) {
    try {
        const result = await orderService.createOrderFromApi({
            userId: req.user.user_id,
            addressInput: req.body.address,
            itemsInput: req.body.items
        });

        if (!result.ok) {
            if (result.reason === 'address_incomplete') {
                return res.status(400).json({ ok: false, message: 'Please provide a complete address.' });
            }
            if (result.reason === 'no_items') {
                return res.status(400).json({ ok: false, message: 'No order items provided.' });
            }
            if (result.reason === 'invalid_ids') {
                return res.status(400).json({ ok: false, message: 'One or more product IDs are invalid.' });
            }
            if (result.reason === 'user_not_found') {
                return res.status(404).json({ ok: false, message: 'User not found.' });
            }
            if (result.reason === 'stock_issues') {
                return res.status(400).json({ ok: false, message: 'Unable to place order.', issues: result.issues });
            }
            if (result.reason === 'stock_changed') {
                return res.status(409).json({ ok: false, message: 'Stock changed. Please retry.' });
            }
            return res.status(500).json({ ok: false, message: 'Unable to place order.' });
        }

        return res.status(201).json({
            ok: true,
            order: {
                id: String(result.order._id),
                totalQty: result.order.totalQty,
                totalAmount: result.order.totalAmount,
                status: result.order.status,
                createdAt: result.order.createdAt,
                items: result.order.items,
                address: result.order.address
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
