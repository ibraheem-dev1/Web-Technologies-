const { categoryOptions } = require('../../shared/constants');
const productService = require('../../services/productService');

async function list(req, res) {
    const limit = 8;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const q = (req.query.q || '').trim();
    const category = (req.query.category || 'all').trim().toLowerCase();
    const minPriceRaw = parseFloat(req.query.minPrice);
    const maxPriceRaw = parseFloat(req.query.maxPrice);
    const sort = (req.query.sort || 'newest').trim();

    try {
        const result = await productService.listProducts({
            page,
            q,
            category,
            minPriceRaw,
            maxPriceRaw,
            sort,
            limit
        });

        const queryParams = new URLSearchParams();
        if (q) queryParams.set('q', q);
        if (category && category !== 'all') queryParams.set('category', category);
        if (!Number.isNaN(minPriceRaw)) queryParams.set('minPrice', String(minPriceRaw));
        if (!Number.isNaN(maxPriceRaw)) queryParams.set('maxPrice', String(maxPriceRaw));
        if (sort) queryParams.set('sort', sort);

        return res.render('products', {
            active: 'products',
            products: result.products,
            page: result.page,
            totalPages: result.totalPages,
            totalCount: result.totalCount,
            filters: result.filters,
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
