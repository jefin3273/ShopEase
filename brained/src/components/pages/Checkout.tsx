import React, { useState } from 'react';
import trackingClient from '../../services/trackingClient';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    country: '',
    zip: '',
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
    // Do not send sensitive info in tracking
    trackingClient.trackCustomEvent('purchase', {
      total: 199.99,
      currency: 'USD',
      items: 1,
      source: 'checkout_page',
    });
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-20 sm:h-24" />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
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
              {loading ? 'Processing...' : 'Pay $199.99'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
