import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CONFIG, CAMPUS_STOPS } from '../../config/campusConfig';
import { projectCoordinates, getShortestAngleDelta } from '../../utils/geoUtils';
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
function createBusIcon(isMoving, isOffline = false, bearing = 0, speed = 0, busId = 'BUS01') {
  const offlineTag = isOffline ? '<span class="bus-3d-offline-tag">ออฟไลน์</span>' : '';
  const roundedBearing = Math.round(bearing || 0);
  const roundedSpeed = Math.round(speed || 0);

  return L.divIcon({
    className: 'bus-3d-leaflet-marker',
    html: `
      <div class="bus-3d-wrapper ${isMoving ? 'is-moving' : 'is-stopped'} ${isOffline ? 'is-offline' : ''}">
        <!-- 1. Floating 3D HUD Tag (Stays upright regardless of vehicle rotation) -->
        <div class="bus-3d-floating-tag">
          <span class="bus-tag-dot ${isOffline ? 'offline' : isMoving ? 'live' : 'idle'}"></span>
          <span class="bus-tag-name">${busId}</span>
          ${!isOffline && isMoving && roundedSpeed > 0 ? `<span class="bus-tag-speed">${roundedSpeed} km/h</span>` : `<span class="bus-tag-speed" style="display:none">0 km/h</span>`}
        </div>

        <!-- 2. Rotating 3D Vehicle Chassis (Smoothly turns to match road heading) -->
        <div class="bus-3d-rotator" style="transform: rotate(${roundedBearing}deg);">
          <div class="bus-3d-chassis ${isMoving && !isOffline ? 'bounce-motion' : ''}">
            <img src="/images/bus-3d.svg" class="bus-3d-img ${isOffline ? 'offline' : ''}" alt="3D Shuttle Bus" />
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
  const currentContinuousBearingRef = useRef(null);
  const targetContinuousBearingRef = useRef(null);
  const lastAngularVelocityRef = useRef(0);

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
      historyTrailRef.current = null;
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
    if (!map || !busData) return;

    // เมื่อรถ Offline ให้ซ่อนหมุดรถออกจากแผนที่
    if (isOffline) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (busMarkerRef.current && map.hasLayer(busMarkerRef.current)) {
        map.removeLayer(busMarkerRef.current);
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
      currentContinuousBearingRef.current = bearing;
      targetContinuousBearingRef.current = bearing;

      busMarkerRef.current = L.marker(latLng, { icon: busIcon })
        .addTo(map)
        .bindPopup(popupHtml);

      prevLatLngRef.current = latLng;
      map.setView(latLng, CONFIG.defaultZoom);
    } else {
      if (!map.hasLayer(busMarkerRef.current)) {
        busMarkerRef.current.addTo(map);
      }

      // Update DOM contents in-place without calling setIcon (prevents tearing down DOM during turns)
      const markerEl = busMarkerRef.current.getElement();
      if (markerEl) {
        const wrapper = markerEl.querySelector('.bus-3d-wrapper');
        if (wrapper) {
          wrapper.className = `bus-3d-wrapper ${busData.isMoving ? 'is-moving' : 'is-stopped'} ${isOffline ? 'is-offline' : ''}`;
        }
        const tagDot = markerEl.querySelector('.bus-tag-dot');
        if (tagDot) {
          tagDot.className = `bus-tag-dot ${isOffline ? 'offline' : busData.isMoving ? 'live' : 'idle'}`;
        }
        const tagName = markerEl.querySelector('.bus-tag-name');
        if (tagName && tagName.textContent !== busId) {
          tagName.textContent = busId;
        }
        const speedEl = markerEl.querySelector('.bus-tag-speed');
        const roundedSpeed = Math.round(speed || 0);
        if (speedEl) {
          if (!isOffline && busData.isMoving && roundedSpeed > 0) {
            speedEl.textContent = `${roundedSpeed} km/h`;
            speedEl.style.display = '';
          } else {
            speedEl.style.display = 'none';
          }
        }
        const chassis = markerEl.querySelector('.bus-3d-chassis');
        if (chassis) {
          if (busData.isMoving && !isOffline) {
            chassis.classList.add('bounce-motion');
          } else {
            chassis.classList.remove('bounce-motion');
          }
        }
      } else {
        busMarkerRef.current.setIcon(busIcon);
      }

      busMarkerRef.current.setPopupContent(popupHtml);

      // Smooth position and rotation interpolation
      if (currentContinuousBearingRef.current === null) {
        currentContinuousBearingRef.current = bearing;
      }
      const startBearing = currentContinuousBearingRef.current;
      let angleDelta = getShortestAngleDelta(startBearing, bearing);

      // In a 180° dead U-turn, follow previous angular turn direction (or default clockwise for Thailand LHT)
      if (Math.abs(angleDelta) === 180) {
        angleDelta = lastAngularVelocityRef.current < 0 ? -180 : 180;
      }
      if (Math.abs(angleDelta) > 0.1) {
        lastAngularVelocityRef.current = angleDelta;
      }

      const endBearing = startBearing + angleDelta;
      targetContinuousBearingRef.current = endBearing;

      const prev = prevLatLngRef.current;
      const hasCoordChange = prev && (prev[0] !== latLng[0] || prev[1] !== latLng[1]);
      const hasBearingChange = Math.abs(angleDelta) > 0.5;

      if (hasCoordChange || hasBearingChange) {
        // Start from wherever the marker is RIGHT NOW on screen to avoid jumps
        const currentMarkerPos = busMarkerRef.current.getLatLng();
        const startLat = currentMarkerPos.lat;
        const startLng = currentMarkerPos.lng;
        
        const isHighSpeed = speed >= 20; // High speed mode (20+ km/h)
        let targetLat = latLng[0];
        let targetLng = latLng[1];

        // ── High-Speed Dead Reckoning / Latency Compensation ──
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

        // Dynamic duration tailored for smooth motion & turning
        const duration = isHighSpeed
          ? Math.min(320, Math.max(120, interval * 0.35))
          : Math.min(1000, Math.max(250, interval));
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

            // Heading: smooth cubic ease-in-out for realistic vehicle steering rotation
            const turnEase = progress < 0.5
              ? 2 * progress * progress
              : -1 + (4 - 2 * progress) * progress;
            const currentRot = startBearing + (endBearing - startBearing) * turnEase;
            currentContinuousBearingRef.current = currentRot;

            const el = busMarkerRef.current.getElement();
            if (el) {
              const rotator = el.querySelector('.bus-3d-rotator');
              if (rotator) {
                rotator.style.transform = `rotate(${currentRot.toFixed(1)}deg)`;
              }
            }
          }

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animateMarker);
          } else {
            currentContinuousBearingRef.current = endBearing;
          }
        };

        animFrameRef.current = requestAnimationFrame(animateMarker);
      } else {
        busMarkerRef.current.setLatLng(latLng);
        currentContinuousBearingRef.current = endBearing;
        const el = busMarkerRef.current.getElement();
        if (el) {
          const rotator = el.querySelector('.bus-3d-rotator');
          if (rotator) {
            rotator.style.transform = `rotate(${endBearing.toFixed(1)}deg)`;
          }
        }
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
