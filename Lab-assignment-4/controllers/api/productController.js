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

        return res.json({
            ok: true,
            page: result.page,
            totalPages: result.totalPages,
            totalCount: result.totalCount,
            products: result.products,
            filters: result.filters
        });
    } catch (err) {
        console.error('API products fetch error:', err);
        return res.status(500).json({ ok: false, message: 'Error loading products.' });
    }
}

async function getById(req, res) {
    try {
        const result = await productService.getProductById(req.params.id);
        if (!result.ok) {
            const message = result.reason === 'invalid_id' ? 'Invalid product id.' : 'Product not found.';
            return res.status(result.status).json({ ok: false, message });
        }
        return res.json({ ok: true, product: result.product });
    } catch (err) {
        console.error('API product detail error:', err);
        return res.status(500).json({ ok: false, message: 'Error loading product.' });
    }
}

module.exports = {
    list,
    getById
};
