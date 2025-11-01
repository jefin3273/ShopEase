import { Routes, Route } from "react-router-dom";
import HomePage from "./components/pages/HomePage";
import LoginPage from "./login/page";
import ProductDetail from "./components/pages/ProductDetail";
import AboutPage from "./components/pages/AboutPage";
import "./App.css";
import AdminLayout from "./pages/Admin/Layout";
import RequireAdmin from "./components/RequireAdmin";
import AdminProducts from "./pages/Admin/Products";
import Profile from "./pages/Profile";
import Navbar from "./components/pages/Navbar";
import ProductList from "./components/pages/ProductList";
import Category from "./components/pages/Categories";
import Cart from "./components/pages/Cart";

function App() {
  return (
    <>
      {/* Navbar should appear only once */}
      <Navbar />

      {/* Add padding to push content below navbar */}
      <div className="pt-20">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/categories" element={<Category />} />
          <Route path="/cart" element={<Cart/>} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route path="products" element={<AdminProducts />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
