const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    image: String,
    category: String,
    color: String,
    size: String,
});

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // Each user has one cart
    },
    items: [cartItemSchema],
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Update the updatedAt timestamp on save
cartSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Virtual for cart total
cartSchema.virtual('total').get(function () {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// Virtual for total items count
cartSchema.virtual('itemCount').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Ensure virtuals are included in JSON
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
