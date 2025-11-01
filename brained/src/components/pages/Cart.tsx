import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Product {
  id: number;
  name: string;
  href: string;
  color: string;
  price: string;
  quantity: number;
  imageSrc: string;
  imageAlt: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "Throwback Hip Bag",
    href: "#",
    color: "Salmon",
    price: "$90.00",
    quantity: 1,
    imageSrc:
      "https://tailwindcss.com/plus-assets/img/ecommerce-images/shopping-cart-page-04-product-01.jpg",
    imageAlt:
      "Salmon orange fabric pouch with match zipper, gray zipper pull, and adjustable hip belt.",
  },
  {
    id: 2,
    name: "Medium Stuff Satchel",
    href: "#",
    color: "Blue",
    price: "$32.00",
    quantity: 1,
    imageSrc:
      "https://tailwindcss.com/plus-assets/img/ecommerce-images/shopping-cart-page-04-product-02.jpg",
    imageAlt:
      "Front of satchel with blue canvas body, black straps and handle, drawstring top, and front zipper pouch.",
  },
  {
    id: 3,
    name: "Zip Tote Basket",
    href: "#",
    color: "White and black",
    price: "$140.00",
    quantity: 1,
    imageSrc:
      "https://tailwindcss.com/plus-assets/img/ecommerce-images/shopping-cart-page-04-product-03.jpg",
    imageAlt:
      "Front of zip tote bag with white canvas, black canvas straps and handle, and black zipper pulls.",
  },
];

export default function Cart() {
  const [open, setOpen] = useState(false);

  const subtotal = products.reduce((acc, p) => {
    const price = Number(p.price.replace(/[^0-9.-]+/g, ""));
    return acc + price * p.quantity;
  }, 0);

  return (
    <div>
      {/* 🛒 Cart Button */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800"
      >
        View Cart
      </button>

      {/* 🧾 Cart Drawer */}
      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Dialog.Panel className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out translate-x-0 bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-6 sm:px-6 border-b">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Shopping Cart
                  </Dialog.Title>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Products */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                  <ul className="-my-6 divide-y divide-gray-200">
                    {products.map((product) => (
                      <li key={product.id} className="flex py-6">
                        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                          <img
                            src={product.imageSrc}
                            alt={product.imageAlt}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="ml-4 flex flex-1 flex-col">
                          <div className="flex justify-between text-base font-medium text-gray-900">
                            <h3>
                              <a href={product.href}>{product.name}</a>
                            </h3>
                            <p className="ml-4">{product.price}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{product.color}</p>

                          <div className="flex flex-1 items-end justify-between text-sm">
                            <p className="text-gray-500">Qty {product.quantity}</p>
                            <button
                              type="button"
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>${subtotal.toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Shipping and taxes calculated at checkout.
                  </p>
                  <div className="mt-6">
                    <button className="w-full flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700">
                      Checkout
                    </button>
                  </div>
                  <div className="mt-6 flex justify-center text-sm text-gray-500">
                    <p>
                      or{" "}
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Continue Shopping →
                      </button>
                    </p>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
