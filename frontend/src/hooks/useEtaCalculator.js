import { useRef, useEffect, useMemo } from 'react';
import { getDistanceFromLatLonInMeters, isValidCoordinate } from '../utils/geoUtils';
import { ROUTE_ORDER, STOP_PASS_THRESHOLD_M } from '../config/campusConfig';

/**
 * Route-Aware ETA Calculator for a circular bus route.
 *
 * Strategy:
 *   1. Track which stop the bus last "passed" using a ref updated in useEffect
 *      (side-effect safe — never inside useMemo).
 *   2. Next stop = (lastPassedIndex + 1) % routeLength — always follows ROUTE_ORDER.
 *   3. ETA for all stops is computed by summing straight-line segment distances
 *      along the route from the bus's current position.
 *
 * "ถึงแล้ว" only shows when bus is physically inside STOP_PASS_THRESHOLD_M.
 * Otherwise, always shows a real minute estimate.
 */
export function useEtaCalculator(busLat, busLng, speed = 0, stops = []) {
  // Index into ROUTE_ORDER of the stop the bus most recently passed.
  // -1 = cold start (not yet near any stop).
  const lastPassedIndexRef = useRef(-1);

  // Build route stops once (stable reference as long as stops array identity is stable)
  const routeStops = useMemo(() => {
    const stopMap = Object.fromEntries(stops.map(s => [s.id, s]));
    return ROUTE_ORDER.map(id => stopMap[id]).filter(Boolean);
  }, [stops]);

  // ── Side-effect: detect when bus enters a stop radius ───────────────────────
  // Runs after each render when busLat/busLng changes.
  // Scans in route order starting from the EXPECTED next stop so a stop already
  // passed cannot re-trigger (fixes the array-index-0 bias bug).
  useEffect(() => {
    if (!isValidCoordinate(busLat, busLng) || !routeStops.length) return;

    const n = routeStops.length;
    const currentLastIdx = lastPassedIndexRef.current;

    // Where we expect the bus to go next
    const scanFromIdx = currentLastIdx === -1 ? 0 : (currentLastIdx + 1) % n;

    for (let offset = 0; offset < n; offset++) {
      const i    = (scanFromIdx + offset) % n;
      const s    = routeStops[i];
      const dist = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);

      if (dist <= STOP_PASS_THRESHOLD_M) {
        if (i !== currentLastIdx) {
          lastPassedIndexRef.current = i;
        }
        break;
      }
    }
  }, [busLat, busLng, routeStops]);

  // ── Memoized ETA computation ─────────────────────────────────────────────────
  return useMemo(() => {
    const EMPTY = {
      nearestStop:  null,
      nextStop:     null,
      distanceText: '-- เมตร',
      etaText:      '-- นาที',
      stopsEta:     []
    };

    if (!isValidCoordinate(busLat, busLng) || !routeStops.length) return EMPTY;

    const n = routeStops.length;

    // ── Determine nextStop ───────────────────────────────────────────────────
    let lastIdx = lastPassedIndexRef.current;

    if (lastIdx === -1) {
      // Cold start: seed with the geographically nearest stop
      let minDist = Infinity;
      let nearestIdx = 0;
      routeStops.forEach((s, i) => {
        const d = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      });
      lastIdx = nearestIdx;
      // Don't write to ref here — useEffect handles that
    }

    const nextIndex = (lastIdx + 1) % n;
    const nextStop  = routeStops[nextIndex];

    // ── Effective speed ──────────────────────────────────────────────────────
    const effectiveSpeedKmh = speed > 5 ? speed : 20;
    const effectiveSpeedMps = effectiveSpeedKmh / 3.6;

    // ── Compute ETA for every stop in order from nextStop ───────────────────
    let accumulatedM = getDistanceFromLatLonInMeters(
      busLat, busLng, nextStop.lat, nextStop.lng
    );

    const stopsEta = routeStops.map((_, offset) => {
      const idx  = (nextIndex + offset) % n;
      const stop = routeStops[idx];

      if (offset > 0) {
        const prevIdx  = (nextIndex + offset - 1) % n;
        const prevStop = routeStops[prevIdx];
        accumulatedM  += getDistanceFromLatLonInMeters(
          prevStop.lat, prevStop.lng, stop.lat, stop.lng
        );
      }

      const distRounded = Math.round(accumulatedM);
      const distText    = distRounded >= 1000
        ? `${(distRounded / 1000).toFixed(2)} กม.`
        : `${distRounded} เมตร`;

      const etaSeconds = accumulatedM / effectiveSpeedMps;
      const etaMinutes = Math.ceil(etaSeconds / 60);

      // "ถึงแล้ว" = bus is physically at the stop AND has stopped (speed ≤ 3 km/h)
      // "กำลังถึง" = within the stop radius but still moving
      // "~ X นาที" = en route
      const withinRadius = offset === 0 && distRounded <= STOP_PASS_THRESHOLD_M;
      const isStopped    = speed <= 3;
      const etaText = withinRadius && isStopped
        ? 'ถึงแล้ว / กำลังจอด'
        : withinRadius
        ? 'กำลังถึง...'
        : `~ ${etaMinutes} นาที`;

      return {
        stop,
        distanceMeters: distRounded,
        distanceText:   distText,
        etaMinutes,
        etaText,
        isNext:        offset === 0,
        withinRadius,
        isStopped,
      };
    });

    // ── Nearest stop (raw — for backward compat) ─────────────────────────────
    let minDistAll = Infinity;
    let nearest    = null;
    stops.forEach(s => {
      const d = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);
      if (d < minDistAll) { minDistAll = d; nearest = s; }
    });

    const nextDistM    = stopsEta[0]?.distanceMeters ?? 0;
    const distanceText = nextDistM >= 1000
      ? `${(nextDistM / 1000).toFixed(2)} กม.`
      : `${nextDistM} เมตร`;

    return {
      nearestStop:  nearest,
      nextStop,
      distanceText,
      etaText:      stopsEta[0]?.etaText ?? '-- นาที',
      stopsEta
    };
  }, [busLat, busLng, speed, stops, routeStops]);
}
