import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to protect customer routes from admin users
 * Admin users should only access /admin routes
 */
export const useCustomerOnly = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();

    useEffect(() => {
        // If user is admin and trying to access non-admin routes, redirect to admin dashboard
        if (auth.user?.role === 'admin' && !location.pathname.startsWith('/admin')) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [auth.user, location.pathname, navigate]);
};

/**
 * Hook to require authentication for any route
 */
export const useRequireAuth = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();

    useEffect(() => {
        if (!auth.user && !auth.accessToken) {
            // Redirect to login if not authenticated
            navigate('/login', { state: { from: location.pathname } });
        }
    }, [auth.user, auth.accessToken, location.pathname, navigate]);
};
