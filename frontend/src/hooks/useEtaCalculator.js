import { useMemo } from 'react';
import { getDistanceFromLatLonInMeters, isValidCoordinate } from '../utils/geoUtils';

/**
 * Real-Time Arrival & Precise Stop Distance Calculator
 *
 * Sorts all campus stops by arrival sequence from the bus's current GPS location.
 * - Distance is calculated with geodesic precision (Haversine formula).
 * - The stop where the bus currently is (or closest to) appears at the very top.
 * - Following stops are sorted in order of proximity/arrival.
 * - ETA is calculated using real vehicle speed (or 20 km/h campus cruising speed).
 */
export function useEtaCalculator(busLat, busLng, speed = 0, stops = [], isMoving = null) {
  return useMemo(() => {
    const EMPTY = {
      nearestStop:  null,
      nextStop:     null,
      distanceText: '-- เมตร',
      etaText:      '-- นาที',
      stopsEta:     []
    };

    if (!isValidCoordinate(busLat, busLng) || !stops.length) return EMPTY;

    const isStopped = isMoving !== null ? !isMoving : (speed <= 5.0);
    const effectiveSpeedKmh = speed > 5 ? speed : 20;
    const effectiveSpeedMps = effectiveSpeedKmh / 3.6;

    // 1. Calculate exact geodesic distance from bus to each stop
    const stopsWithDist = stops.map(stop => {
      const rawDist = getDistanceFromLatLonInMeters(busLat, busLng, stop.lat, stop.lng);
      const stopNum = parseInt(stop.id.replace(/\D/g, ''), 10) || 0;
      return {
        stop,
        stopNum,
        rawDist
      };
    });

    // 2. Sort by distance from current bus location (closest stop at index 0)
    stopsWithDist.sort((a, b) => a.rawDist - b.rawDist);

    const nearest = stopsWithDist[0];
    const isAtStopExact = nearest && nearest.rawDist <= 7.0;

    // 3. Format per-stop distance and arrival time
    const stopsEta = stopsWithDist.map((item, index) => {
      const distRounded = Math.round(item.rawDist);
      let distText;
      if (item.rawDist <= 7.0 && index === 0) {
        distText = '0 ม. (ถึงแล้ว รอรับนักศึกษา)';
      } else if (distRounded >= 1000) {
        distText = `${(distRounded / 1000).toFixed(2)} กม.`;
      } else {
        distText = `${distRounded} เมตร`;
      }

      const etaSeconds = item.rawDist / effectiveSpeedMps;
      const etaMinutes = Math.ceil(etaSeconds / 60);

      let etaText;
      if (index === 0) {
        if (isStopped) {
          etaText = item.rawDist <= 7.0 ? 'ถึงแล้ว รอรับนักศึกษา' : 'จอดแล้ว';
        } else {
          etaText = etaSeconds < 45 ? '< 1 นาที' : `~ ${etaMinutes} นาที`;
        }
      } else if (etaSeconds < 45) {
        etaText = '< 1 นาที';
      } else {
        etaText = `~ ${etaMinutes} นาที`;
      }

      return {
        stop:           item.stop,
        stopNum:        item.stopNum,
        routeIndex:     index,
        distanceMeters: distRounded,
        distanceText:   distText,
        etaMinutes,
        etaText,
        isNext:         index === 0,
        withinRadius:   index === 0 && item.rawDist <= 7.0,
        isStopped
      };
    });

    const nextItem = stopsEta[0];
    const busStopStatus = isStopped
      ? (isAtStopExact ? 'ถึงแล้ว รอรับนักศึกษา' : 'จอดแล้ว')
      : 'กำลังวิ่ง';

    return {
      nearestStop:   nextItem.stop,
      nextStop:      nextItem.stop,
      distanceText:  nextItem.distanceText,
      etaText:       nextItem.etaText,
      stopsEta,
      isAtStopExact,
      busStopStatus
    };
  }, [busLat, busLng, speed, stops, isMoving]);
}


