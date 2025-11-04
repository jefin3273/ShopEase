import React, { createContext, useContext, useEffect, useState } from 'react';
import analyticsManager from '../services/AnalyticsManager';
import { useAuth } from './AuthContext';

interface TrackingContextType {
  trackingEnabled: boolean;
  sessionId: string | null;
  isTracking: boolean;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    // Check if tracking is globally enabled by admin
    const enabled = localStorage.getItem('tracking_enabled') !== 'false';
    setTrackingEnabled(enabled);

    // Check if user has opted out
    const hasOptedOut = localStorage.getItem('analytics_opt_out') === 'true';
    
    // Don't track admin users
    const isAdmin = auth?.user?.role === 'admin';

    if (enabled && !hasOptedOut && !isAdmin) {
      setIsTracking(true);
      setSessionId(analyticsManager.getSessionId());

      // If user is logged in and not admin, identify them
      if (auth?.user) {
        analyticsManager.identify(auth.user.id, {
          email: auth.user.email,
          name: auth.user.name,
          role: auth.user.role || 'customer',
        });
      }
    } else {
      setIsTracking(false);
      analyticsManager.destroy();
    }

    // Listen for changes to tracking_enabled
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tracking_enabled') {
        const newEnabled = e.newValue !== 'false';
        setTrackingEnabled(newEnabled);
        
        if (!newEnabled) {
          analyticsManager.destroy();
          setIsTracking(false);
        } else if (!isAdmin && !hasOptedOut) {
          setIsTracking(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [auth?.user]);

  const value: TrackingContextType = {
    trackingEnabled,
    sessionId,
    isTracking,
  };

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
};

export const useTracking = () => {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider');
  return ctx;
};

export default TrackingContext;
