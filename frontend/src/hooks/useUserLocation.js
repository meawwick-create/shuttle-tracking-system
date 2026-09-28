import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDistanceFromLatLonInMeters } from '../utils/geoUtils';

const STORAGE_KEY = 'shuttle_user_geo_allowed';

/**
 * Custom Hook for tracking user mobile/browser GPS location
 * Finds the nearest campus stop to the user and tracks distance.
 *
 * @param {Array} stops - Array of campus stop objects [{ id, name, lat, lng }]
 */
export function useUserLocation(stops = []) {
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating]     = useState(false);
  const [locationError, setLocationError] = useState(null);

  const watchIdRef = useRef(null);

  // Success handler for geolocation
  const handleSuccess = useCallback((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    setUserLocation({ lat, lng, accuracy });
    setIsLocating(false);
    setLocationError(null);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Error handler for geolocation
  const handleError = useCallback((err) => {
    setIsLocating(false);
    let msg = 'ไม่สามารถระบุตำแหน่งได้';
    if (err.code === 1) { // PERMISSION_DENIED
      msg = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง (GPS) ในเบราว์เซอร์';
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    } else if (err.code === 2) { // POSITION_UNAVAILABLE
      msg = 'ไม่พบสัญญาณ GPS';
    } else if (err.code === 3) { // TIMEOUT
      msg = 'หมดเวลาค้นหาสัญญาณ GPS';
    }
    setLocationError(msg);
  }, []);

  // Request/start watching location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    // Initial immediate fix
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    });

    // Continuous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }, [handleSuccess, handleError]);

  // Stop watching location
  const stopLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setUserLocation(null);
    setIsLocating(false);
  }, []);

  // Auto-request on mount if user previously granted permission
  useEffect(() => {
    let previouslyAllowed = false;
    try {
      previouslyAllowed = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // Ignore
    }

    if (previouslyAllowed && navigator.geolocation) {
      requestLocation();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestLocation]);

  // Compute nearest campus stop to the user
  const nearestResult = useMemo(() => {
    if (!userLocation || !stops.length) {
      return { nearestUserStop: null, userDistanceToStop: null, userDistText: '' };
    }

    let nearest = null;
    let minDist = Infinity;

    stops.forEach(s => {
      const d = getDistanceFromLatLonInMeters(userLocation.lat, userLocation.lng, s.lat, s.lng);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    });

    const rounded = Math.round(minDist);
    const distText = rounded >= 1000
      ? `${(rounded / 1000).toFixed(2)} กม.`
      : `${rounded} เมตร`;

    return {
      nearestUserStop: nearest,
      userDistanceToStop: rounded,
      userDistText: distText
    };
  }, [userLocation, stops]);

  return {
    userLocation,
    isLocating,
    locationError,
    requestLocation,
    stopLocation,
    ...nearestResult
  };
}
