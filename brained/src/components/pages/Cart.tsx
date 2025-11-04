import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, ArrowLeft, Tag, Lock } from "lucide-react";
import trackingClient from "../../services/trackingClient";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useCustomerOnly } from "../../hooks/useRouteProtection";
import { useEffect } from "react";

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clear, subtotal, totalItems } = useCart();

  // Protect this route - admins should not access cart
  useCustomerOnly();

  let auth: any = null;
  try { auth = useAuth(); } catch (e) { auth = null; }
  const isLoggedIn = !!(auth && auth.user);

  useEffect(() => {
    trackingClient.trackCustomEvent('page_view', { page: '/cart' });
  }, []);

  const shipping = subtotal > 0 ? (subtotal >= 100 ? 0 : 10) : 0;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const handleQuantityChange = (id: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeItem(id);
    } else {
      updateQuantity(id, newQty);
    }
  };

  const handleCheckout = () => {
    if (!isLoggedIn) {
      // Not logged in - redirect to login with return URL to checkout
      trackingClient.trackCustomEvent('checkout_login_required', {
        total,
        itemCount: totalItems
      });
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      // Logged in - proceed to checkout
      trackingClient.trackCustomEvent('begin_checkout', {
        source: 'cart_page',
        total,
        itemCount: totalItems
      });
      navigate('/checkout');
    }
  };

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
                <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Your cart is empty
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-8 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <ShoppingBag className="w-5 h-5" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Shopping Cart
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your cart?')) {
                  clear();
                  trackingClient.trackCustomEvent('clear_cart', { itemCount: totalItems });
                }
              }}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cart
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6"
              >
                <div className="flex gap-4 sm:gap-6">
                  {/* Product Image */}
                  <div className="shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img
                        src={item.image || 'https://via.placeholder.com/200'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h3>
                        {item.category && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {item.category}
                          </p>
                        )}
                        {(item.color || item.size) && (
                          <div className="flex gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {item.color && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Color:</span> {item.color}
                              </span>
                            )}
                            {item.size && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Size:</span> {item.size}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity Controls & Remove */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Quantity:
                        </span>
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-semibold text-gray-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile Clear Cart Button */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your cart?')) {
                  clear();
                  trackingClient.trackCustomEvent('clear_cart', { itemCount: totalItems });
                }
              }}
              className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Subtotal ({totalItems} items)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {shipping === 0 ? (
                      <span className="text-green-600 dark:text-green-400">FREE</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax (8%)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${tax.toFixed(2)}
                  </span>
                </div>

                {subtotal > 0 && subtotal < 100 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      💡 Add <span className="font-semibold">${(100 - subtotal).toFixed(2)}</span> more for FREE shipping!
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-4 px-6 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {!isLoggedIn && <Lock className="w-5 h-5" />}
                {isLoggedIn ? 'Proceed to Checkout' : 'Login to Checkout'}
              </button>

              {!isLoggedIn && (
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">
                  You need to login or create an account to complete your purchase
                </p>
              )}

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                Secure checkout powered by Stripe
              </p>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Verified</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span>Easy Returns</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
