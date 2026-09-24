/**
 * Shuttle Tracking System - Campus Configuration
 * Stores constants, stops, initial coordinates, and tile layer definitions.
 */

export const CONFIG = {
  fetchIntervalMs: 500,        // Polling every 500 ms (matches ESP32 send rate)
  offlineThresholdSec: 30,     // Offline if no update for > 30 seconds
  defaultZoom: 17,
  defaultCenter: [9.0954688, 99.3576160], // Default university center coordinates
};

// University Sample Bus Stops
export const CAMPUS_STOPS = [
  { id: 'STOP01', name: 'งานพัฒนานักศึกษา', lat: 9.098018, lng: 99.356216 },
  { id: 'STOP02', name: 'คณะวิทยาศาสตร์และเทคโนโลยีอุตสาหกรรม', lat: 9.096012, lng: 99.358078 },
  { id: 'STOP03', name: 'อาคารศูนย์การเรียนรู้ (LC)', lat: 9.093786, lng: 99.356516 },
  { id: 'STOP04', name: 'คณะศิลปศาสตร์และวิทยาการจัดการ', lat: 9.094334, lng: 99.357079 },
  { id: 'STOP05', name: 'โรงเรียน มอ.วิทยานุสรณ์ สุราษฎร์ธานี', lat: 9.089829, lng: 99.355659 },
  { id: 'STOP06', name: 'สำนักงานวิทยาเขตสุราษฎร์ธานี', lat: 9.090905, lng: 99.354390 }
];

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
