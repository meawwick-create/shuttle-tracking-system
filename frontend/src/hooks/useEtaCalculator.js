import { useMemo, useRef } from 'react';
import { getDistanceFromLatLonInMeters, isValidCoordinate } from '../utils/geoUtils';
import { ROUTE_ORDER, STOP_PASS_THRESHOLD_M } from '../config/campusConfig';

/**
 * Route-Aware ETA Calculator for a circular bus route.
 *
 * Strategy (user-specified):
 *   1. Track the last stop the bus "passed" (within STOP_PASS_THRESHOLD_M metres).
 *   2. The next target stop is always (lastPassedIndex + 1) % routeLength.
 *   3. Calculate ETA for EVERY subsequent stop by summing straight-line segment
 *      distances along the route order, divided by effective speed.
 *
 * This avoids the bearing ±60° ambiguity when GPS is noisy.
 *
 * @param {number|null} busLat
 * @param {number|null} busLng
 * @param {number} speed - current GPS speed in km/h
 * @param {Array}  stops - CAMPUS_STOPS array
 * @returns {{ nearestStop, nextStop, distanceText, etaText, stopsEta[] }}
 */
export function useEtaCalculator(busLat, busLng, speed = 0, stops = []) {
  // Persists across renders — stores the ROUTE_ORDER index of the last passed stop.
  // -1 means "not yet determined" (first load before bus is near any stop).
  const lastPassedIndexRef = useRef(-1);

  return useMemo(() => {
    const EMPTY = {
      nearestStop:   null,
      nextStop:      null,
      distanceText:  '-- เมตร',
      etaText:       '-- นาที',
      stopsEta:      []
    };

    if (!isValidCoordinate(busLat, busLng) || !stops.length) return EMPTY;

    // ── Build a stop-id → stop-object lookup ────────────────────────────────
    const stopMap = Object.fromEntries(stops.map(s => [s.id, s]));

    // Ordered route stops (filter out any IDs missing from stops prop)
    const routeStops = ROUTE_ORDER.map(id => stopMap[id]).filter(Boolean);
    if (!routeStops.length) return EMPTY;

    // ── Step 1: detect if bus just entered a stop's radius ──────────────────
    // Scan stops in ROUTE ORDER starting from the expected next stop.
    // This prevents a stop that was already passed (earlier in the array)
    // from incorrectly firing when the bus is physically between two stops.
    const n = routeStops.length;
    const currentNextIdx = lastPassedIndexRef.current === -1
      ? 0
      : (lastPassedIndexRef.current + 1) % n;

    for (let offset = 0; offset < n; offset++) {
      const i    = (currentNextIdx + offset) % n;
      const s    = routeStops[i];
      const dist = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);

      if (dist <= STOP_PASS_THRESHOLD_M) {
        // Mark this stop as "last passed" only if it's different from current
        if (i !== lastPassedIndexRef.current) {
          lastPassedIndexRef.current = i;
        }
        break; // Only one stop can be active at a time
      }
    }

    // ── Step 2: determine nextStop index ────────────────────────────────────
    let nextIndex;
    if (lastPassedIndexRef.current === -1) {
      // Cold start: find the geographically nearest stop and treat the stop
      // AFTER it as our initial next target.
      let minDist = Infinity;
      let nearestIdx = 0;
      routeStops.forEach((s, i) => {
        const d = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      });
      // On cold start, assume bus is heading toward the stop AFTER the nearest
      lastPassedIndexRef.current = nearestIdx;
      nextIndex = (nearestIdx + 1) % n;
    } else {
      nextIndex = (lastPassedIndexRef.current + 1) % n;
    }

    const nextStop = routeStops[nextIndex];

    // ── Step 3: effective speed ──────────────────────────────────────────────
    // If GPS speed < 5 km/h (stopped or unreliable), assume campus cruise = 20 km/h
    const effectiveSpeedKmh = speed > 5 ? speed : 20;
    const effectiveSpeedMps = effectiveSpeedKmh * (1000 / 3600);

    // ── Step 4: compute ETA for every stop in route order ───────────────────
    // Accumulated distance starts as bus → nextStop (straight line proxy)
    let accumulatedM = getDistanceFromLatLonInMeters(busLat, busLng, nextStop.lat, nextStop.lng);

    const stopsEta = routeStops.map((_, offset) => {
      const idx  = (nextIndex + offset) % n;
      const stop = routeStops[idx];

      if (offset > 0) {
        // Add segment: previous stop → this stop
        const prevIdx  = (nextIndex + offset - 1) % n;
        const prevStop = routeStops[prevIdx];
        accumulatedM  += getDistanceFromLatLonInMeters(
          prevStop.lat, prevStop.lng,
          stop.lat,     stop.lng
        );
      }

      const etaSeconds = accumulatedM / effectiveSpeedMps;
      const etaMinutes = Math.ceil(etaSeconds / 60);
      const distRounded = Math.round(accumulatedM);
      const distText =
        distRounded >= 1000
          ? `${(distRounded / 1000).toFixed(2)} กม.`
          : `${distRounded} เมตร`;
      const etaText =
        etaMinutes <= 1 ? 'ถึงแล้ว / ไม่เกิน 1 นาที' : `~ ${etaMinutes} นาที`;

      return {
        stop,
        distanceMeters: distRounded,
        distanceText:   distText,
        etaMinutes,
        etaText,
        isNext:  offset === 0, // The immediate next stop
      };
    });

    // ── Backward-compat: nearestStop (raw closest, regardless of route) ──────
    let minDistAll = Infinity;
    let nearest = null;
    stops.forEach(s => {
      const d = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);
      if (d < minDistAll) { minDistAll = d; nearest = s; }
    });

    const nextDistM   = stopsEta[0]?.distanceMeters ?? 0;
    const distanceText =
      nextDistM >= 1000
        ? `${(nextDistM / 1000).toFixed(2)} กม.`
        : `${nextDistM} เมตร`;

    return {
      nearestStop:  nearest,
      nextStop,
      distanceText,
      etaText:      stopsEta[0]?.etaText ?? '-- นาที',
      stopsEta
    };
  }, [busLat, busLng, speed, stops]);
}
