import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProducts } from '../../services/products';
import trackingClient from '../../services/trackingClient';
import { useCart } from '../../context/CartContext';

interface Product {
  _id: string;
  title: string;
  description?: string;
  price: number;
  image: string;
  category?: string;
  rating?: number;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function SearchResults() {
  const query = useQuery();
  const navigate = useNavigate();
  const q = (query.get('q') || '').trim();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<string>('relevance');

  const { addItem } = useCart();

  useEffect(() => {
    (async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (e) {
        console.error('Failed to load products', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (q) {
      trackingClient.trackCustomEvent('search', { query: q });
    }
  }, [q]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let res = products.filter((p) => {
      const hay = `${p.title} ${p.description || ''} ${p.category || ''}`.toLowerCase();
      const needle = q.toLowerCase();
      return !needle || hay.includes(needle);
    });
    if (category !== 'all') {
      res = res.filter((p) => (p.category || '') === category);
    }
    switch (sort) {
      case 'price_asc':
        res = res.slice().sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        res = res.slice().sort((a, b) => b.price - a.price);
        break;
      case 'rating_desc':
        res = res.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break; // relevance = default order
    }
    return res;
  }, [products, q, category, sort]);

  const onFilterChange = (type: string, value: string) => {
    trackingClient.trackCustomEvent('filter_change', { type, value, context: 'search_results' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-20 sm:h-24" />
        <div className="flex items-center justify-center py-20">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-20 sm:h-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Search results</h1>
            <p className="text-gray-600 mt-1">
              Query: <span className="font-medium">{q || 'All'}</span> • {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); onFilterChange('category', e.target.value); }}
              className="rounded-md border-gray-300 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); onFilterChange('sort', e.target.value); }}
              className="rounded-md border-gray-300 text-sm"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Rating</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">No products match your search.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
            {filtered.map((p) => (
              <div
                key={p._id}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => {
                  trackingClient.trackCustomEvent('product_card_click', { productId: p._id, page: 'search' });
                  navigate(`/product/${p._id}`);
                }}
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img src={p.image || 'https://via.placeholder.com/400'} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  {p.category && <p className="text-xs font-medium text-orange-600 mb-1">{p.category}</p>}
                  <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">{p.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-gray-900">${p.price}</span>
                    <button
                      className="px-3 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({ id: p._id, title: p.title, price: p.price, image: p.image, category: p.category }, 1);
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
