import { useRef, useMemo } from 'react';
import { getDistanceFromLatLonInMeters, isValidCoordinate } from '../utils/geoUtils';
import { ROUTE_ORDER, STOP_PASS_THRESHOLD_M } from '../config/campusConfig';

/**
 * Route-Aware ETA Calculator — Segment Score Detection
 *
 * Core idea:
 *   For each pair of consecutive stops (A → B) on the circular route, compute
 *   a "segment score" = dist(bus, A) + dist(bus, B).
 *   The pair with the LOWEST score is the segment the bus is currently on.
 *   lastPassed = A, nextStop = B.
 *
 * Why this is better than radius/threshold checks:
 *   • Works regardless of how close the bus physically gets to a stop coordinate.
 *   • No threshold to tune — self-calibrating for any stop spacing.
 *   • Naturally handles closely-spaced stops (STOP03 ↔ STOP04 at 86 m).
 *   • Robust to GPS noise because the best-scoring segment changes smoothly.
 *
 * Anti-regression rule:
 *   lastPassedIndex can only ADVANCE (or wrap around). It never goes backward.
 *   This prevents GPS jitter from sending the bus "backward" on the route.
 *
 * Cold-start:
 *   First tick skips advancement guard and accepts whatever segment scores best.
 *   Subsequent ticks enforce forward-only movement.
 *
 * "ถึงแล้ว" = bus within STOP_PASS_THRESHOLD_M of the next stop AND stopped.
 * "กำลังถึง..." = within radius but still moving.
 */
export function useEtaCalculator(busLat, busLng, speed = 0, stops = []) {
  // Index into ROUTE_ORDER of the stop the bus most recently passed
  const lastPassedIndexRef = useRef(-1);

  // True after the first GPS tick has been processed (prevents cold-start jitter)
  const warmupDoneRef = useRef(false);

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

    // ── Segment Score Detection ──────────────────────────────────────────────
    // Find the consecutive stop pair (A, B) with the smallest combined distance
    // from the bus. That pair defines which segment the bus is currently on.
    //
    // On the first tick (cold start) we search all segments.
    // On subsequent ticks we only search FORWARD from the current position
    // (to prevent backward movement due to GPS jitter).

    const currentLastIdx = lastPassedIndexRef.current;

    let bestScore    = Infinity;
    let bestLastIdx  = currentLastIdx === -1 ? 0 : currentLastIdx;

    // Search window: cold start → all segments; normal → forward only
    const searchLimit = warmupDoneRef.current ? Math.ceil(n / 2) : n;

    for (let offset = 0; offset < searchLimit; offset++) {
      const a     = currentLastIdx === -1
        ? offset
        : (currentLastIdx + offset) % n;
      const b     = (a + 1) % n;
      const sA    = routeStops[a];
      const sB    = routeStops[b];
      const score =
        getDistanceFromLatLonInMeters(busLat, busLng, sA.lat, sA.lng) +
        getDistanceFromLatLonInMeters(busLat, busLng, sB.lat, sB.lng);

      if (score < bestScore) {
        bestScore   = score;
        bestLastIdx = a;
      }
    }

    // Anti-regression: only advance, never retreat (handles wrap-around too)
    if (!warmupDoneRef.current) {
      // Cold start — accept best segment unconditionally
      lastPassedIndexRef.current = bestLastIdx;
      warmupDoneRef.current      = true;
    } else {
      // Only accept if new index is ahead of current (or wrapping around)
      const cur  = lastPassedIndexRef.current;
      const diff = (bestLastIdx - cur + n) % n;
      // diff === 0 → same segment (no change); diff 1..n/2 → forward advance
      if (diff > 0 && diff <= Math.floor(n / 2)) {
        lastPassedIndexRef.current = bestLastIdx;
      }
    }

    // ── Final nextStop ───────────────────────────────────────────────────────
    const lastIdx   = lastPassedIndexRef.current;
    const nextIndex = (lastIdx + 1) % n;
    const nextStop  = routeStops[nextIndex];

    const distToNextStop = getDistanceFromLatLonInMeters(
      busLat, busLng, nextStop.lat, nextStop.lng
    );

    // ── Effective speed ──────────────────────────────────────────────────────
    const effectiveSpeedKmh = speed > 5 ? speed : 20;
    const effectiveSpeedMps = effectiveSpeedKmh / 3.6;
    const isStopped         = speed <= 3;

    // ── Cumulative ETA for every stop from nextStop outward ──────────────────
    let accumulatedM = distToNextStop;

    const stopsEta = routeStops.map((_, offset) => {
      const idx  = (nextIndex + offset) % n;
      const stop = routeStops[idx];

      if (offset > 0) {
        const prevStop = routeStops[(nextIndex + offset - 1) % n];
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

      // "ถึงแล้ว" = at stop AND stopped; "กำลังถึง" = at stop but moving
      const withinRadius = offset === 0 && distRounded <= STOP_PASS_THRESHOLD_M;
      const etaText      = withinRadius && isStopped
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
        isNext:       offset === 0,
        withinRadius,
        isStopped,
      };
    });

    // ── Nearest stop (raw, backward compat) ──────────────────────────────────
    let minDistAll = Infinity, nearest = null;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busLat, busLng, speed, stops]);
}
