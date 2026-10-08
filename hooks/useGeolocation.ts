// 🔒 BACKEND/DB — DO NOT MODIFY (flagged for future work)
import { useEffect, useState } from 'react';
import { useRouteStore } from '@/lib/store';

export function useGeolocation() {
  const setUserLocation = useRouteStore((state) => state.setUserLocation);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    // Configure positioning to be highly accurate but fault-tolerant
    const options = {
      enableHighAccuracy: true,
      timeout: 30000,       // Increased to 30s so the GPS hardware has time to lock
      maximumAge: 60000,    // Allow up to a 60-second cached location to prevent immediate timeouts
    };

    // Callback when position updates
    const handleSuccess = (position: GeolocationPosition) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setError(null);
    };

    // Callback on errors (e.g., user denies permission)
    const handleError = (error: GeolocationPositionError) => {
      console.warn('Geolocation Error:', error.message);
      setError(error.message);
    };

    // Start watching the location continuously
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    // Cleanup: stop watching when the component unmounts
    return () => navigator.geolocation.clearWatch(watchId);
  }, [setUserLocation]);

  return { error };
}
