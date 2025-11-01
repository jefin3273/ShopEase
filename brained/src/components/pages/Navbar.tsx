import React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import { Menu, X, ShoppingBag } from "lucide-react";
import trackingClient from '../../services/trackingClient';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const location = useLocation();
  const activeLink = location.pathname;

  const toggleMenu = (): void => setIsMenuOpen((prev) => !prev);

  const links = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/categories", label: "Categories" },
    { href: "/about", label: "About Us" },
  ];

  const [query, setQuery] = useState("");
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    trackingClient.trackCustomEvent('search', { query: q, source: 'navbar' });
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  };

  let auth: any = null;
  try { auth = useAuth(); } catch (e) { auth = null; }

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md border border-gray-100 z-50 rounded-2xl w-[60%]">
      <div className="px-4 sm:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-linear-to-br from-orange-400 to-pink-500 rounded-md flex items-center justify-center shadow">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                ShopEase
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-gray-700 hover:text-orange-500 px-3 py-2 text-sm font-medium transition rounded-md ${activeLink === link.href
                  ? "font-semibold text-orange-500 bg-orange-50"
                  : ""
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <form onSubmit={onSearchSubmit} className="ml-2">
              <input
                type="search"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Search products"
              />
            </form>
            <div className="flex items-center gap-3">
              {auth && auth.user ? (
                <>
                  {auth.user.role === 'admin' && (
                    <Link to="/admin/products">
                      <button className="text-sm bg-white border border-gray-200 px-3 py-2 rounded-md text-gray-800 hover:shadow">Admin</button>
                    </Link>
                  )}
                  <Link to="/profile" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-semibold">{(auth.user.name || auth.user.email || 'U').charAt(0).toUpperCase()}</div>
                    <span className="text-sm font-medium text-gray-800">{auth.user.name || auth.user.email}</span>
                  </Link>
                  <button onClick={async () => { await auth.logout(); }} className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-md hover:bg-gray-200">Logout</button>
                </>
              ) : (
                <Link to="/login">
                  <button className="text-sm bg-linear-to-r from-orange-400 to-pink-500 text-white px-4 py-2 rounded-md shadow">Sign in</button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-full text-gray-800 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white rounded-b-3xl shadow-lg">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`block px-3 py-2.5 rounded-lg text-base font-medium transition ${activeLink === link.href
                  ? "font-bold text-orange-500 bg-orange-50"
                  : "text-gray-800 hover:bg-gray-100"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <form onSubmit={(e) => { onSearchSubmit(e); setIsMenuOpen(false); }} className="pt-2 pb-1">
              <input
                type="search"
                placeholder="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Search products"
              />
            </form>
            <Link to="/login" onClick={() => setIsMenuOpen(false)}>
              <button className="w-full mt-2 text-white bg-orange-500 hover:bg-orange-600 px-4 py-2.5 rounded-full text-base font-medium transition">
                Login
              </button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
