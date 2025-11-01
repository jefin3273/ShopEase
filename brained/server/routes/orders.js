const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const { authenticate } = require('../controllers/authController');

// All order routes require authentication
router.use(authenticate);

// Create new order
router.post('/', ordersController.createOrder);

// Get user's orders
router.get('/my-orders', ordersController.getUserOrders);

// Get order by ID
router.get('/:id', ordersController.getOrderById);

// Get all orders (admin only)
router.get('/admin/all', ordersController.getAllOrders);

// Update order status (admin only)
router.patch('/:id/status', ordersController.updateOrderStatus);

module.exports = router;
