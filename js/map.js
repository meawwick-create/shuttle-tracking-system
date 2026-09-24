/**
 * Shuttle Tracking System - map.js
 * Leaflet.js Real-time Tracking Engine with OpenStreetMap
 * Project: ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษาภายในมหาวิทยาลัย
 */

// ==========================================================================
// 1. Global Configurations & State
// ==========================================================================
const CONFIG = {
  fetchIntervalMs: 1000,       // ดึงข้อมูลทุก 1 วินาที
  offlineThresholdSec: 30,     // เกิน 30 วินาที ถือว่า Offline
  defaultZoom: 17,
  defaultCenter: [9.0954688, 99.3576160], // พิกัดเริ่มต้น (มหาวิทยาลัย)
};

const STATE = {
  map: null,
  baseLayers: {},
  currentBaseLayer: null,
  busMarker: null,
  historyTrail: null,
  trailCoordinates: [],
  stopsLayerGroup: null,
  routePolyline: null,
  showStops: true,
  showRoute: true,
  showTrail: true,
  autoCenter: true,
  lastRecordedDate: null,
  lastSuccessfulFetchTime: null,
  isOffline: false,
  activeBusId: 'BUS01'
};

// University Sample Bus Stops (จุดจอดรถรับ-ส่งรอบมหาวิทยาลัย เรียงลำดับตามแนวถนนรอบ ม.)
const CAMPUS_STOPS = [
  { id: 'STOP01', name: 'ประตูหน้ามหาวิทยาลัย (Main Gate)', lat: 9.0968, lng: 99.3562 },
  { id: 'STOP02', name: 'อาคารเรียนรวม (Central Lecture)', lat: 9.0955, lng: 99.3582 },
  { id: 'STOP03', name: 'หอพักนักศึกษา (Dormitories)', lat: 9.0932, lng: 99.3592 },
  { id: 'STOP04', name: 'สำนักวิทยบริการ / หอสมุด', lat: 9.0942, lng: 99.3572 },
  { id: 'STOP05', name: 'ศูนย์กีฬาและโรงอาหารกลาง', lat: 9.0945, lng: 99.3552 }
];

// ==========================================================================
// 2. DOM Elements Cache
// ==========================================================================
const DOM = {
  livePill: document.getElementById('liveStatusPill'),
  livePillText: document.getElementById('liveStatusText'),
  clock: document.getElementById('liveClock'),
  busName: document.getElementById('busName'),
  busIdTag: document.getElementById('busIdTag'),
  motionBadge: document.getElementById('motionBadge'),
  motionBadgeText: document.getElementById('motionBadgeText'),
  speedNumber: document.getElementById('speedNumber'),
  speedBarFill: document.getElementById('speedBarFill'),
  hudSpeed: document.getElementById('hudSpeed'),
  hudStatus: document.getElementById('hudStatus'),
  valLat: document.getElementById('valLatitude'),
  valLng: document.getElementById('valLongitude'),
  satellites: document.getElementById('valSatellites'),
  lastUpdate: document.getElementById('valLastUpdate'),
  timeAgo: document.getElementById('timeAgoBadge'),
  gpsSatCount: document.getElementById('gpsSatCount'),
  gpsQualityBadge: document.getElementById('gpsQualityBadge'),
  meterBars: [
    document.getElementById('meterBar1'),
    document.getElementById('meterBar2'),
    document.getElementById('meterBar3'),
    document.getElementById('meterBar4')
  ],
  btnCenterBus: document.getElementById('btnCenterBus'),
  btnToggleStops: document.getElementById('btnToggleStops'),
  btnToggleRoute: document.getElementById('btnToggleRoute'),
  btnToggleTrail: document.getElementById('btnToggleTrail'),
  btnCopyCoords: document.getElementById('btnCopyCoords'),
  etaStopName: document.getElementById('etaStopName'),
  etaTime: document.getElementById('etaTime'),
  etaDist: document.getElementById('etaDist'),
  stopsListContainer: document.getElementById('stopsListContainer'),
  toast: document.getElementById('toastNotice'),
  busSelect: document.getElementById('busSelect'),
  selectMapLayer: document.getElementById('selectMapLayer')
};

// ==========================================================================
// 3. Leaflet Map Initialization
// ==========================================================================
function initMap() {
  STATE.map = L.map('map', {
    center: CONFIG.defaultCenter,
    zoom: CONFIG.defaultZoom,
    zoomControl: false // ย้ายตำแหน่ง zoom control ให้สวยงาม
  });

  // Zoom control มุมขวาบน
  L.control.zoom({ position: 'topright' }).addTo(STATE.map);

  // รูปแบบแผนที่คุณภาพสูง (Tile Layers)
  // 1. Google Maps Roadmap (แผนที่ถนนมาตรฐาน คมชัด สวยงาม ภาษาไทยครบถ้วน)
  const googleRoadmap = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
  });

  // 2. Google Maps Satellite Hybrid (ภาพถ่ายดาวเทียมคมชัดพร้อมชื่อถนนและสถานที่)
  const googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
  });

  // 3. CartoDB Voyager (สไตล์มินิมอล โมเดิร์น คลีน สีสันสบายตา)
  const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  });

  // 4. CartoDB Dark (สไตล์โหมดมืด เท่ สบายตายามค่ำคืน)
  const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  });

  // 5. OpenStreetMap Standard (แผนที่เดิม)
  const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  STATE.baseLayers = {
    'google_roadmap': googleRoadmap,
    'google_satellite': googleSatellite,
    'carto_voyager': cartoVoyager,
    'carto_dark': cartoDark,
    'osm': osmStandard
  };

  // กำหนดให้ Google Roadmap เป็นแผนที่เริ่มต้น
  STATE.currentBaseLayer = googleRoadmap;
  googleRoadmap.addTo(STATE.map);

  if (DOM.selectMapLayer) {
    DOM.selectMapLayer.value = 'google_roadmap';
  }

  // เพิ่ม Layer Switcher Control บนแผนที่มุมขวาบน
  const baseMapsControl = {
    '🗺️ Google Maps (ถนน)': googleRoadmap,
    '🛰️ ภาพดาวเทียม (Satellite)': googleSatellite,
    '🎨 โมเดิร์น (Voyager)': cartoVoyager,
    '🌙 โหมดมืด (Dark)': cartoDark,
    '📌 OpenStreetMap (เดิม)': osmStandard
  };
  L.control.layers(baseMapsControl, null, { position: 'topright', collapsed: true }).addTo(STATE.map);

  // Layer Group สำหรับป้ายรถ และเส้นทาง
  STATE.stopsLayerGroup = L.layerGroup().addTo(STATE.map);

  // สร้างเส้นประวัติการวิ่ง (History Trail Polyline)
  STATE.historyTrail = L.polyline([], {
    color: '#2563eb',
    weight: 4,
    opacity: 0.7,
    dashArray: '6, 8',
    lineCap: 'round'
  }).addTo(STATE.map);

  // วาดป้ายรถและเส้นทางเดินรถตัวอย่าง
  renderCampusStops();
  renderCampusRoute();

  // Leaflet event เมื่อผู้ใช้ลากแผนที่เอง -> ปิด autoCenter ชั่วคราว
  STATE.map.on('dragstart', () => {
    STATE.autoCenter = false;
    if (DOM.btnCenterBus) DOM.btnCenterBus.classList.remove('active');
  });

  // ซิงค์สถานะ Dropdown เมื่อผู้ใช้เปลี่ยน Layer ผ่านปุ่มบนแผนที่
  STATE.map.on('baselayerchange', (e) => {
    for (const [key, layer] of Object.entries(STATE.baseLayers)) {
      if (layer === e.layer) {
        STATE.currentBaseLayer = layer;
        if (DOM.selectMapLayer) DOM.selectMapLayer.value = key;
        break;
      }
    }
  });
}

// สร้าง Custom Bus Marker ด้วย L.divIcon
function createBusIcon(isMoving) {
  const pulseHtml = isMoving ? '<div class="bus-marker-pulse-ring"></div>' : '';
  return L.divIcon({
    className: 'bus-custom-marker',
    html: `
      ${pulseHtml}
      <img src="images/bus-marker.svg" class="bus-marker-img" alt="Shuttle Bus" />
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22]
  });
}

// สร้างป้ายรถเมล์ในมหาวิทยาลัย (Campus Stops)
function renderCampusStops() {
  STATE.stopsLayerGroup.clearLayers();

  const stopIcon = L.icon({
    iconUrl: 'images/bus-stop.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    popupAnchor: [0, -28]
  });

  CAMPUS_STOPS.forEach(stop => {
    const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon })
      .bindPopup(`
        <div style="font-family: var(--font-base); font-size: 0.875rem;">
          <strong style="color: #059669;">🚏 ${stop.name}</strong><br>
          <span style="color: #64748b; font-size: 0.75rem;">รหัสป้าย: ${stop.id}</span>
        </div>
      `);
    STATE.stopsLayerGroup.addLayer(marker);
  });

  renderStopsListUI();
}

// วาดเส้นทางเดินรถเชื่อมต่อป้ายต่างๆ
function renderCampusRoute() {
  const routePoints = CAMPUS_STOPS.map(s => [s.lat, s.lng]);
  // วนกลับมาป้ายแรกเป็น Loop
  if (routePoints.length > 0) {
    routePoints.push([CAMPUS_STOPS[0].lat, CAMPUS_STOPS[0].lng]);
  }

  STATE.routePolyline = L.polyline(routePoints, {
    color: '#059669',
    weight: 4,
    opacity: 0.65,
    dashArray: '8, 8',
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(STATE.map);
}

// แสดงรายชื่อป้ายใน Sidebar
function renderStopsListUI() {
  if (!DOM.stopsListContainer) return;
  DOM.stopsListContainer.innerHTML = '';

  CAMPUS_STOPS.forEach((stop, index) => {
    const li = document.createElement('li');
    li.className = 'stop-item';
    li.setAttribute('data-stop-id', stop.id);
    li.innerHTML = `
      <div class="stop-name-group">
        <span class="stop-dot"></span>
        <span>${index + 1}. ${stop.name}</span>
      </div>
      <span style="color: var(--text-muted); font-size: 0.75rem;">${stop.id}</span>
    `;
    li.addEventListener('click', () => {
      STATE.map.flyTo([stop.lat, stop.lng], 18, { animate: true, duration: 1 });
    });
    DOM.stopsListContainer.appendChild(li);
  });
}

// ==========================================================================
// 4. Data Fetching & Real-time Update Loop
// ==========================================================================
async function fetchBusLocation() {
  try {
    // ป้องกัน Browser Cache ด้วย Query String timestamp
    const url = `get_location.php?t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    if (json.status === 'success' && json.data) {
      STATE.lastSuccessfulFetchTime = Date.now();
      handleLocationData(json.data);
    } else {
      console.warn('Backend returned non-success or empty status:', json);
      setSystemStatus(false, 'ไม่มีข้อมูล');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    // เมื่อเกิดข้อผิดพลาดในการเชื่อมต่อ ให้แสดง Offline
    setSystemStatus(false, 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
  }
}

// จัดการและอัปเดตข้อมูลพิกัด
function handleLocationData(bus) {
  const lat = parseFloat(bus.latitude);
  const lng = parseFloat(bus.longitude);
  const speed = parseFloat(bus.speed) || 0.0;
  const satellites = parseInt(bus.satellites, 10) || 0;
  const isMoving = speed > 3.0;

  // ตรวจสอบความถูกต้องของพิกัด GPS
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    console.warn('Invalid GPS Coordinates received:', lat, lng);
    return;
  }

  // แปลง recorded_at เป็น Date object
  // รูปแบบ "YYYY-MM-DD HH:mm:ss"
  const recordedTime = parseSqlDate(bus.recorded_at);
  STATE.lastRecordedDate = recordedTime;

  // ตรวจสอบว่าข้อมูลเก่าเกิน 30 วินาทีหรือไม่ (Offline Check)
  checkDataFreshness();

  // 1. อัปเดต Marker บน Leaflet Map
  updateMapMarker(lat, lng, bus, speed, satellites, isMoving);

  // 2. อัปเดตประวัติเส้นทาง (Breadcrumbs Trail)
  updateHistoryTrail(lat, lng);

  // 3. อัปเดตข้อมูล UI Card
  updateBusInfoCard(bus, speed, isMoving);

  // 4. อัปเดต GPS Status Card
  updateGpsStatusCard(satellites);

  // 5. คำนวณป้ายรถที่ใกล้ที่สุด & ETA
  calculateNearestStopAndETA(lat, lng, speed);
}

// แปลงวันที่ SQL ("2026-09-10 16:06:32") ให้เป็น Date Object ป้องกัน timezone mismatch
function parseSqlDate(sqlDateStr) {
  if (!sqlDateStr) return new Date();
  // แปลง "YYYY-MM-DD HH:mm:ss" -> ISO "YYYY-MM-DDTHH:mm:ss"
  const isoStr = sqlDateStr.replace(' ', 'T');
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ตรวจสอบอายุข้อมูล (Live vs Offline 30 วินาที)
function checkDataFreshness() {
  if (!STATE.lastRecordedDate) {
    setSystemStatus(false, 'รอข้อมูล...');
    return;
  }

  const now = Date.now();
  const recordedMs = STATE.lastRecordedDate.getTime();
  const ageSeconds = Math.max(0, Math.floor((now - recordedMs) / 1000));

  // หากข้อมูลอายุเกิน 30 วินาที หรือ fetch ล่าสุดเกิน 30 วินาที
  if (ageSeconds > CONFIG.offlineThresholdSec) {
    setSystemStatus(false, 'Offline');
  } else {
    setSystemStatus(true, 'Live Tracking');
  }
}

// ตั้งค่าสถานะระบบบน Navbar (Live Tracking เขียว / Offline แดง)
function setSystemStatus(isLive, labelText) {
  STATE.isOffline = !isLive;

  if (DOM.livePill) {
    if (isLive) {
      DOM.livePill.classList.remove('offline');
      DOM.livePillText.textContent = labelText || 'Live Tracking';
    } else {
      DOM.livePill.classList.add('offline');
      DOM.livePillText.textContent = labelText || 'Offline';
    }
  }

  if (DOM.hudStatus) {
    DOM.hudStatus.textContent = isLive ? 'LIVE' : 'OFFLINE';
    DOM.hudStatus.style.color = isLive ? 'var(--status-moving)' : 'var(--status-offline)';
  }
}

// อัปเดต Leaflet Marker
function updateMapMarker(lat, lng, bus, speed, satellites, isMoving) {
  const latLng = [lat, lng];
  const busIcon = createBusIcon(isMoving);

  // ตัดสตริงเวลาให้อ่านง่าย เช่น 16:06:32
  const timeOnly = bus.recorded_at ? bus.recorded_at.split(' ')[1] || bus.recorded_at : '-';

  const popupHtml = `
    <div class="popup-bus-card">
      <h4>🚌 ${escapeHtml(bus.bus_name || 'Shuttle')} (${escapeHtml(bus.bus_id || 'BUS01')})</h4>
      <p><strong>ความเร็ว:</strong> ${speed.toFixed(1)} km/h</p>
      <p><strong>ดาวเทียม:</strong> ${satellites} ดวง</p>
      <p><strong>อัปเดตล่าสุด:</strong> ${timeOnly}</p>
      <div>
        <span class="popup-badge ${isMoving ? 'quality-good' : 'quality-weak'}">
          ${isMoving ? '● กำลังวิ่ง' : '● จอดอยู่'}
        </span>
      </div>
    </div>
  `;

  if (STATE.busMarker === null) {
    // สร้าง Marker ครั้งแรก
    STATE.busMarker = L.marker(latLng, { icon: busIcon })
      .addTo(STATE.map)
      .bindPopup(popupHtml);

    // เลื่อนแผนที่ไปหาตำแหน่งรถ
    STATE.map.setView(latLng, CONFIG.defaultZoom);
  } else {
    // อัปเดตตำแหน่งอย่างนุ่มนวล
    STATE.busMarker.setIcon(busIcon);
    STATE.busMarker.setLatLng(latLng);

    // อัปเดตเนื้อหา Popup
    STATE.busMarker.setPopupContent(popupHtml);

    // ถ้าเปิด Auto Center ให้เลื่อนตาม
    if (STATE.autoCenter) {
      STATE.map.panTo(latLng, { animate: true, duration: 1.0 });
    }
  }
}

// อัปเดต Polyline ประวัติการวิ่ง
function updateHistoryTrail(lat, lng) {
  const coords = STATE.trailCoordinates;
  const lastPoint = coords.length > 0 ? coords[coords.length - 1] : null;

  // เพิ่มพิกัดถ้าตำแหน่งเปลี่ยนไปจริง
  if (!lastPoint || lastPoint[0] !== lat || lastPoint[1] !== lng) {
    coords.push([lat, lng]);
    // เก็บประวัติสูงสุด 100 จุดล่าสุด
    if (coords.length > 100) coords.shift();

    if (STATE.historyTrail && STATE.showTrail) {
      STATE.historyTrail.setLatLngs(coords);
    }
  }
}

// ==========================================================================
// 5. UI Updates (Bus Details, Speedometer, GPS Status)
// ==========================================================================
function updateBusInfoCard(bus, speed, isMoving) {
  if (DOM.busName) DOM.busName.textContent = bus.bus_name || 'Shuttle';
  if (DOM.busIdTag) DOM.busIdTag.textContent = bus.bus_id || 'BUS01';

  // สถานะรถ (กำลังวิ่ง / จอดอยู่)
  if (DOM.motionBadge && DOM.motionBadgeText) {
    if (isMoving) {
      DOM.motionBadge.className = 'motion-badge moving';
      DOM.motionBadgeText.textContent = 'กำลังวิ่ง';
    } else {
      DOM.motionBadge.className = 'motion-badge stopped';
      DOM.motionBadgeText.textContent = 'จอดอยู่';
    }
  }

  // ความเร็ว (Speedometer)
  if (DOM.speedNumber) DOM.speedNumber.textContent = speed.toFixed(1);
  if (DOM.hudSpeed) DOM.hudSpeed.textContent = `${speed.toFixed(1)} km/h`;

  // แถบความเร็วกราฟิก (Max 60 km/h)
  if (DOM.speedBarFill) {
    const pct = Math.min(100, Math.max(4, (speed / 60) * 100));
    DOM.speedBarFill.style.width = `${pct}%`;
  }

  // พิกัด
  if (DOM.valLat) DOM.valLat.textContent = parseFloat(bus.latitude).toFixed(7);
  if (DOM.valLng) DOM.valLng.textContent = parseFloat(bus.longitude).toFixed(7);

  // เวลาบันทึกล่าสุด
  if (DOM.lastUpdate) DOM.lastUpdate.textContent = bus.recorded_at || '-';
  if (DOM.satellites) DOM.satellites.textContent = `${bus.satellites} ดวง`;
}

// อัปเดตการ์ดสถานะ GPS
function updateGpsStatusCard(satellites) {
  if (DOM.gpsSatCount) DOM.gpsSatCount.textContent = `${satellites} ดวง`;

  let qualityText = '';
  let qualityClass = '';
  let activeBars = 0;

  if (satellites === 0) {
    qualityText = 'ไม่มีสัญญาณ GPS';
    qualityClass = 'quality-none';
    activeBars = 0;
  } else if (satellites >= 1 && satellites <= 3) {
    qualityText = 'สัญญาณ GPS อ่อน';
    qualityClass = 'quality-weak';
    activeBars = 1;
  } else if (satellites >= 4 && satellites <= 6) {
    qualityText = 'สัญญาณ GPS ปกติ';
    qualityClass = 'quality-normal';
    activeBars = 3;
  } else {
    qualityText = 'สัญญาณ GPS ดีมาก';
    qualityClass = 'quality-good';
    activeBars = 4;
  }

  if (DOM.gpsQualityBadge) {
    DOM.gpsQualityBadge.className = `gps-quality-badge ${qualityClass}`;
    DOM.gpsQualityBadge.textContent = qualityText;
  }

  // อัปเดตขีดสัญญาณ 4 แท่ง
  DOM.meterBars.forEach((bar, index) => {
    if (bar) {
      if (index < activeBars) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    }
  });
}

// ==========================================================================
// 6. Future Extensions: Nearest Stop & ETA Calculation
// ==========================================================================
function calculateNearestStopAndETA(busLat, busLng, speed) {
  if (!CAMPUS_STOPS.length || !DOM.etaStopName) return;

  let minDistanceMeters = Infinity;
  let nearestStop = null;

  CAMPUS_STOPS.forEach(stop => {
    const dist = getDistanceFromLatLonInMeters(busLat, busLng, stop.lat, stop.lng);
    if (dist < minDistanceMeters) {
      minDistanceMeters = dist;
      nearestStop = stop;
    }
  });

  if (nearestStop) {
    DOM.etaStopName.textContent = nearestStop.name;
    const distRounded = Math.round(minDistanceMeters);
    if (DOM.etaDist) DOM.etaDist.textContent = `ระยะทาง ${distRounded >= 1000 ? (distRounded / 1000).toFixed(2) + ' กม.' : distRounded + ' เมตร'}`;

    // ประมาณการเวลา (ETA): ถ้าความเร็ว < 5 km/h ให้คิดความเร็วเฉลี่ยเดินรถใน ม. = 20 km/h (5.5 m/s)
    const effectiveSpeedMps = (speed > 5 ? speed : 20) * (1000 / 3600);
    const etaSeconds = minDistanceMeters / effectiveSpeedMps;
    const etaMinutes = Math.ceil(etaSeconds / 60);

    if (DOM.etaTime) {
      DOM.etaTime.textContent = etaMinutes <= 1 ? 'ถึงแล้ว / ไม่เกิน 1 นาที' : `~ ${etaMinutes} นาที`;
    }

    // ไฮไลต์ป้ายใน List
    document.querySelectorAll('.stop-item').forEach(item => {
      if (item.getAttribute('data-stop-id') === nearestStop.id) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

// สูตร Haversine คำนวณระยะห่างพิกัดเป็นเมตร
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // รัศมีโลกในหน่วยเมตร
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ==========================================================================
// 7. Interactive Controls & Helpers
// ==========================================================================
function setupEventListeners() {
  // ปุ่มโฟกัสตำแหน่งรถ (Recenter Bus)
  if (DOM.btnCenterBus) {
    DOM.btnCenterBus.addEventListener('click', () => {
      STATE.autoCenter = true;
      DOM.btnCenterBus.classList.add('active');
      if (STATE.busMarker) {
        STATE.map.flyTo(STATE.busMarker.getLatLng(), CONFIG.defaultZoom, {
          animate: true,
          duration: 1
        });
      }
      showToast('โฟกัสที่ตำแหน่งรถรับ-ส่ง');
    });
  }

  // ปุ่มเปิด/ปิด แสดงป้ายรถเมล์
  if (DOM.btnToggleStops) {
    DOM.btnToggleStops.addEventListener('click', () => {
      STATE.showStops = !STATE.showStops;
      if (STATE.showStops) {
        STATE.stopsLayerGroup.addTo(STATE.map);
        DOM.btnToggleStops.classList.add('active');
        showToast('เปิดการแสดงป้ายรถรับ-ส่ง');
      } else {
        STATE.stopsLayerGroup.remove();
        DOM.btnToggleStops.classList.remove('active');
        showToast('ซ่อนป้ายรถรับ-ส่ง');
      }
    });
  }

  // ปุ่มเปิด/ปิด เส้นทางเดินรถ
  if (DOM.btnToggleRoute) {
    DOM.btnToggleRoute.addEventListener('click', () => {
      STATE.showRoute = !STATE.showRoute;
      if (STATE.showRoute) {
        if (STATE.routePolyline) STATE.routePolyline.addTo(STATE.map);
        DOM.btnToggleRoute.classList.add('active');
        showToast('เปิดการแสดงเส้นทางเดินรถ');
      } else {
        if (STATE.routePolyline) STATE.routePolyline.remove();
        DOM.btnToggleRoute.classList.remove('active');
        showToast('ซ่อนเส้นทางเดินรถ');
      }
    });
  }

  // ปุ่มเปิด/ปิด เส้นประวัติการวิ่ง (History Trail)
  if (DOM.btnToggleTrail) {
    DOM.btnToggleTrail.addEventListener('click', () => {
      STATE.showTrail = !STATE.showTrail;
      if (STATE.showTrail) {
        if (STATE.historyTrail) STATE.historyTrail.addTo(STATE.map);
        DOM.btnToggleTrail.classList.add('active');
        showToast('เปิดแสดงประวัติการวิ่ง');
      } else {
        if (STATE.historyTrail) STATE.historyTrail.remove();
        DOM.btnToggleTrail.classList.remove('active');
        showToast('ซ่อนประวัติการวิ่ง');
      }
    });
  }

  // ปุ่มคัดลอกพิกัด
  if (DOM.btnCopyCoords) {
    DOM.btnCopyCoords.addEventListener('click', () => {
      const lat = DOM.valLat ? DOM.valLat.textContent : '';
      const lng = DOM.valLng ? DOM.valLng.textContent : '';
      if (lat && lng && lat !== '-') {
        const text = `${lat}, ${lng}`;
        navigator.clipboard.writeText(text).then(() => {
          showToast(`คัดลอกพิกัดแล้ว: ${text}`);
        }).catch(() => {
          showToast('ไม่สามารถคัดลอกพิกัดได้');
        });
      }
    });
  }

  // เลือกรถบัส (Future Expansion)
  if (DOM.busSelect) {
    DOM.busSelect.addEventListener('change', (e) => {
      STATE.activeBusId = e.target.value;
      showToast(`เปลี่ยนการติดตามเป็นคันที่: ${e.target.value}`);
      fetchBusLocation();
    });
  }

  // เปลี่ยน Layer แผนที่จาก Dropdown
  if (DOM.selectMapLayer) {
    DOM.selectMapLayer.addEventListener('change', (e) => {
      switchBaseLayer(e.target.value);
    });
  }
}

// สลับรูปแบบเลเยอร์แผนที่
function switchBaseLayer(layerKey) {
  const targetLayer = STATE.baseLayers[layerKey];
  if (!targetLayer) return;

  if (STATE.currentBaseLayer && STATE.map.hasLayer(STATE.currentBaseLayer)) {
    STATE.map.removeLayer(STATE.currentBaseLayer);
  }

  targetLayer.addTo(STATE.map);
  STATE.currentBaseLayer = targetLayer;

  if (DOM.selectMapLayer) DOM.selectMapLayer.value = layerKey;
  const label = DOM.selectMapLayer ? DOM.selectMapLayer.options[DOM.selectMapLayer.selectedIndex].text : layerKey;
  showToast(`เปลี่ยนมุมมองแผนที่: ${label}`);
}

// นาฬิกาและตัวนับเวลาสัมพัทธ์ (Relative Time Counter)
function startTimers() {
  // 1. Digital Clock แสดงเวลาปัจจุบันทุก 1 วินาที
  setInterval(() => {
    if (DOM.clock) {
      const now = new Date();
      DOM.clock.textContent = now.toLocaleTimeString('th-TH', { hour12: false });
    }
  }, 1000);

  // 2. Relative Time Counter (อัปเดตเมื่อ: X วินาทีที่แล้ว)
  setInterval(() => {
    if (STATE.lastRecordedDate && DOM.timeAgo) {
      const now = Date.now();
      const sec = Math.max(0, Math.floor((now - STATE.lastRecordedDate.getTime()) / 1000));

      if (sec < 5) {
        DOM.timeAgo.textContent = 'เมื่อสักครู่';
      } else if (sec < 60) {
        DOM.timeAgo.textContent = `${sec} วินาทีที่แล้ว`;
      } else {
        const min = Math.floor(sec / 60);
        DOM.timeAgo.textContent = `${min} นาทีที่แล้ว`;
      }

      // ตรวจสอบสถานะความสดใหม่อีกครั้ง
      checkDataFreshness();
    }
  }, 1000);
}

// Toast Notice Helper
function showToast(message) {
  if (!DOM.toast) return;
  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 2400);
}

// XSS Sanitizer Helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// 8. Application Bootstrap
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupEventListeners();
  startTimers();

  // เรียกข้อมูลครั้งแรกทันที
  fetchBusLocation();

  // ตั้ง Interval ดึงข้อมูลทุก 1 วินาที
  setInterval(fetchBusLocation, CONFIG.fetchIntervalMs);
});
