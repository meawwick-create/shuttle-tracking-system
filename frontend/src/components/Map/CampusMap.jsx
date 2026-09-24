import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CONFIG, CAMPUS_STOPS } from '../../config/campusConfig';
import { MapControls } from './MapControls';
import { MapHudOverlay } from './MapHudOverlay';

/**
 * Creates custom Bus Marker DivIcon with pulse animation
 * @param {boolean} isMoving
 */
function createBusIcon(isMoving) {
  const pulseHtml = isMoving ? '<div class="bus-marker-pulse-ring"></div>' : '';
  return L.divIcon({
    className: 'bus-custom-marker',
    html: `
      ${pulseHtml}
      <img src="/images/bus-marker.svg" class="bus-marker-img" alt="Shuttle Bus" />
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22]
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
  isOffline
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLayersRef = useRef({});
  const currentBaseLayerRef = useRef(null);
  const busMarkerRef = useRef(null);
  const stopsLayerGroupRef = useRef(null);
  const routePolylineRef = useRef(null);
  const historyTrailRef = useRef(null);

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

    // Campus Stops Markers
    const stopIcon = L.icon({
      iconUrl: '/images/bus-stop.svg',
      iconSize: [32, 32],
      iconAnchor: [16, 30],
      popupAnchor: [0, -28]
    });

    stops.forEach(stop => {
      L.marker([stop.lat, stop.lng], { icon: stopIcon })
        .bindPopup(`
          <div style="font-family: var(--font-base); font-size: 0.875rem;">
            <strong style="color: #059669;">🚏 ${stop.name}</strong><br>
            <span style="color: #64748b; font-size: 0.75rem;">รหัสป้าย: ${stop.id}</span>
          </div>
        `)
        .addTo(stopsGroup);
    });

    // Route Polyline Loop (Removed per user request)
    // routePolylineRef.current = ...

    // History Trail Polyline
    historyTrailRef.current = L.polyline([], {
      color: '#2563eb',
      weight: 4,
      opacity: 0.7,
      dashArray: '6, 8',
      lineCap: 'round'
    }).addTo(map);

    // User Drag event disables AutoCenter
    map.on('dragstart', () => {
      if (onDragMapRef.current) {
        onDragMapRef.current();
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      busMarkerRef.current = null;
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

    if (historyTrailRef.current) {
      if (showTrail) {
        if (!map.hasLayer(historyTrailRef.current)) historyTrailRef.current.addTo(map);
      } else {
        if (map.hasLayer(historyTrailRef.current)) map.removeLayer(historyTrailRef.current);
      }
    }
  }, [showStops, showRoute, showTrail]);

  // 4. Update History Trail Coordinates
  useEffect(() => {
    if (historyTrailRef.current && historyTrail.length > 0) {
      historyTrailRef.current.setLatLngs(historyTrail);
    }
  }, [historyTrail]);

  // 5. Update Bus Marker and Auto Center
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !busData) return;

    if (isOffline) {
      if (busMarkerRef.current && map.hasLayer(busMarkerRef.current)) {
        map.removeLayer(busMarkerRef.current);
      }
      return;
    }

    const latLng = [busData.latitude, busData.longitude];
    const busIcon = createBusIcon(busData.isMoving);
    const timeOnly = busData.recordedAt ? busData.recordedAt.split(' ')[1] || busData.recordedAt : '-';

    const popupHtml = `
      <div class="popup-bus-card">
        <h4>🚌 ${busData.busName || 'Shuttle'} (${busData.busId || 'BUS01'})</h4>
        ${(busData.isMoving && !isOffline) ? `<p><strong>ความเร็ว:</strong> ${busData.speed.toFixed(1)} km/h</p>` : ''}
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

      map.setView(latLng, CONFIG.defaultZoom);
    } else {
      if (!map.hasLayer(busMarkerRef.current)) {
        busMarkerRef.current.addTo(map);
      }
      busMarkerRef.current.setIcon(busIcon);
      busMarkerRef.current.setLatLng(latLng);
      busMarkerRef.current.setPopupContent(popupHtml);

      if (autoCenter) {
        map.panTo(latLng, { animate: true, duration: 1.0 });
      }
    }
  }, [busData, autoCenter, isOffline]);

  // 6. Handle flyTo target (clicking stop or center button)
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
          showStops={showStops}
          onToggleStops={onToggleStops}
          showRoute={showRoute}
          onToggleRoute={onToggleRoute}
          showTrail={showTrail}
          onToggleTrail={onToggleTrail}
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
