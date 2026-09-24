import { useState, useEffect, useRef } from 'react';
import { CONFIG } from '../config/campusConfig';
import { parseSqlDate } from '../utils/dateUtils';
import { isValidCoordinate } from '../utils/geoUtils';

/**
 * Custom Hook for real-time bus location polling & tracking state
 *
 * API Response Format (current_bus_location):
 *   { bus_id, bus_name, latitude, longitude, speed, satellites, updated_at }
 *
 * @param {string} busId
 */
export function useBusTracking(busId = 'BUS01') {
  const [busData, setBusData]       = useState(null);
  const [historyTrail, setHistoryTrail] = useState([]);
  const [isOffline, setIsOffline]   = useState(false);
  const [statusMessage, setStatusMessage] = useState('กำลังเชื่อมต่อ...');
  const [error, setError]           = useState(null);

  // Stores the parsed Date of the last successful updated_at from server
  const lastUpdatedDateRef = useRef(null);

  // Guard: prevent overlapping requests if previous fetch hasn't finished
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchBusLocation = async () => {
      // Skip if previous request is still in flight
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/current_bus_location?bus_id=eq.${busId}&select=*`;
        const response = await fetch(url, {
          signal:  controller.signal,
          cache:   'no-store',
          headers: { 
            Accept: 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_KEY
          }
        });

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const dataList = await response.json();

        // Supabase returns an array. If empty, the bus isn't in the DB.
        if (!dataList || dataList.length === 0) {
          if (isMounted) {
            setIsOffline(true);
            setStatusMessage('ไม่มีข้อมูลในระบบ');
          }
          return;
        }

        const data = dataList[0];

        const lat       = parseFloat(data.latitude);
        const lng       = parseFloat(data.longitude);
        const speed     = parseFloat(data.speed)     || 0.0;
        const satellites = parseInt(data.satellites, 10) || 0;
        const isMoving  = speed > 3.0;

        if (!isValidCoordinate(lat, lng)) return;

        // Use updated_at (new schema) to track data freshness
        const updatedTime = parseSqlDate(data.updated_at);
        lastUpdatedDateRef.current = updatedTime;

        if (!isMounted) return;

        setBusData(prev => {
          // Bail out early if nothing actually changed (avoid unnecessary re-renders)
          if (
            prev &&
            prev.latitude   === lat       &&
            prev.longitude  === lng       &&
            prev.speed      === speed     &&
            prev.satellites === satellites &&
            prev.updatedAt  === data.updated_at &&
            prev.isMoving   === isMoving
          ) return prev;

          return {
            busId:      data.bus_id   || busId,
            busName:    data.bus_name || 'Shuttle',
            latitude:   lat,
            longitude:  lng,
            speed,
            satellites,
            updatedAt:   data.updated_at,
            updatedDate: updatedTime,
            // Keep legacy field names so other components don't break
            recordedAt:   data.updated_at,
            recordedDate: updatedTime,
            isMoving
          };
        });

        // History trail — append only when position actually changes (max 100 pts)
        setHistoryTrail(prev => {
          const last = prev[prev.length - 1];
          if (!last || last[0] !== lat || last[1] !== lng) {
            const next = [...prev, [lat, lng]];
            return next.length > 100 ? next.slice(next.length - 100) : next;
          }
          return prev;
        });

        setError(null);

      } catch (err) {
        if (err.name !== 'AbortError' && isMounted) {
          setError(err.message);
          setIsOffline(true);
          setStatusMessage('การเชื่อมต่อขัดข้อง');
        }
      } finally {
        isFetchingRef.current = false;
      }
    };

    // ── Polling ───────────────────────────────────────────────────────────────
    fetchBusLocation();                                          // immediate
    const intervalId = setInterval(fetchBusLocation, CONFIG.fetchIntervalMs);

    // ── Freshness / Offline checker (runs every second) ───────────────────────
    // Checks updated_at age — catches ESP32 dropout even when server still responds
    const freshnessChecker = setInterval(() => {
      if (!isMounted) return;

      if (!lastUpdatedDateRef.current) {
        setIsOffline(true);
        setStatusMessage(prev =>
          prev === 'กำลังเชื่อมต่อ...' ? 'รอข้อมูล GPS...' : prev
        );
        return;
      }

      const ageSec  = Math.floor((Date.now() - lastUpdatedDateRef.current.getTime()) / 1000);
      const offline = ageSec > CONFIG.offlineThresholdSec;
      const msg     = offline ? 'Offline' : 'Live Tracking';

      setIsOffline(prev     => prev     !== offline ? offline : prev);
      setStatusMessage(prev => prev     !== msg     ? msg     : prev);
    }, 1000);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(intervalId);
      clearInterval(freshnessChecker);
    };
  }, [busId]);

  return { busData, historyTrail, isOffline, statusMessage, error };
}


