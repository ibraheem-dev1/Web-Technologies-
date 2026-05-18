const mongoose = require('mongoose');
const Product = require('../models/Product');

function buildProductFilter({ q, category, minPriceRaw, maxPriceRaw }) {
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
    return filter;
}

function resolveSort(sort) {
    const sortMap = {
        price_asc: { price: 1 },
        price_desc: { price: -1 },
        rating_desc: { rating: -1 },
        newest: { createdAt: -1 }
    };
    return sortMap[sort] || sortMap.newest;
}

async function listProducts({ page, q, category, minPriceRaw, maxPriceRaw, sort, limit = 8 }) {
    const safePageInput = Math.max(parseInt(page, 10) || 1, 1);
    const filter = buildProductFilter({ q, category, minPriceRaw, maxPriceRaw });
    const sortBy = resolveSort(sort);

    const totalCount = await Product.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    const safePage = Math.min(safePageInput, totalPages);

    const products = await Product.find(filter)
        .sort(sortBy)
        .skip((safePage - 1) * limit)
        .limit(limit)
        .lean();

    return {
        products,
        page: safePage,
        totalPages,
        totalCount,
        filters: {
            q,
            category: category || 'all',
            minPrice: !Number.isNaN(minPriceRaw) ? minPriceRaw : '',
            maxPrice: !Number.isNaN(maxPriceRaw) ? maxPriceRaw : '',
            sort
        }
    };
}

async function getProductById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return { ok: false, status: 400, reason: 'invalid_id' };
    }

    const product = await Product.findById(id).lean();
    if (!product) {
        return { ok: false, status: 404, reason: 'not_found' };
    }

    return { ok: true, product };
}

function buildProductPayload(body, imageUrl, requireImage) {
    const name = (body.name || '').trim();
    const brand = (body.brand || '').trim();
    const category = (body.category || '').trim().toLowerCase();
    const ratingCount = (body.ratingCount || '').trim() || '0';

    const price = Number(body.price);
    const mrp = Number(body.mrp);
    const discount = Number(body.discount);
    const rating = Number(body.rating);
    const stock = Number(body.stock);

    const missingRequired = !name || !category || Number.isNaN(price) || Number.isNaN(rating) || Number.isNaN(stock);
    if (missingRequired || (requireImage && !imageUrl)) {
        return {
            ok: false,
            reason: 'missing_fields',
            formData: { ...body }
        };
    }

    return {
        ok: true,
        payload: {
            name,
            brand,
            price,
            mrp: Number.isNaN(mrp) ? 0 : mrp,
            discount: Number.isNaN(discount) ? 0 : discount,
            category,
            rating,
            ratingCount,
            stock
        }
    };
}

function resolveImageUrl(body, file) {
    const imageUrlInput = (body.imageUrl || '').trim();
    const imageUrl = file ? `/uploads/${file.filename}` : imageUrlInput;
    return { imageUrl, imageUrlInput };
}

function buildFormData(body, imageUrlInput, id) {
    const formData = { ...body, imageUrl: imageUrlInput };
    if (id) {
        formData._id = id;
    }
    return formData;
}

async function createProductFromForm(body, file) {
    const { imageUrl, imageUrlInput } = resolveImageUrl(body, file);
    const result = buildProductPayload(body, imageUrl, true);
    if (!result.ok) {
        return { ok: false, reason: result.reason, formData: buildFormData(body, imageUrlInput) };
    }

    const product = await Product.create({ ...result.payload, imageUrl });
    return { ok: true, product };
}

async function updateProductFromForm(id, body, file) {
    const { imageUrl, imageUrlInput } = resolveImageUrl(body, file);
    const result = buildProductPayload(body, imageUrl, false);
    if (!result.ok) {
        return { ok: false, reason: result.reason, formData: buildFormData(body, imageUrlInput, id) };
    }

    const update = { ...result.payload };
    if (imageUrl) {
        update.imageUrl = imageUrl;
    }

    await Product.findByIdAndUpdate(id, update);
    return { ok: true, name: result.payload.name };
}

async function createProduct(body, imageUrl) {
    const result = buildProductPayload(body, imageUrl, true);
    if (!result.ok) {
        return result;
    }

    const payload = { ...result.payload, imageUrl };
    const product = await Product.create(payload);
    return { ok: true, product };
}

async function updateProduct(id, body, imageUrl) {
    const result = buildProductPayload(body, imageUrl, false);
    if (!result.ok) {
        return result;
    }

    const update = { ...result.payload };
    if (imageUrl) {
        update.imageUrl = imageUrl;
    }

    await Product.findByIdAndUpdate(id, update);
    return { ok: true };
}

async function deleteProduct(id) {
    const deleted = await Product.findByIdAndDelete(id);
    return deleted;
}

async function listAllProducts() {
    return Product.find({}).sort({ createdAt: -1 }).lean();
}

module.exports = {
    listProducts,
    getProductById,
    createProduct,
    createProductFromForm,
    updateProduct,
    updateProductFromForm,
    deleteProduct,
    listAllProducts
};
