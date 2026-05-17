const mongoose = require('mongoose');
const Product = require('../../models/Product');

async function list(req, res) {
    const limit = 8;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const q = (req.query.q || '').trim();
    const category = (req.query.category || 'all').trim().toLowerCase();
    const minPriceRaw = parseFloat(req.query.minPrice);
    const maxPriceRaw = parseFloat(req.query.maxPrice);
    const sort = (req.query.sort || 'newest').trim();

    const filter = {};
    if (q) {
        filter.name = { $regex: q, $options: 'i' };
    }
    if (category && category !== 'all') {
        filter.category = category;
    }
    if (!Number.isNaN(minPriceRaw) || !Number.isNaN(maxPriceRaw)) {
        filter.price = {};
        if (!Number.isNaN(minPriceRaw)) {
            filter.price.$gte = minPriceRaw;
        }
        if (!Number.isNaN(maxPriceRaw)) {
            filter.price.$lte = maxPriceRaw;
        }
        if (Object.keys(filter.price).length === 0) {
            delete filter.price;
        }
    }

    const sortMap = {
        price_asc:  { price: 1 },
        price_desc: { price: -1 },
        rating_desc:{ rating: -1 },
        newest:     { createdAt: -1 }
    };
    const sortBy = sortMap[sort] || sortMap.newest;

    try {
        const totalCount = await Product.countDocuments(filter);
        const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
        const safePage = Math.min(page, totalPages);

        const productsFromDb = await Product.find(filter)
            .sort(sortBy)
            .skip((safePage - 1) * limit)
            .limit(limit)
            .lean();

        return res.json({
            ok: true,
            page: safePage,
            totalPages,
            totalCount,
            products: productsFromDb,
            filters: {
                q,
                category: category || 'all',
                minPrice: !Number.isNaN(minPriceRaw) ? minPriceRaw : '',
                maxPrice: !Number.isNaN(maxPriceRaw) ? maxPriceRaw : '',
                sort
            }
        });
    } catch (err) {
        console.error('API products fetch error:', err);
        return res.status(500).json({ ok: false, message: 'Error loading products.' });
    }
}

async function getById(req, res) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ ok: false, message: 'Invalid product id.' });
    }

    try {
        const product = await Product.findById(id).lean();
        if (!product) {
            return res.status(404).json({ ok: false, message: 'Product not found.' });
        }
        return res.json({ ok: true, product });
    } catch (err) {
        console.error('API product detail error:', err);
        return res.status(500).json({ ok: false, message: 'Error loading product.' });
    }
}

module.exports = {
    list,
    getById
};
