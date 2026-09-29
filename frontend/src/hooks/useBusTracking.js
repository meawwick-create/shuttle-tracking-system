import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { CONFIG } from '../config/campusConfig';
import { parseSqlDate } from '../utils/dateUtils';
import { isValidCoordinate, calculateBearing, getDistanceFromLatLonInMeters } from '../utils/geoUtils';

/**
 * Custom Hook for real-time bus location via Supabase Realtime (WebSocket)
 * Replaces polling with push-based updates — no more setInterval for fetching.
 *
 * API Response Format (current_bus_location):
 *   { bus_id, bus_name, latitude, longitude, speed, satellites, updated_at }
 *
 * Return interface is identical to the previous polling version:
 *   { busData, historyTrail, isOffline, statusMessage, error }
 *
 * @param {string} busId
 */
export function useBusTracking(busId = 'BUS01') {
  const [busData,        setBusData]        = useState(null);
  const [historyTrail,   setHistoryTrail]   = useState([]);
  const [isOffline,      setIsOffline]      = useState(true);
  const [statusMessage,  setStatusMessage]  = useState('กำลังเชื่อมต่อ...');
  const [error,          setError]          = useState(null);

  // Stores the parsed Date of the last received updated_at
  const lastUpdatedDateRef = useRef(null);

  // Sliding window of recent positions for stationary drift detection: [{ lat, lng, time }]
  // Stores the anchor coordinate used to calculate bearing along curves and U-turns
  const lastBearingAnchorRef = useRef(null);
  // Circular history of recent bearings for smoothing micro-jitter during turns
  const recentBearingsRef = useRef([]);
  const lastBearingRef = useRef(0);

  // ─── Process raw row from Supabase ─────────────────────────────────────────
  // Shared by both initial fetch and Realtime payload so logic lives in one place
  const processRow = (data, setPrev) => {
    const lat        = parseFloat(data.latitude);
    const lng        = parseFloat(data.longitude);
    const rawSpeed   = parseFloat(data.speed)        || 0.0;
    const satellites = parseInt(data.satellites, 10) || 0;

    if (!isValidCoordinate(lat, lng)) return;

    const updatedTime = parseSqlDate(data.updated_at);
    lastUpdatedDateRef.current = updatedTime;

    const ageSec  = updatedTime
      ? Math.floor((Date.now() - updatedTime.getTime()) / 1000)
      : Infinity;
    const offline = isNaN(ageSec) || ageSec > CONFIG.offlineThresholdSec;

    setIsOffline(offline);
    setStatusMessage(offline ? 'Offline' : 'Live Tracking');
    setError(null);

    // ── Indoor GPS Drift / Ghost Speed Filter ─────────────────────────────
    // When indoors or stationary, multipath reflections cause coordinates to jitter 2-4m/sec,
    // producing ghost speeds of 10-12 km/h even while sitting on a desk.
    // We verify against net physical displacement over the last 6 seconds.
    const now = Date.now();
    const positions = recentPositionsRef.current;
    positions.push({ lat, lng, time: now });

    // Keep window within the last 6 seconds
    while (positions.length > 1 && (now - positions[0].time) > 6000) {
      positions.shift();
    }

    let speed = rawSpeed;

    // If we have history over at least 3 seconds, test net displacement
    if (positions.length >= 2) {
      const oldest = positions[0];
      const elapsedSec = (now - oldest.time) / 1000;
      if (elapsedSec >= 2.5) {
        const netDistanceM = getDistanceFromLatLonInMeters(oldest.lat, oldest.lng, lat, lng);
        const netSpeedKmh  = (netDistanceM / elapsedSec) * 3.6;

        // If net physical progress is under 3.5 km/h OR satellites are low (indoor room),
        // any reported 8-15 km/h is proven to be stationary jitter/drift!
        if (netSpeedKmh < 3.5 || (satellites > 0 && satellites < 4)) {
          speed = 0.0;
        }
      }
    } else if (rawSpeed <= 3.0) {
      speed = 0.0;
    }

    const isMoving = speed > 3.0;

    // ── Bearing calculation (Tracks curves and U-turns smoothly) ────────
    let bearing = lastBearingRef.current;
    if (data.heading !== undefined && !isNaN(parseFloat(data.heading))) {
      bearing = parseFloat(data.heading);
      lastBearingRef.current = bearing;
    } else if (isMoving) {
      if (!lastBearingAnchorRef.current) {
        lastBearingAnchorRef.current = { lat, lng };
      } else {
        const distFromAnchor = getDistanceFromLatLonInMeters(
          lastBearingAnchorRef.current.lat,
          lastBearingAnchorRef.current.lng,
          lat,
          lng
        );
        // Update bearing whenever bus moves >= 0.8 meters along the turn
        if (distFromAnchor >= 0.8) {
          const rawBearing = calculateBearing(
            lastBearingAnchorRef.current.lat,
            lastBearingAnchorRef.current.lng,
            lat,
            lng
          );
          lastBearingAnchorRef.current = { lat, lng };

          // Circular moving average over 3 samples to filter GPS jitter during turns
          const history = recentBearingsRef.current;
          history.push(rawBearing);
          if (history.length > 3) history.shift();

          let sinSum = 0;
          let cosSum = 0;
          for (const b of history) {
            const rad = (b * Math.PI) / 180;
            sinSum += Math.sin(rad);
            cosSum += Math.cos(rad);
          }
          const meanRad = Math.atan2(sinSum, cosSum);
          bearing = Math.round(((meanRad * 180 / Math.PI) + 360) % 360);
          lastBearingRef.current = bearing;
        }
      }
    } else {
      // Stopped: preserve current bearing, reset anchor for fresh start when moving
      lastBearingAnchorRef.current = null;
      recentBearingsRef.current = [];
    }

    setBusData(prev => {

      // ── Skip re-render when nothing changed ──────────────────────────────
      if (
        prev                          &&
        prev.latitude   === lat       &&
        prev.longitude  === lng       &&
        prev.speed      === speed     &&
        prev.satellites === satellites &&
        prev.updatedAt  === data.updated_at &&
        prev.isMoving   === isMoving  &&
        prev.bearing    === bearing
      ) return prev;

      return {
        busId:        data.bus_id   || busId,
        busName:      data.bus_name || 'Shuttle',
        latitude:     lat,
        longitude:    lng,
        speed,
        satellites,
        bearing,
        updatedAt:    data.updated_at,
        updatedDate:  updatedTime,
        // Legacy field aliases — keeps other components from breaking
        recordedAt:   data.updated_at,
        recordedDate: updatedTime,
        isMoving,
      };
    });

    // ── History trail (max 100 pts) ──────────────────────────────────────
    setHistoryTrail(prev => {
      const last = prev[prev.length - 1];
      if (!last || last[0] !== lat || last[1] !== lng) {
        const next = [...prev, [lat, lng]];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      }
      return prev;
    });
  };

  useEffect(() => {
    let isMounted = true;

    // ── 1. Initial fetch (one-shot, before Realtime connects) ─────────────
    const fetchInitial = async () => {
      try {
        const { data: rows, error: fetchError } = await supabase
          .from('current_bus_location')
          .select('*')
          .eq('bus_id', busId)
          .single();

        if (!isMounted) return;

        if (fetchError) {
          console.warn('Initial fetch error:', fetchError.message);
          setIsOffline(true);
          setStatusMessage('ไม่พบข้อมูลในระบบ');
          return;
        }

        if (rows) processRow(rows);

      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setIsOffline(true);
          setStatusMessage('การเชื่อมต่อขัดข้อง');
        }
      }
    };

    fetchInitial();

    // ── 2. Supabase Realtime subscription ────────────────────────────────
    const channel = supabase
      .channel(`bus-tracking-${busId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',               // ESP32 ทำ PATCH = UPDATE event
          schema: 'public',
          table:  'current_bus_location',
          filter: `bus_id=eq.${busId}`,   // กรองเฉพาะ BUS01
        },
        (payload) => {
          if (!isMounted) return;
          console.log('📍 Realtime update:', payload.new);
          processRow(payload.new);
        }
      )
      .subscribe((status, err) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase Realtime connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime channel error:', err);
          setStatusMessage('Realtime ขัดข้อง');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Realtime timed out');
          setStatusMessage('Realtime หมดเวลา');
        } else if (status === 'CLOSED') {
          console.warn('🔌 Realtime disconnected');
        }
      });

    // ── 3. Freshness / Offline checker (runs every second) ───────────────
    // Catches ESP32 dropout even when Supabase is still connected
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

      setIsOffline(prev => prev !== offline ? offline : prev);
      setStatusMessage(prev => prev !== msg  ? msg     : prev);
    }, 1000);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      isMounted = false;
      clearInterval(freshnessChecker);
      supabase.removeChannel(channel);
      console.log('🔌 Realtime unsubscribed');
    };
  }, [busId]);

  return { busData, historyTrail, isOffline, statusMessage, error };
}
