import { useMemo } from 'react';
import { getDistanceFromLatLonInMeters, isValidCoordinate } from '../utils/geoUtils';

/**
 * Custom Hook to calculate the nearest bus stop and Estimated Time of Arrival (ETA)
 * @param {number|null} busLat
 * @param {number|null} busLng
 * @param {number} speed - current speed in km/h
 * @param {Array} stops - array of campus stop objects
 */
export function useEtaCalculator(busLat, busLng, speed = 0, stops = []) {
  return useMemo(() => {
    if (!isValidCoordinate(busLat, busLng) || !stops.length) {
      return {
        nearestStop: null,
        distanceText: '-- เมตร',
        distanceMeters: null,
        etaMinutes: null,
        etaText: '-- นาที'
      };
    }

    let minDistanceMeters = Infinity;
    let nearest = null;

    stops.forEach(stop => {
      const dist = getDistanceFromLatLonInMeters(busLat, busLng, stop.lat, stop.lng);
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
        nearest = stop;
      }
    });

    if (!nearest) {
      return {
        nearestStop: null,
        distanceText: '-- เมตร',
        distanceMeters: null,
        etaMinutes: null,
        etaText: '-- นาที'
      };
    }

    const distRounded = Math.round(minDistanceMeters);
    const distanceText =
      distRounded >= 1000
        ? `${(distRounded / 1000).toFixed(2)} กม.`
        : `${distRounded} เมตร`;

    // If bus is slow (< 5 km/h) or stopped at a light, assume campus cruising speed = 20 km/h (5.55 m/s)
    const effectiveSpeedMps = (speed > 5 ? speed : 20) * (1000 / 3600);
    const etaSeconds = minDistanceMeters / effectiveSpeedMps;
    const etaMinutes = Math.ceil(etaSeconds / 60);

    const etaText =
      etaMinutes <= 1 ? 'ถึงแล้ว / ไม่เกิน 1 นาที' : `~ ${etaMinutes} นาที`;

    return {
      nearestStop: nearest,
      distanceText,
      distanceMeters: distRounded,
      etaMinutes,
      etaText
    };
  }, [busLat, busLng, speed, stops]);
}
