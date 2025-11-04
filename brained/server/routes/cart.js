const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../controllers/authController');

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', cartController.getCart);

// Add item to cart
router.post('/add', cartController.addToCart);

// Update cart item quantity
router.put('/update', cartController.updateCartItem);

// Remove item from cart
router.delete('/remove/:productId', cartController.removeFromCart);

// Clear cart
router.delete('/clear', cartController.clearCart);

// Sync cart from localStorage
router.post('/sync', cartController.syncCart);

module.exports = router;
