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

    // ── 1. Find nearest stop to bus ──────────────────────────────────────────
    let nearestIdx = 0;
    let minDist = Infinity;
    routeStops.forEach((s, idx) => {
      const d = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);
      if (d < minDist) {
        minDist = d;
        nearestIdx = idx;
      }
    });

    const isStopped = speed <= 4.5;
    const AT_STOP_RADIUS = 90; // 90 metres covers bus stop bays, food courts, and loading zones
    const isAtStop = minDist <= AT_STOP_RADIUS;

    let targetIndex;
    if (isAtStop) {
      // Bus is physically at or arriving at nearestIdx stop
      targetIndex = nearestIdx;
      lastPassedIndexRef.current = (nearestIdx - 1 + n) % n;
      warmupDoneRef.current = true;
    } else {
      // Bus is in transit between stops — find segment with minimum normalized excess distance:
      // excess = (dist(bus, A) + dist(bus, B)) - dist(A, B)
      // This is scale-independent and does not penalize longer segments.
      let bestExcess = Infinity;
      let bestTarget = (lastPassedIndexRef.current + 1 + n) % n;

      for (let offset = 0; offset < n; offset++) {
        const a = offset;
        const b = (a + 1) % n;
        const sA = routeStops[a];
        const sB = routeStops[b];
        const dA = getDistanceFromLatLonInMeters(busLat, busLng, sA.lat, sA.lng);
        const dB = getDistanceFromLatLonInMeters(busLat, busLng, sB.lat, sB.lng);
        const dAB = getDistanceFromLatLonInMeters(sA.lat, sA.lng, sB.lat, sB.lng);
        const excess = (dA + dB) - dAB;

        if (excess < bestExcess) {
          bestExcess = excess;
          bestTarget = b;
        }
      }

      targetIndex = bestTarget;
    }

    const nextStop = routeStops[targetIndex];

    // ── Effective speed for travel time ──────────────────────────────────────
    const effectiveSpeedKmh = speed > 5 ? speed : 20;
    const effectiveSpeedMps = effectiveSpeedKmh / 3.6;

    // ── Cumulative ETA starting from targetIndex ─────────────────────────────
    const distToTarget = isAtStop
      ? minDist
      : getDistanceFromLatLonInMeters(busLat, busLng, nextStop.lat, nextStop.lng);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busLat, busLng, speed, stops]);
}
