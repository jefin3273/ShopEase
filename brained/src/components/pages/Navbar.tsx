import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShoppingBag } from "lucide-react";

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

  return (
    <nav className="fixed top-2 sm:top-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg z-50 rounded-full w-[95%] sm:w-[90%] max-w-6xl">
      <div className="px-4 sm:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              <span className="text-lg sm:text-xl font-bold text-gray-900">
                ShopEase
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-gray-800 hover:text-orange-500 px-4 py-2 text-sm font-medium transition rounded-full ${
                    activeLink === link.href
                      ? "font-bold text-orange-500 bg-orange-50"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/login" className="ml-2">
                <button className="text-black bg-orange-500 hover:bg-orange-600 px-6 py-2 rounded-full text-sm font-medium transition">
                  Login
                </button>
              </Link>
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
                className={`block px-3 py-2.5 rounded-lg text-base font-medium transition ${
                  activeLink === link.href
                    ? "font-bold text-orange-500 bg-orange-50"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
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
