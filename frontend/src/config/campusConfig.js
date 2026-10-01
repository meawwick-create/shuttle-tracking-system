/**
 * Shuttle Tracking System - Campus Configuration
 * Stores constants, stops, initial coordinates, and tile layer definitions.
 */

export const CONFIG = {
  fetchIntervalMs: 500,        // Polling every 500 ms (matches ESP32 send rate)
  offlineThresholdSec: 8,      // Offline if no update for > 8 seconds
  defaultZoom: 17,
  defaultCenter: [9.0954688, 99.3576160], // Default university center coordinates
};

// University Sample Bus Stops
export const CAMPUS_STOPS = [
  { id: 'STOP01', name: 'งานพัฒนานักศึกษา', lat: 9.098062, lng: 99.356298 },
  { id: 'STOP02', name: 'คณะวิทยาศาสตร์และเทคโนโลยีอุตสาหกรรม', lat: 9.096012, lng: 99.358078 },
  { id: 'STOP03', name: 'อาคารศูนย์การเรียนรู้ (LC)', lat: 9.093786, lng: 99.356516 },
  { id: 'STOP04', name: 'คณะศิลปศาสตร์และวิทยาการจัดการ', lat: 9.094334, lng: 99.357079 },
  { id: 'STOP05', name: 'โรงเรียน มอ.วิทยานุสรณ์ สุราษฎร์ธานี', lat: 9.090004, lng: 99.355437 },
  { id: 'STOP06', name: 'สำนักงานวิทยาเขตสุราษฎร์ธานี', lat: 9.090905, lng: 99.354390 }
];

/**
 * Circular route order: STOP01 → 02 → 03 → 04 → 05 → 06 → 01 (loop)
 * The bus always travels in this fixed order.
 * The ETA engine tracks the last-passed stop index and derives
 * arrival times for all subsequent stops in sequence.
 */
export const ROUTE_ORDER = ['STOP01', 'STOP02', 'STOP03', 'STOP04', 'STOP05', 'STOP06'];

/** Distance threshold (metres) — bus is considered to have "passed" a stop when within this radius. */
export const STOP_PASS_THRESHOLD_M = 60;

// Available Vehicles (for selector)
export const VEHICLES = [
  { id: 'BUS01', name: '🚌 BUS01 - Shuttle1 (ใช้งานอยู่)', disabled: false },
  { id: 'BUS02', name: '🚌 BUS02 - Shuttle2 (เร็วๆ นี้)', disabled: true },
  { id: 'BUS03', name: '🚌 BUS03 - Shuttle3 (เร็วๆ นี้)', disabled: true }
];

// Map Layer Options
export const MAP_LAYERS = [
  { id: 'google_roadmap', name: '🗺️ Google แผนที่' },
  { id: 'google_satellite', name: '🛰️ ภาพดาวเทียม (Satellite)' },
  { id: 'carto_voyager', name: '🎨 โมเดิร์น (Voyager)' },
  { id: 'osm', name: '📌 OpenStreetMap' }
];
