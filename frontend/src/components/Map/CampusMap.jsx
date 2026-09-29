import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CONFIG, CAMPUS_STOPS } from '../../config/campusConfig';
import { projectCoordinates } from '../../utils/geoUtils';
import { MapControls } from './MapControls';
import { MapHudOverlay } from './MapHudOverlay';

/**
 * Creates custom 3D Bus Marker DivIcon with smooth directional heading,
 * 3D isometric vehicle chassis, and floating status tag.
 * @param {boolean} isMoving
 * @param {boolean} isOffline
 * @param {number} bearing
 * @param {number} speed
 * @param {string} busId
 */
// Inline SVG for the 3D bus — avoids <img src> path issues inside Leaflet divIcon
const BUS_SVG_INLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 180" width="60" height="90">
  <defs>
    <filter id="bus3dShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="0" dy="8" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="headlightGrad" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#fef9c3" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="busBody3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <linearGradient id="busRoof3d" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="60%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="glassFront" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#0369a1"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="chromeTrim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <g class="bus-headlights-beam">
    <polygon points="35,46 10,0 45,0" fill="url(#headlightGrad)"/>
    <polygon points="85,46 75,0 110,0" fill="url(#headlightGrad)"/>
  </g>
  <g filter="url(#bus3dShadow)">
    <rect x="23" y="58" width="7" height="22" rx="3.5" fill="#0f172a"/>
    <rect x="90" y="58" width="7" height="22" rx="3.5" fill="#0f172a"/>
    <rect x="23" y="120" width="7" height="22" rx="3.5" fill="#0f172a"/>
    <rect x="90" y="120" width="7" height="22" rx="3.5" fill="#0f172a"/>
    <path d="M24 52 L17 49 Q15 48 16 46 L21 44 Q23 44 24 47 Z" fill="#1e3a8a"/>
    <path d="M96 52 L103 49 Q105 48 104 46 L99 44 Q97 44 96 47 Z" fill="#1e3a8a"/>
    <rect x="17" y="46" width="4" height="2" rx="1" fill="#38bdf8"/>
    <rect x="99" y="46" width="4" height="2" rx="1" fill="#38bdf8"/>
    <rect x="26" y="42" width="68" height="114" rx="16" fill="url(#busBody3d)" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M36 43 Q60 38 84 43" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M42 46 Q60 43 78 46" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="34" cy="45" rx="5" ry="3.5" fill="#fef08a" stroke="#ffffff" stroke-width="1"/>
    <ellipse cx="86" cy="45" rx="5" ry="3.5" fill="#fef08a" stroke="#ffffff" stroke-width="1"/>
    <path d="M33 53 Q60 48 87 53 L84 75 Q60 72 36 75 Z" fill="url(#glassFront)"/>
    <path d="M45 53 L41 73 L47 73 L51 53 Z" fill="#ffffff" opacity="0.35"/>
    <rect x="33" y="74" width="54" height="74" rx="8" fill="url(#busRoof3d)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    <rect x="42" y="86" width="36" height="26" rx="5" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
    <line x1="47" y1="92" x2="73" y2="92" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="47" y1="97" x2="73" y2="97" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="47" y1="102" x2="73" y2="102" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="36" y="118" width="48" height="6" rx="2" fill="#38bdf8" opacity="0.8"/>
    <rect x="36" y="126" width="48" height="3" rx="1.5" fill="#ffffff" opacity="0.9"/>
    <path d="M37 148 Q60 151 83 148 L81 144 Q60 146 39 144 Z" fill="#0f172a"/>
    <rect x="29" y="150" width="7" height="3.5" rx="1.5" fill="#ef4444" stroke="#fca5a5" stroke-width="0.75"/>
    <rect x="84" y="150" width="7" height="3.5" rx="1.5" fill="#ef4444" stroke="#fca5a5" stroke-width="0.75"/>
  </g>
</svg>`;

function createBusIcon(isMoving, isOffline = false, bearing = 0, speed = 0, busId = 'BUS01') {
  const offlineTag = isOffline ? '<span class="bus-3d-offline-tag">ออฟไลน์</span>' : '';
  const roundedBearing = Math.round(bearing || 0);
  const roundedSpeed = Math.round(speed || 0);
  const offlineFilter = isOffline ? 'style="filter: grayscale(0.8) opacity(0.8);"' : '';

  return L.divIcon({
    className: 'bus-3d-leaflet-marker',
    html: `
      <div class="bus-3d-wrapper ${isMoving ? 'is-moving' : 'is-stopped'} ${isOffline ? 'is-offline' : ''}">
        <!-- 1. Floating 3D HUD Tag -->
        <div class="bus-3d-floating-tag">
          <span class="bus-tag-dot ${isOffline ? 'offline' : isMoving ? 'live' : 'idle'}"></span>
          <span class="bus-tag-name">${busId}</span>
          ${!isOffline && isMoving && roundedSpeed > 0 ? `<span class="bus-tag-speed">${roundedSpeed} km/h</span>` : ''}
        </div>

        <!-- 2. Rotating 3D Vehicle Chassis -->
        <div class="bus-3d-rotator" style="transform: rotate(${roundedBearing}deg);">
          <div class="bus-3d-chassis ${isMoving && !isOffline ? 'bounce-motion' : ''}">
            <div class="bus-3d-img" ${offlineFilter}>${BUS_SVG_INLINE}</div>
          </div>
        </div>

        ${offlineTag}
      </div>
    `,
    iconSize: [60, 90],
    iconAnchor: [30, 45],
    popupAnchor: [0, -48]
  });
}

/**
 * Creates custom User Location DivIcon with pulsing wave ring
 */
function createUserMarkerIcon() {
  return L.divIcon({
    className: 'user-location-div-icon',
    html: `
      <div class="user-location-pulse-wrap">
        <div class="user-pulse-ring"></div>
        <div class="user-core-dot"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

/**
 * Native Leaflet Map Controller Component
 */
export function CampusMap({
  busData,
  historyTrail = [],
  stops = CAMPUS_STOPS,
  autoCenter,
  onToggleCenter,
  onDragMap,
  selectedLayer,
  onSelectLayer,
  showStops,
  onToggleStops,
  showRoute,
  onToggleRoute,
  showTrail,
  onToggleTrail,
  flyToTarget,
  isOffline,
  userLocation = null,
  nearestUserStop = null,
  onLocateUser
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLayersRef = useRef({});
  const currentBaseLayerRef = useRef(null);
  const busMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const stopsLayerGroupRef = useRef(null);
  const routePolylineRef = useRef(null);
  const prevLatLngRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastUpdateMsRef = useRef(null);
  const lastPanTimeRef = useRef(0);

  // Keep callback reference updated without triggering re-init
  const onDragMapRef = useRef(onDragMap);
  useEffect(() => {
    onDragMapRef.current = onDragMap;
  });

  // 1. Initialize Map Instance (Only ONCE on mount)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Guard against double initialization (e.g. React StrictMode)
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const map = L.map(container, {
      center: CONFIG.defaultCenter,
      zoom: CONFIG.defaultZoom,
      zoomControl: false
    });

    mapInstanceRef.current = map;

    // Zoom control on top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Tile Layers
    const googleRoadmap = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
      }
    );

    const googleSatellite = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
      }
    );

    const cartoVoyager = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
      }
    );

    const cartoDark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
      }
    );

    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    );

    baseLayersRef.current = {
      google_roadmap: googleRoadmap,
      google_satellite: googleSatellite,
      carto_voyager: cartoVoyager,
      carto_dark: cartoDark,
      osm: osm
    };

    // Default layer: google_roadmap
    currentBaseLayerRef.current = googleRoadmap;
    googleRoadmap.addTo(map);

    // Stops Layer Group
    const stopsGroup = L.layerGroup().addTo(map);
    stopsLayerGroupRef.current = stopsGroup;

    // Campus Stops Markers (Combined 1: Floating Name Badge + 2: 3D Emerald Pin)
    stops.forEach(stop => {
      const stopNum = parseInt(stop.id.replace(/\D/g, ''), 10) || '';
      const stopCustomIcon = L.divIcon({
        className: 'custom-stop-div-icon',
        html: `
          <div class="stop-marker-combo">
            <!-- 1. Permanent Floating Name Badge -->
            <div class="stop-floating-badge">
              <span class="stop-badge-num">${stopNum}</span>
              <span class="stop-badge-name">${stop.name}</span>
            </div>

            <!-- 2. 3D Glassmorphic Emerald Pin -->
            <div class="stop-pin-3d">
              <div class="stop-pin-head">
                <svg viewBox="0 0 24 24" class="stop-pin-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"></path>
                  <circle cx="7.5" cy="15.5" r="1.5" fill="currentColor"></circle>
                  <circle cx="16.5" cy="15.5" r="1.5" fill="currentColor"></circle>
                  <path d="M6 10h12"></path>
                </svg>
              </div>
              <div class="stop-pin-tip"></div>
              <div class="stop-ground-shadow"></div>
            </div>
          </div>
        `,
        iconSize: [180, 80],
        iconAnchor: [90, 72],
        popupAnchor: [0, -70]
      });

      L.marker([stop.lat, stop.lng], { icon: stopCustomIcon })
        .bindPopup(`
          <div class="popup-stop-card">
            <div class="popup-stop-header">
              <span class="popup-stop-badge">🚏 ป้ายที่ ${stopNum}</span>
              <h4 class="popup-stop-title">${stop.name}</h4>
            </div>
            <div class="popup-stop-footer">
              <span class="popup-stop-tag">● จุดจอดรับ-ส่งนักศึกษา</span>
            </div>
          </div>
        `, { maxWidth: 260, minWidth: 190 })
        .addTo(stopsGroup);
    });

    // Route Polyline Loop (Removed per user request)
    // routePolylineRef.current = ...

    // History Trail Polyline — removed

    // User Drag event disables AutoCenter
    map.on('dragstart', () => {
      if (onDragMapRef.current) {
        onDragMapRef.current();
      }
    });

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
      busMarkerRef.current = null;
      userMarkerRef.current = null;
      stopsLayerGroupRef.current = null;
      routePolylineRef.current = null;
    };
  }, []); // Run ONLY once on mount!

  // 2. Base Tile Layer switcher effect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetLayer = baseLayersRef.current[selectedLayer];
    if (targetLayer && targetLayer !== currentBaseLayerRef.current) {
      if (currentBaseLayerRef.current && map.hasLayer(currentBaseLayerRef.current)) {
        map.removeLayer(currentBaseLayerRef.current);
      }
      targetLayer.addTo(map);
      currentBaseLayerRef.current = targetLayer;
    }
  }, [selectedLayer]);

  // 3. Layer Toggles (Stops, Route, Trail)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (stopsLayerGroupRef.current) {
      if (showStops) {
        if (!map.hasLayer(stopsLayerGroupRef.current)) stopsLayerGroupRef.current.addTo(map);
      } else {
        if (map.hasLayer(stopsLayerGroupRef.current)) map.removeLayer(stopsLayerGroupRef.current);
      }
    }

    if (routePolylineRef.current) {
      if (showRoute) {
        if (!map.hasLayer(routePolylineRef.current)) routePolylineRef.current.addTo(map);
      } else {
        if (map.hasLayer(routePolylineRef.current)) map.removeLayer(routePolylineRef.current);
      }
    }


  }, [showStops, showRoute, showTrail]);



  // 5. Update Bus Marker and Auto Center
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // ถ้าไม่มี busData เลย ไม่ต้องทำอะไร
    if (!busData) {
      console.log('[CampusMap] busData is null — marker not yet created');
      return;
    }

    console.log('[CampusMap] busData update:', busData.latitude, busData.longitude, 'offline:', isOffline);

    // เมื่อรถ Offline ให้แสดง marker แบบ offline style (ไม่ลบออก)
    if (isOffline) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      const latLng = [busData.latitude, busData.longitude];
      const offlineIcon = createBusIcon(false, true, busData.bearing ?? 0, 0, busData.busId || 'BUS01');
      if (!busMarkerRef.current) {
        busMarkerRef.current = L.marker(latLng, { icon: offlineIcon }).addTo(map);
      } else {
        if (!map.hasLayer(busMarkerRef.current)) busMarkerRef.current.addTo(map);
        busMarkerRef.current.setIcon(offlineIcon);
        busMarkerRef.current.setLatLng(latLng);
      }
      return;
    }

    const latLng = [busData.latitude, busData.longitude];
    const bearing = busData.bearing ?? 0;
    const speed = busData.speed ?? 0;
    const busId = busData.busId || 'BUS01';
    const busIcon = createBusIcon(busData.isMoving, false, bearing, speed, busId);
    const timeOnly = busData.recordedAt ? busData.recordedAt.split(' ')[1] || busData.recordedAt : '-';

    const popupHtml = `
      <div class="popup-bus-card">
        <h4>🚌 ${busData.busName || 'Shuttle'} (${busId})</h4>
        ${busData.isMoving ? `<p><strong>ความเร็ว:</strong> ${speed.toFixed(1)} km/h</p>` : ''}
        <p><strong>ทิศทางหน้ารถ:</strong> ${Math.round(bearing)}°</p>
        <p><strong>ดาวเทียม:</strong> ${busData.satellites} ดวง</p>
        <p><strong>อัปเดตล่าสุด:</strong> ${timeOnly}</p>
        <div>
          <span class="popup-badge ${busData.isMoving ? 'quality-good' : 'quality-weak'}">
            ${busData.isMoving ? '● กำลังวิ่ง' : '● จอดอยู่'}
          </span>
        </div>
      </div>
    `;

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker(latLng, { icon: busIcon })
        .addTo(map)
        .bindPopup(popupHtml);

      prevLatLngRef.current = latLng;
      map.setView(latLng, CONFIG.defaultZoom);
    } else {
      if (!map.hasLayer(busMarkerRef.current)) {
        busMarkerRef.current.addTo(map);
      }
      busMarkerRef.current.setIcon(busIcon);
      busMarkerRef.current.setPopupContent(popupHtml);

      // Smooth position interpolation across consecutive GPS coordinates
      const prev = prevLatLngRef.current;
      if (prev && (prev[0] !== latLng[0] || prev[1] !== latLng[1])) {
        // Start from wherever the marker is RIGHT NOW on screen to avoid jumps
        const currentMarkerPos = busMarkerRef.current.getLatLng();
        const startLat = currentMarkerPos.lat;
        const startLng = currentMarkerPos.lng;
        
        const isHighSpeed = speed >= 20; // High speed mode (20+ km/h)
        let targetLat = latLng[0];
        let targetLng = latLng[1];

        // ── High-Speed Dead Reckoning / Latency Compensation ──
        // When vehicle moves at 40+ km/h (11.1 m/s), network and sensor transit latency (~350ms)
        // causes the reported coordinate to be physically 3.5 - 5 meters behind reality.
        // We project the target forward along bearing to keep marker matched with real vehicle.
        if (isHighSpeed && bearing) {
          const speedMps = speed / 3.6;
          const leadDistanceM = Math.min(15, speedMps * 0.35);
          const [projectedLat, projectedLng] = projectCoordinates(targetLat, targetLng, bearing, leadDistanceM);
          targetLat = projectedLat;
          targetLng = projectedLng;
        }

        const now = performance.now();
        const interval = lastUpdateMsRef.current ? (now - lastUpdateMsRef.current) : 1000;
        lastUpdateMsRef.current = now;

        // Dynamic duration: at high speeds, catch up rapidly (150-320ms) instead of lagging for 1000ms
        const duration = isHighSpeed
          ? Math.min(320, Math.max(120, interval * 0.35))
          : Math.min(1200, Math.max(150, interval));
        const startTime = now;

        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }

        const animateMarker = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);

          // Linear interpolation for constant smooth velocity without stuttering
          const currentLat = startLat + (targetLat - startLat) * progress;
          const currentLng = startLng + (targetLng - startLng) * progress;

          if (busMarkerRef.current) {
            busMarkerRef.current.setLatLng([currentLat, currentLng]);
          }

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animateMarker);
          }
        };

        animFrameRef.current = requestAnimationFrame(animateMarker);
      } else {
        busMarkerRef.current.setLatLng(latLng);
      }

      prevLatLngRef.current = latLng;

      if (autoCenter) {
        const now = performance.now();
        const isHighSpeed = speed >= 20;
        const panInterval = isHighSpeed ? 350 : 600;
        const panDuration = isHighSpeed ? 0.35 : 0.6;

        // Throttle camera panTo so rapid updates don't thrash Leaflet's camera
        if (now - lastPanTimeRef.current > panInterval) {
          lastPanTimeRef.current = now;
          map.panTo(latLng, { animate: true, duration: panDuration });
        }
      }
    }
  }, [busData, autoCenter, isOffline]);

  // 6. Handle User Location Marker on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!userLocation || !userLocation.lat || !userLocation.lng) {
      if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
        map.removeLayer(userMarkerRef.current);
      }
      return;
    }

    const userLatLng = [userLocation.lat, userLocation.lng];
    const userIcon = createUserMarkerIcon();
    const popupHtml = `
      <div class="popup-user-card">
        <h4>📍 ตำแหน่งของคุณ</h4>
        ${nearestUserStop ? `<p>ป้ายที่ใกล้ที่สุด: <strong>${nearestUserStop.name}</strong></p>` : ''}
        <span class="popup-user-tag">● พิกัด GPS มือถือของคุณ</span>
      </div>
    `;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 700 })
        .addTo(map)
        .bindPopup(popupHtml);
    } else {
      if (!map.hasLayer(userMarkerRef.current)) {
        userMarkerRef.current.addTo(map);
      }
      userMarkerRef.current.setLatLng(userLatLng);
      userMarkerRef.current.setPopupContent(popupHtml);
    }
  }, [userLocation, nearestUserStop]);

  // 7. Handle flyTo target (clicking stop or center button)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToTarget) return;

    map.flyTo(flyToTarget.coords, flyToTarget.zoom || CONFIG.defaultZoom, {
      animate: true,
      duration: 1.0
    });
  }, [flyToTarget]);

  return (
    <section className="map-panel" aria-label="แผนที่ตำแหน่งรถ">
      <div className="map-header">
        <div className="map-title">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
            <line x1="9" y1="3" x2="9" y2="18"></line>
            <line x1="15" y1="6" x2="15" y2="21"></line>
          </svg>
          <span>แผนที่ติดตามตำแหน่งแบบเรียลไทม์ (Live Campus Map)</span>
        </div>

        <MapControls
          selectedLayer={selectedLayer}
          onSelectLayer={onSelectLayer}
          autoCenter={autoCenter}
          onToggleCenter={onToggleCenter}
          isOffline={isOffline}
          onLocateUser={onLocateUser}
          hasUserLocation={!!userLocation}
        />
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} id="map" className="map-container-box"></div>

      {/* Floating HUD on Map - ซ่อนเมื่อ Offline, ซ่อนความเร็วเมื่อจอด */}
      <MapHudOverlay
        speed={busData?.speed ?? 0}
        isOffline={isOffline}
        isMoving={busData?.isMoving ?? false}
      />
    </section>
  );
}
