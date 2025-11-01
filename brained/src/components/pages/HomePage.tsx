import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Banner from './Banner';
import { useEffect, useState } from 'react';
import { getFeatured } from '../../services/products';

function HomePage() {
    const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const data = await getFeatured(5);
                setFeaturedProducts(data);
            } catch (e) {
                console.error('Failed to load featured products', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
            {/* Navbar */}
            <Navbar />

            {/* Spacer for fixed navbar */}
             <div className="h-10 sm:h-4"></div> 

            {/* Banner Section */}
            <Banner />

            {/* Products Section */}
            <section className="w-full bg-gray-50 py-20 sm:py-24 lg:py-28">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    {/* Brand blurb */}
                    <div className="mb-10 text-center">
                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">About ShopEase</h3>
                        <p className="text-base text-gray-600">ShopEase connects customers with carefully curated products from trusted sellers. We focus on simplicity, fast shipping and exceptional customer support.</p>
                    </div>
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                            Featured Products
                        </h2>
                        <p className="text-base sm:text-lg text-gray-600">
                            Browse our selection of quality items
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center">Loading...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {featuredProducts.map((product) => (
                                <div
                                    key={product._id}
                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-transform duration-300 group transform hover:-translate-y-1"
                                >
                                    <div className="relative overflow-hidden bg-gray-100">
                                        <img
                                            src={product.image || 'https://via.placeholder.com/500'}
                                            alt={product.title}
                                            className="w-full h-56 sm:h-64 md:h-72 object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-5 sm:p-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="text-sm text-gray-500">{product.category}</div>
                                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{product.title}</h3>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">Price</div>
                                                <div className="text-2xl font-bold text-gray-900">${product.price}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 mt-4">
                                            <button className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-lg text-sm sm:text-base font-medium hover:opacity-95 transition-shadow shadow-md">Add to Cart</button>
                                            <button className="text-sm text-gray-600 hover:text-gray-900">View</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Special Offers Section */}
            <section className="w-full bg-white py-20 sm:py-24 lg:py-28">
                <div className="w-full px-4 sm:px-6 lg:px-8">
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
        </div>
    );
}

export default HomePage;
