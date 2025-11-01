import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProducts } from '../../services/products';
import trackingClient from '../../services/trackingClient';
import { useCart } from '../../context/CartContext';

interface Product {
  _id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  colors?: any[];
  stock?: number;
}

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    loadProducts();
  }, []);

  // Parse category filter from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    setCategoryFilter(category);
    if (category) {
      trackingClient.trackCustomEvent('category_view', { category });
    }
  }, [location.search]);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
    const willBeFav = !favorites.includes(productId);
    trackingClient.trackCustomEvent('favorite_toggled', { productId, favorited: willBeFav });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= Math.floor(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : star - 0.5 <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 fill-gray-300'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="h-20 sm:h-14"></div>
        <div className="flex items-center justify-center py-20">
          <div className="text-xl text-gray-600">Loading products...</div>
        </div>
      </div>
    );
  }

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    return products.filter(p => (p.category || '').toLowerCase() === categoryFilter.toLowerCase());
  }, [products, categoryFilter]);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="h-20 sm:h-8 "></div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            {categoryFilter ? `${categoryFilter}` : 'All Products'}
          </h2>
          <p className="text-lg text-gray-600">
            Discover our curated selection of quality products
          </p>
          {categoryFilter && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">Filtered</span>
              <button
                className="underline hover:text-gray-800"
                onClick={() => {
                  setCategoryFilter(null);
                  navigate('/products');
                  trackingClient.trackCustomEvent('category_clear', {});
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {(filteredProducts.length === 0) ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600">No products available yet.</p>
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => {
                    trackingClient.trackCustomEvent('product_card_click', { productId: product._id, category: product.category });
                    navigate(`/product/${product._id}`);
                  }}
                >
                  {/* Badge */}
                  {product.badge && (
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          product.badge === 'Sale'
                            ? 'bg-red-500 text-white'
                            : product.badge === 'New'
                            ? 'bg-green-500 text-white'
                            : product.badge === 'Best Seller'
                            ? 'bg-orange-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {product.badge}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product._id);
                      }}
                      className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                        favorites.includes(product._id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/90 text-gray-700 hover:bg-white'
                      }`}
                      aria-label="Add to favorites"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.includes(product._id) ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        trackingClient.trackCustomEvent('quick_view', { productId: product._id });
                        navigate(`/product/${product._id}`);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:bg-white transition-all"
                      aria-label="Quick view"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.image || 'https://via.placeholder.com/400'}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    {/* Category */}
                    {product.category && (
                      <p className="text-xs font-medium text-orange-600 mb-1">
                        {product.category}
                      </p>
                    )}

                    {/* Name */}
                    <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                      {product.title}
                    </h3>

                    {/* Color */}
                    {product.colors && product.colors.length > 0 && (
                      <p className="text-sm text-gray-500 mb-2">
                        {product.colors[0]?.name || 'Multiple colors'}
                      </p>
                    )}

                    {/* Rating */}
                    {(product.rating || 0) > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        {renderStars(product.rating || 0)}
                        <span className="text-xs text-gray-500">
                          ({product.reviewCount || 0})
                        </span>
                      </div>
                    )}

                    {/* Price and Add to Cart */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          ${product.price}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-gray-400 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem({
                            id: product._id,
                            title: product.title,
                            price: product.price,
                            image: product.image,
                            category: product.category,
                          }, 1);
                          navigate('/cart');
                        }}
                        className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all hover:scale-105"
                        aria-label="Add to cart"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductList;