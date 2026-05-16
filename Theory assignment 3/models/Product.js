const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        brand: {
            type: String,
            default: ''
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        mrp: {
            type: Number,
            default: 0,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        category: {
            type: String,
            required: true,
            enum: ['men', 'women', 'kids']
        },
        rating: {
            type: Number,
            required: true,
            min: 0,
            max: 5
        },
        ratingCount: {
            type: String,
            default: '0'
        },
        stock: {
            type: Number,
            required: true,
            min: 0
        },
        image: {
            type: Number,
            required: true,
            min: 1
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
