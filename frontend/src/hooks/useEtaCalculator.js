import { useRef, useMemo } from 'react';
import { getDistanceFromLatLonInMeters, isValidCoordinate } from '../utils/geoUtils';
import { ROUTE_ORDER } from '../config/campusConfig';

/**
 * Route-Aware ETA & Stop Arrival Calculator
 *
 * Design:
 *   - Calculates physical distance from the tracking device to each of the 6 campus stops.
 *   - When the device is within stop radius (160m stationary / 125m moving):
 *       • The bus is definitively AT that stop (targetIndex = nearestIdx).
 *       • Status is immediately "ถึงแล้ว / กำลังจอด" (if stopped) or "กำลังถึง..." (if approaching).
 *       • The stop distance is the true physical distance (e.g. 0-99m), NEVER jumping to 2+ km.
 *       • Updates lastPassedIndexRef to this stop.
 *   - When in transit between stops:
 *       • Advances sequentially along ROUTE_ORDER to (lastPassedIndexRef + 1) % n.
 *       • Target stop distance counts down as the bus approaches.
 *       • Failsafe resync ensures that if the device is moved or testing jumps across campus,
 *         it automatically re-aligns to the bus's true physical position.
 */
export function useEtaCalculator(busLat, busLng, speed = 0, stops = [], isMoving = null) {
  // Index into ROUTE_ORDER of the stop the bus most recently passed or is currently at
  const lastPassedIndexRef = useRef(-1);

  return useMemo(() => {
    const EMPTY = {
      nearestStop:  null,
      nextStop:     null,
      distanceText: '-- เมตร',
      etaText:      '-- นาที',
      stopsEta:     []
    };

    if (!isValidCoordinate(busLat, busLng) || !stops.length) return EMPTY;

    // ── Build ordered route array ────────────────────────────────────────────
    const stopMap    = Object.fromEntries(stops.map(s => [s.id, s]));
    const routeStops = ROUTE_ORDER.map(id => stopMap[id]).filter(Boolean);
    if (!routeStops.length) return EMPTY;

    const n = routeStops.length;

    // ── 1. Calculate physical distance to each stop ──────────────────────────
    const dists = routeStops.map(s => getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng));
    let nearestIdx = 0;
    let minDist = Infinity;
    dists.forEach((d, idx) => {
      if (d < minDist) {
        minDist = d;
        nearestIdx = idx;
      }
    });

    // Determine stationary state (supports both isMoving flag and speed threshold)
    const isStopped = isMoving !== null ? !isMoving : (speed <= 5.0);

    // Stop arrival radius:
    // 160m when stationary (accommodates indoor GPS drift, rooms like ห้อง 4, bus bays, and food courts)
    // 125m when moving along the road
    const stopRadius = isStopped ? 160 : 125;
    const isAtStop = minDist <= stopRadius;

    // ── 2. Determine target stop (Current or Approaching) ─────────────────────
    let targetIndex;
    if (isAtStop) {
      // The bus is physically at or arriving at nearestIdx stop
      targetIndex = nearestIdx;
      lastPassedIndexRef.current = nearestIdx;
    } else {
      // In transit between stops along the circular route
      if (lastPassedIndexRef.current >= 0) {
        const expectedTarget = (lastPassedIndexRef.current + 1) % n;
        // Resync failsafe: if bus was moved or GPS jumped across campus
        if (dists[expectedTarget] > dists[nearestIdx] + 250) {
          const nextIdx = (nearestIdx + 1) % n;
          const prevIdx = (nearestIdx - 1 + n) % n;
          targetIndex = dists[nextIdx] < dists[prevIdx] ? nextIdx : nearestIdx;
          lastPassedIndexRef.current = (targetIndex - 1 + n) % n;
        } else {
          targetIndex = expectedTarget;
        }
      } else {
        // Cold start in transit: determine whether bus is closer to nearestIdx or (nearestIdx + 1) % n
        const nextIdx = (nearestIdx + 1) % n;
        const prevIdx = (nearestIdx - 1 + n) % n;
        targetIndex = dists[nextIdx] < dists[prevIdx] ? nextIdx : nearestIdx;
        lastPassedIndexRef.current = (targetIndex - 1 + n) % n;
      }
    }

    const nextStop = routeStops[targetIndex];

    // ── Effective speed for travel time ──────────────────────────────────────
    const effectiveSpeedKmh = speed > 5 ? speed : 20;
    const effectiveSpeedMps = effectiveSpeedKmh / 3.6;

    // ── Cumulative ETA starting from targetIndex ─────────────────────────────
    const distToTarget = isAtStop ? minDist : dists[targetIndex];
    let accumulatedM = distToTarget;

    const stopsEtaRaw = [];
    for (let offset = 0; offset < n; offset++) {
      const idx = (targetIndex + offset) % n;
      const stop = routeStops[idx];

      if (offset > 0) {
        const prevStop = routeStops[(targetIndex + offset - 1) % n];
        accumulatedM += getDistanceFromLatLonInMeters(
          prevStop.lat, prevStop.lng, stop.lat, stop.lng
        );
      }

      const distRounded = Math.round(accumulatedM);
      const distText = distRounded >= 1000
        ? `${(distRounded / 1000).toFixed(2)} กม.`
        : `${distRounded} เมตร`;

      const etaSeconds = accumulatedM / effectiveSpeedMps;
      const etaMinutes = Math.ceil(etaSeconds / 60);

      let etaText;
      if (offset === 0 && isAtStop) {
        etaText = isStopped ? 'ถึงแล้ว / กำลังจอด' : 'กำลังถึง...';
      } else {
        etaText = `~ ${etaMinutes} นาที`;
      }

      stopsEtaRaw.push({
        stop,
        routeIndex:     idx,
        distanceMeters: distRounded,
        distanceText:   distText,
        etaMinutes,
        etaText,
        isNext:         offset === 0,
        withinRadius:   offset === 0 && isAtStop,
        isStopped,
      });
    }

    // Keep stops in fixed canonical ROUTE_ORDER (1 to 6) so the UI list is stable
    const stopsEta = [...stopsEtaRaw].sort((a, b) => a.routeIndex - b.routeIndex);

    const nextItem = stopsEtaRaw[0];
    const nextDistM = nextItem?.distanceMeters ?? 0;
    const distanceText = nextDistM >= 1000
      ? `${(nextDistM / 1000).toFixed(2)} กม.`
      : `${nextDistM} เมตร`;

    return {
      nearestStop:  routeStops[nearestIdx],
      nextStop,
      distanceText,
      etaText:      nextItem?.etaText ?? '-- นาที',
      stopsEta
    };
  }, [busLat, busLng, speed, stops, isMoving]);
}

