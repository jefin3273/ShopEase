import { useParams, useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/20/solid';
import { useState, useEffect } from 'react';
import { getProductById } from '../../services/products';
import trackingClient from '../../services/trackingClient';
import { useCart } from '../../context/CartContext';

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem } = useCart();

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    if (!id) return;
    try {
      const data = await getProductById(id);
      setProduct(data);
      // Track detailed product view once data loaded
      trackingClient.trackCustomEvent('view_product', { productId: data?._id, category: data?.category, price: data?.price });
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-20 sm:h-24"></div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-xl text-gray-600">Loading product...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-20 sm:h-24"></div>
        <div className="flex flex-col items-center justify-center py-20">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Product Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            The product you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const galleryImages = [product.image, ...(product.images || [])].filter(Boolean);
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const highlights = product.highlights || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-20 sm:h-24"></div>
      <div className="bg-white">
        <div className="pt-6">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol role="list" className="mx-auto flex max-w-2xl items-center space-x-2 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
              <li>
                <div className="flex items-center">
                  <button onClick={() => navigate('/')} className="mr-2 text-sm font-medium text-gray-900 hover:text-gray-700">Home</button>
                  <svg fill="currentColor" width={16} height={20} viewBox="0 0 16 20" aria-hidden="true" className="h-5 w-4 text-gray-300"><path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" /></svg>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <button onClick={() => navigate('/products')} className="mr-2 text-sm font-medium text-gray-900 hover:text-gray-700">Products</button>
                  {product.category && (
                    <>
                      <svg fill="currentColor" width={16} height={20} viewBox="0 0 16 20" aria-hidden="true" className="h-5 w-4 text-gray-300"><path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" /></svg>
                      <span className="ml-2 text-sm font-medium text-gray-900">{product.category}</span>
                    </>
                  )}
                </div>
              </li>
            </ol>
          </nav>

          <div className="mx-auto mt-6 max-w-2xl sm:px-6 lg:max-w-7xl lg:px-8">
            {galleryImages.length > 0 ? (
              <div className="lg:grid lg:grid-cols-4 lg:gap-8">
                {galleryImages.length > 1 && (
                  <div className="hidden lg:flex lg:flex-col gap-4">
                    {galleryImages.slice(0, 4).map((img, idx) => (
                      <button key={idx} onClick={() => setSelectedImage(idx)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-orange-500' : 'border-transparent hover:border-gray-300'}`}>
                        <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className={classNames(galleryImages.length > 1 ? 'lg:col-span-3' : 'lg:col-span-4', 'aspect-square rounded-lg overflow-hidden bg-gray-100')}>
                  <img src={galleryImages[selectedImage] || galleryImages[0]} alt={product.title} className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center"><p className="text-gray-500">No image available</p></div>
            )}
          </div>

          <div className="mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-3 lg:grid-rows-[auto_auto_1fr] lg:gap-x-8 lg:px-8 lg:pt-16 lg:pb-24">
            <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{product.title}</h1>
            </div>

            <div className="mt-4 lg:row-span-3 lg:mt-0">
              <h2 className="sr-only">Product information</h2>
              <div className="flex items-center gap-3">
                <p className="text-3xl tracking-tight text-gray-900">${product.price}</p>
                {product.originalPrice && product.originalPrice > product.price && <p className="text-xl text-gray-400 line-through">${product.originalPrice}</p>}
              </div>

              {product.rating > 0 && (
                <div className="mt-6">
                  <h3 className="sr-only">Reviews</h3>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {[0, 1, 2, 3, 4].map((rating) => (<StarIcon key={rating} aria-hidden="true" className={classNames(product.rating > rating ? 'text-yellow-400' : 'text-gray-200', 'size-5 shrink-0')} />))}
                    </div>
                    <p className="sr-only">{product.rating} out of 5 stars</p>
                    <span className="ml-3 text-sm font-medium text-orange-600">{product.reviewCount || 0} reviews</span>
                  </div>
                </div>
              )}

              <form
                className="mt-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  addItem({
                    id: product._id,
                    title: product.title,
                    price: product.price,
                    image: product.image,
                    category: product.category,
                  }, 1);
                  navigate('/cart');
                }}
              >
                {colors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Color</h3>
                    <fieldset aria-label="Choose a color" className="mt-4">
                      <div className="flex items-center gap-x-3">
                        {colors.map((color: any, idx: number) => (
                          <div key={idx} className="flex rounded-full outline -outline-offset-1 outline-black/10">
                            <input
                              defaultValue={color.id}
                              defaultChecked={idx === 0}
                              name="color"
                              type="radio"
                              aria-label={color.name}
                              className={classNames(color.class || 'bg-gray-500', 'size-8 appearance-none rounded-full forced-color-adjust-none checked:outline-2 checked:outline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-3')}
                              onChange={() => trackingClient.trackCustomEvent('select_color', { productId: product._id, color: color.name })}
                            />
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                )}

                {sizes.length > 0 && (
                  <div className="mt-10">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-900">Size</h3></div>
                    <fieldset aria-label="Choose a size" className="mt-4">
                      <div className="grid grid-cols-4 gap-3">
                        {sizes.map((size: any, idx: number) => (
                          <label key={idx} aria-label={size.name} className="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-orange-600 has-checked:bg-orange-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25">
                            <input
                              defaultValue={size.name}
                              name="size"
                              type="radio"
                              disabled={!size.inStock}
                              className="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                              onChange={() => trackingClient.trackCustomEvent('select_size', { productId: product._id, size: size.name })}
                            />
                            <span className="text-sm font-medium text-gray-900 uppercase group-has-checked:text-white">{size.name}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                )}

                {product.stock !== undefined && (
                  <div className="mt-6">
                    <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </p>
                  </div>
                )}

                <button type="submit" disabled={product.stock === 0} className="mt-10 flex w-full items-center justify-center rounded-md border border-transparent bg-orange-500 px-8 py-3 text-base font-medium text-white hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-hidden transition disabled:bg-gray-300 disabled:cursor-not-allowed">
                  {product.stock === 0 ? 'Out of Stock' : 'Add to bag'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trackingClient.trackCustomEvent('begin_checkout', { productId: product._id, price: product.price });
                    addItem({
                      id: product._id,
                      title: product.title,
                      price: product.price,
                      image: product.image,
                      category: product.category,
                    }, 1);
                    navigate('/checkout');
                  }}
                  disabled={product.stock === 0}
                  className="mt-3 flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {product.stock === 0 ? 'Unavailable' : 'Buy Now'}
                </button>
              </form>
            </div>

            <div className="py-10 lg:col-span-2 lg:col-start-1 lg:border-r lg:border-gray-200 lg:pt-6 lg:pr-8 lg:pb-16">
              {product.description && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                  <div className="space-y-6"><p className="text-base text-gray-700">{product.description}</p></div>
                </div>
              )}

              {highlights.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-sm font-medium text-gray-900">Highlights</h3>
                  <div className="mt-4">
                    <ul role="list" className="list-disc space-y-2 pl-4 text-sm">
                      {highlights.map((highlight: string, idx: number) => (<li key={idx} className="text-gray-400"><span className="text-gray-600">{highlight}</span></li>))}
                    </ul>
                  </div>
                </div>
              )}

              {product.details && (
                <div className="mt-10">
                  <h2 className="text-sm font-medium text-gray-900">Details</h2>
                  <div className="mt-4 space-y-6"><p className="text-sm text-gray-600">{product.details}</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
