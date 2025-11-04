import React, { useState, useEffect } from 'react';
import analyticsManager from '../../services/AnalyticsManager';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useCustomerOnly } from '../../hooks/useRouteProtection';
import axios from 'axios';

// Resolve API base from env: prefer VITE_API_BASE (docs/production), then VITE_API_URL (legacy), then localhost
const API_BASE = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clear, subtotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Protect this route - admins should not access checkout
  useCustomerOnly();

  let auth: any = null;
  try { auth = useAuth(); } catch (e) { auth = null; }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth || !auth.user) {
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [auth, navigate]);

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const shipping = subtotal > 0 ? (subtotal >= 100 ? 0 : 10) : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    country: '',
    zip: '',
    phone: '',
    cardName: '',
    cardNumber: '',
    exp: '',
    cvc: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Track checkout initiation
    analyticsManager.trackCustomEvent('begin_checkout', {
      itemCount: items.length,
      subtotal,
      total,
    });

    try {
      const token = localStorage.getItem('token');

      // Create order in backend
      const response = await axios.post(
        `${API_BASE}/api/orders`,
        {
          items: items.map(item => ({
            productId: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            category: item.category,
            color: item.color,
            size: item.size,
          })),
          shippingInfo: {
            name: form.name || 'Guest User',
            email: form.email || auth?.user?.email || 'guest@example.com',
            address: form.address || 'Not provided',
            city: form.city || 'Not provided',
            country: form.country || 'Not provided',
            zip: form.zip || 'N/A',
            phone: form.phone || '',
          },
          paymentInfo: {
            cardName: 'Online Payment',
            cardLastFour: '****',
          },
          pricing: {
            subtotal,
            shipping,
            tax,
            total,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Track purchase event
      analyticsManager.trackCustomEvent('purchase', {
        orderNumber: response.data.order.orderNumber,
        total,
        currency: 'USD',
        itemCount: items.length,
        items: items.map(item => ({
          productId: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        })),
      });

      // Clear cart
      clear();

      // Navigate to success page with order data
      navigate('/order-success', {
        state: {
          order: response.data.order,
        },
      });
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.message || 'Failed to process order. Please try again.');
      analyticsManager.trackCustomEvent('checkout_error', {
        error: err.message,
        errorCode: err.response?.status,
        total,
        itemCount: items.length,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-20 sm:h-24" />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow">
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-800">Shipping Information</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input name="address" value={form.address} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input name="city" value={form.city} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <input name="country" value={form.country} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ZIP</label>
            <input name="zip" value={form.zip} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>

          <div className="md:col-span-2 pt-4">
            <h2 className="text-lg font-semibold text-gray-800">Payment</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name on Card</label>
            <input name="cardName" value={form.cardName} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Card Number</label>
            <input name="cardNumber" value={form.cardNumber} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry</label>
            <input name="exp" value={form.exp} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CVC</label>
            <input name="cvc" value={form.cvc} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500" required />
          </div>

          <div className="md:col-span-2">
            <button type="submit" disabled={loading} className="w-full rounded-md bg-orange-500 text-white py-3 font-semibold hover:bg-orange-600 transition disabled:bg-gray-300">
              {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
