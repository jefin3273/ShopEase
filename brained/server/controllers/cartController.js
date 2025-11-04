const Cart = require('../models/Cart');

// Get user's cart
exports.getCart = async (req, res) => {
    try {
        // Don't allow admin to access cart
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin users cannot access cart',
            });
        }

        const userId = req.user._id;

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            // Create empty cart if doesn't exist
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }

        res.json({
            success: true,
            cart,
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart',
            error: error.message,
        });
    }
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        // Don't allow admin to access cart
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin users cannot access cart',
            });
        }

        const userId = req.user._id;
        const { productId, title, price, image, category, quantity = 1, color, size } = req.body;

        if (!productId || !title || !price) {
            return res.status(400).json({
                success: false,
                message: 'productId, title, and price are required',
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Check if item already exists
        const existingItemIndex = cart.items.findIndex(
            item => item.productId === productId &&
                item.color === color &&
                item.size === size
        );

        if (existingItemIndex > -1) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                productId,
                title,
                price,
                quantity,
                image,
                category,
                color,
                size,
            });
        }

        await cart.save();

        res.json({
            success: true,
            cart,
            message: 'Item added to cart',
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to cart',
            error: error.message,
        });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        // Don't allow admin to access cart
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin users cannot access cart',
            });
        }

        const userId = req.user._id;
        const { productId, quantity } = req.body;

        if (!productId || quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'productId and quantity are required',
            });
        }

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        const itemIndex = cart.items.findIndex(item => item.productId === productId);

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart',
            });
        }

        if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();

        res.json({
            success: true,
            cart,
            message: 'Cart updated',
        });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update cart',
            error: error.message,
        });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        // Don't allow admin to access cart
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin users cannot access cart',
            });
        }

        const userId = req.user._id;
        const { productId } = req.params;

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        cart.items = cart.items.filter(item => item.productId !== productId);

        await cart.save();

        res.json({
            success: true,
            cart,
            message: 'Item removed from cart',
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from cart',
            error: error.message,
        });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        // Don't allow admin to access cart
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin users cannot access cart',
            });
        }

        const userId = req.user._id;

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        cart.items = [];
        await cart.save();

        res.json({
            success: true,
            cart,
            message: 'Cart cleared',
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
            error: error.message,
        });
    }
};

// Sync cart from localStorage (for migration from localStorage to DB)
exports.syncCart = async (req, res) => {
    try {
        // Don't allow admin to access cart
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin users cannot access cart',
            });
        }

        const userId = req.user._id;
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'items array is required',
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Merge items from localStorage with existing cart
        for (const localItem of items) {
            const existingItemIndex = cart.items.findIndex(
                item => item.productId === localItem.id &&
                    item.color === localItem.color &&
                    item.size === localItem.size
            );

            if (existingItemIndex > -1) {
                // Update quantity (take max of both)
                cart.items[existingItemIndex].quantity = Math.max(
                    cart.items[existingItemIndex].quantity,
                    localItem.quantity
                );
            } else {
                // Add new item
                cart.items.push({
                    productId: localItem.id,
                    title: localItem.title,
                    price: localItem.price,
                    quantity: localItem.quantity,
                    image: localItem.image,
                    category: localItem.category,
                    color: localItem.color,
                    size: localItem.size,
                });
            }
        }

        await cart.save();

        res.json({
            success: true,
            cart,
            message: 'Cart synced successfully',
        });
    } catch (error) {
        console.error('Error syncing cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync cart',
            error: error.message,
        });
    }
};
