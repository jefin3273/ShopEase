import { ShoppingBag } from 'lucide-react';
import Navbar from './Navbar';
import Banner from './Banner';

function HomePage() {
  // sample products
  const products = [
    {
      id: 1,
      name: 'Classic Leather Jacket',
      price: 189,
      category: 'Fashion',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop'
    },
    {
      id: 2,
      name: 'Wireless Headphones',
      price: 129,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop'
    },
    {
      id: 3,
      name: 'Running Shoes',
      price: 95,
      category: 'Sports',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop'
    },
    {
      id: 4,
      name: 'Smart Watch',
      price: 249,
      category: 'Electronics',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'
    },
    {
      id: 5,
      name: 'Laptop Backpack',
      price: 59,
      category: 'Accessories',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop'
    },
    {
      id: 6,
      name: 'Coffee Maker',
      price: 79,
      category: 'Home',
      image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&h=500&fit=crop'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-20 sm:h-24"></div>

      {/* Banner Section */}
      <Banner />

      {/* Products Section */}
      <section className="w-full bg-gray-50 py-20 sm:py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Featured Products
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Browse our selection of quality items
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="relative overflow-hidden bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-56 sm:h-64 md:h-72 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 sm:p-6">
                  <div className="text-sm text-gray-500 mb-2">{product.category}</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                      ${product.price}
                    </span>
                    <button className="px-4 sm:px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-orange-600 transition whitespace-nowrap shadow-md hover:shadow-lg">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Special Offers Section */}
      <section className="w-full bg-white py-20 sm:py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Special Offers
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Don't miss out on these deals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="relative bg-gray-800 text-white rounded-2xl p-8 sm:p-10 lg:p-12 overflow-hidden min-h-[280px] sm:min-h-[320px] flex items-center">
              <div className="absolute inset-0 opacity-20">
                <img
                  src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=400&fit=crop"
                  alt="Offer background"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10">
                <div className="text-sm font-medium text-gray-300 mb-3">Limited Time</div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                  New Customer Discount
                </h3>
                <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                  Get 20% off on your first purchase. Use code WELCOME20 at checkout.
                </p>
                <button className="px-6 sm:px-7 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition text-base sm:text-lg shadow-lg hover:shadow-xl">
                  Shop Now
                </button>
              </div>
            </div>

            <div className="relative bg-gray-100 rounded-2xl p-8 sm:p-10 lg:p-12 overflow-hidden min-h-[280px] sm:min-h-[320px] flex items-center">
              <div className="absolute inset-0 opacity-30">
                <img
                  src="https://images.unsplash.com/photo-1558769132-cb1aea1f1d36?w=800&h=400&fit=crop"
                  alt="Offer background"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10">
                <div className="text-sm font-medium text-gray-600 mb-3">This Week</div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Free Shipping
                </h3>
                <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed">
                  Free shipping on all orders over $50. No code needed, automatically applied.
                </p>
                <button className="px-6 sm:px-7 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition text-base sm:text-lg shadow-lg hover:shadow-xl">
                  Browse Products
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
            <div>
              <h4 className="font-semibold text-white mb-4 text-base sm:text-lg">Shop</h4>
              <ul className="space-y-2.5 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition">All Products</a></li>
                <li><a href="#" className="hover:text-white transition">New Arrivals</a></li>
                <li><a href="#" className="hover:text-white transition">Best Sellers</a></li>
                <li><a href="#" className="hover:text-white transition">Sale</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-base sm:text-lg">Company</h4>
              <ul className="space-y-2.5 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-base sm:text-lg">Support</h4>
              <ul className="space-y-2.5 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Shipping</a></li>
                <li><a href="#" className="hover:text-white transition">Returns</a></li>
                <li><a href="#" className="hover:text-white transition">Track Order</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-base sm:text-lg">Legal</h4>
              <ul className="space-y-2.5 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-6 w-6 text-orange-500" />
                <span className="text-lg sm:text-xl font-semibold text-white">ShopEase</span>
              </div>
              <p className="text-sm sm:text-base text-center">&copy; 2025 ShopEase. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
