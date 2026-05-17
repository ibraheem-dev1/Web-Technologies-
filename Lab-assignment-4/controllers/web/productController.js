const Product = require('../../models/Product');
const { categoryOptions } = require('../../config/constants');

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

        const queryParams = new URLSearchParams();
        if (q) queryParams.set('q', q);
        if (category && category !== 'all') queryParams.set('category', category);
        if (!Number.isNaN(minPriceRaw)) queryParams.set('minPrice', String(minPriceRaw));
        if (!Number.isNaN(maxPriceRaw)) queryParams.set('maxPrice', String(maxPriceRaw));
        if (sort) queryParams.set('sort', sort);

        return res.render('products', {
            active: 'products',
            products: productsFromDb,
            page: safePage,
            totalPages,
            totalCount,
            filters: {
                q,
                category: category || 'all',
                minPrice: !Number.isNaN(minPriceRaw) ? minPriceRaw : '',
                maxPrice: !Number.isNaN(maxPriceRaw) ? maxPriceRaw : '',
                sort
            },
            queryString: queryParams.toString(),
            categoryOptions
        });
    } catch (err) {
        console.error('Products fetch error:', err);
        return res.status(500).send('Error loading products.');
    }
}

module.exports = {
    list
};
