import { useRef, useMemo } from 'react';
import { getDistanceFromLatLonInMeters, isValidCoordinate } from '../utils/geoUtils';
import { ROUTE_ORDER, STOP_PASS_THRESHOLD_M } from '../config/campusConfig';

/**
 * Route-Aware ETA Calculator for a circular bus route.
 *
 * Strategy:
 *   1. Stop detection + ETA computation are both inside useMemo so they always
 *      run in the same tick — no useEffect lag.
 *   2. lastPassedIndexRef is mutated inside useMemo (acceptable: ref mutation
 *      is idempotent and does not affect other renders).
 *   3. Scan for passed stops in route order starting from expectedNext so an
 *      already-passed stop cannot re-trigger.
 *   4. "ถึงแล้ว" = within STOP_PASS_THRESHOLD_M AND speed ≤ 3 km/h (truly stopped).
 *      "กำลังถึง..." = within radius but still moving.
 *      "~ X นาที" = en route.
 */
export function useEtaCalculator(busLat, busLng, speed = 0, stops = []) {
  // -1 = cold start (GPS not yet stable)
  // ≥ 0 = index of the last stop the bus passed
  const lastPassedIndexRef = useRef(-1);

  // True once we've had at least one GPS fix and seeded lastPassedIndex.
  // Stop detection (Step 1) only runs after warmup to avoid GPS cold-fix jitter
  // falsely triggering "ถึงแล้ว" on first load.
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

    // ── Step 1: cold-start seed (first tick only) ───────────────────────────
    // On the very first GPS fix, skip stop-proximity detection entirely.
    // GPS accuracy is poor right after activation (cold-fix jitter can be
    // 50–200 m) so we must NOT trigger "ถึงแล้ว" based on that bad fix.
    // We only seed lastPassedIndex with the geographically nearest stop.
    if (!warmupDoneRef.current) {
      let minDist = Infinity;
      let seedIdx = 0;
      routeStops.forEach((s, i) => {
        const d = getDistanceFromLatLonInMeters(busLat, busLng, s.lat, s.lng);
        if (d < minDist) { minDist = d; seedIdx = i; }
      });
      lastPassedIndexRef.current = seedIdx;
      warmupDoneRef.current = true;
      // Do NOT run Step 2 proximity scan this tick — return ETA only.
    } else {
      // ── Step 2: detect if bus entered a stop's radius (normal operation) ────
      // Scan in route order starting from the EXPECTED next stop.
      // This prevents an already-passed stop from re-triggering.
      const lastIdx  = lastPassedIndexRef.current;
      const scanFrom = (lastIdx + 1) % n;

      for (let offset = 0; offset < n; offset++) {
        const i    = (scanFrom + offset) % n;
        const dist = getDistanceFromLatLonInMeters(
          busLat, busLng, routeStops[i].lat, routeStops[i].lng
        );
        if (dist <= STOP_PASS_THRESHOLD_M) {
          if (i !== lastIdx) lastPassedIndexRef.current = i;
          break;
        }
      }
    }

    // ── Step 3: determine nextStop ───────────────────────────────────────────
    const lastIdx = lastPassedIndexRef.current;

    const nextIndex = (lastIdx + 1) % n;
    const nextStop  = routeStops[nextIndex];

    // ── Step 3: effective speed ──────────────────────────────────────────────
    const effectiveSpeedKmh = speed > 5 ? speed : 20;
    const effectiveSpeedMps = effectiveSpeedKmh / 3.6;
    const isStopped         = speed <= 3;

    // ── Step 4: cumulative ETA for every stop from nextStop outward ──────────
    let accumulatedM = getDistanceFromLatLonInMeters(
      busLat, busLng, nextStop.lat, nextStop.lng
    );

    const stopsEta = routeStops.map((_, offset) => {
      const idx      = (nextIndex + offset) % n;
      const stop     = routeStops[idx];

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

      const etaSeconds    = accumulatedM / effectiveSpeedMps;
      const etaMinutes    = Math.ceil(etaSeconds / 60);

      // "ถึงแล้ว" only for the immediate next stop AND bus is physically there AND stopped
      const withinRadius  = offset === 0 && distRounded <= STOP_PASS_THRESHOLD_M;
      const etaText       = withinRadius && isStopped
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

    // ── Nearest stop (raw, for backward compat) ──────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busLat, busLng, speed, stops]);
}
