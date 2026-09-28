import React, { useState, useCallback, useEffect } from 'react';
import { CONFIG, CAMPUS_STOPS, MAP_LAYERS } from './config/campusConfig';
import { useBusTracking } from './hooks/useBusTracking';
import { useEtaCalculator } from './hooks/useEtaCalculator';
import { useUserLocation } from './hooks/useUserLocation';
import { useRelativeTime } from './hooks/useClock';
import { Navbar } from './components/Navbar/Navbar';
import { CampusMap } from './components/Map/CampusMap';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Toast } from './components/Common/Toast';
import { ScheduleModal } from './components/Common/ScheduleModal';

export function App() {
  const [selectedBusId, setSelectedBusId] = useState('BUS01');
  const [selectedLayer, setSelectedLayer] = useState('google_roadmap');
  const [autoCenter, setAutoCenter] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', show: false });

  // Schedule Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });
  
  // Theme Toggle Effect
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const showToast = useCallback((message) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 2400);
  }, []);

  // 1. Bus Tracking Polling Hook
  const { busData, historyTrail, isOffline, statusMessage } = useBusTracking(selectedBusId);

  // 2. ETA & Nearest Stop Calculation Hook
  const { nearestStop, nextStop, distanceText, etaText, stopsEta } = useEtaCalculator(
    busData?.latitude,
    busData?.longitude,
    busData?.speed,
    CAMPUS_STOPS
  );

  // 3. User Mobile GPS Location Hook
  const {
    userLocation,
    isLocating,
    locationError,
    requestLocation,
    nearestUserStop,
    userDistanceToStop,
    userDistText
  } = useUserLocation(CAMPUS_STOPS);

  // 4. Relative Time Ago
  const timeAgo = useRelativeTime(busData?.recordedDate);

  // Locate User on Map
  const handleLocateUser = useCallback(() => {
    if (userLocation && userLocation.lat && userLocation.lng) {
      setAutoCenter(false);
      setFlyToTarget({
        coords: [userLocation.lat, userLocation.lng],
        zoom: 18,
        timestamp: Date.now()
      });
      showToast(nearestUserStop ? `📍 ป้ายของคุณ: ${nearestUserStop.name}` : '📍 ตำแหน่งของคุณ');
    } else {
      requestLocation();
      showToast('📍 กำลังค้นหาตำแหน่ง GPS มือถือของคุณ...');
    }
  }, [userLocation, nearestUserStop, requestLocation, showToast]);

  // Focus on Bus Marker
  const handleToggleCenter = useCallback(() => {
    if (isOffline) {
      showToast('⚠️ ขณะนี้ไม่มีรถรับ-ส่งให้บริการในระบบ');
      setFlyToTarget({
        coords: CONFIG.defaultCenter,
        zoom: CONFIG.defaultZoom,
        timestamp: Date.now()
      });
      return;
    }

    if (busData?.latitude && busData?.longitude) {
      setAutoCenter(true);
      setFlyToTarget({
        coords: [busData.latitude, busData.longitude],
        zoom: CONFIG.defaultZoom,
        timestamp: Date.now()
      });
      showToast('โฟกัสที่ตำแหน่งรถรับ-ส่ง');
    }
  }, [busData, isOffline, showToast]);

  const handleDragMap = useCallback(() => {
    setAutoCenter(false);
  }, []);

  // Click on Campus Stop in Sidebar
  const handleSelectStop = useCallback((stop) => {
    setFlyToTarget({
      coords: [stop.lat, stop.lng],
      zoom: 18,
      timestamp: Date.now()
    });
    showToast(`เลื่อนไปยัง: ${stop.name}`);
  }, [showToast]);

  // Layer Switching
  const handleSelectLayer = useCallback((layerKey) => {
    setSelectedLayer(layerKey);
    const layer = MAP_LAYERS.find(l => l.id === layerKey);
    showToast(`เปลี่ยนมุมมองแผนที่: ${layer ? layer.name : layerKey}`);
  }, [showToast]);

  // Layer Toggles
  const handleToggleStops = useCallback(() => {
    setShowStops(prev => {
      const next = !prev;
      showToast(next ? 'เปิดการแสดงป้ายรถรับ-ส่ง' : 'ซ่อนป้ายรถรับ-ส่ง');
      return next;
    });
  }, [showToast]);

  const handleToggleRoute = useCallback(() => {
    setShowRoute(prev => {
      const next = !prev;
      showToast(next ? 'เปิดการแสดงเส้นทางเดินรถ' : 'ซ่อนเส้นทางเดินรถ');
      return next;
    });
  }, [showToast]);

  const handleToggleTrail = useCallback(() => {
    setShowTrail(prev => {
      const next = !prev;
      showToast(next ? 'เปิดแสดงประวัติการวิ่ง' : 'ซ่อนประวัติการวิ่ง');
      return next;
    });
  }, [showToast]);

  // Copy GPS Coordinates
  const handleCopyCoords = useCallback((lat, lng) => {
    if (lat && lng && lat !== '-') {
      const text = `${lat}, ${lng}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast(`คัดลอกพิกัดแล้ว: ${text}`);
      }).catch(() => {
        showToast('ไม่สามารถคัดลอกพิกัดได้');
      });
    }
  }, [showToast]);

  // Change active vehicle
  const handleSelectBus = useCallback((busId) => {
    setSelectedBusId(busId);
    showToast(`เปลี่ยนการติดตามเป็นคันที่: ${busId}`);
  }, [showToast]);

  return (
    <>
      {/* Top Navbar with self-contained clock */}
      <Navbar
        isOffline={isOffline}
        statusMessage={statusMessage}
        onOpenSchedule={() => setIsScheduleOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Dashboard Layout */}
      <main className="dashboard-container">
        <CampusMap
          busData={busData}
          historyTrail={historyTrail}
          stops={CAMPUS_STOPS}
          autoCenter={autoCenter}
          onToggleCenter={handleToggleCenter}
          onDragMap={handleDragMap}
          selectedLayer={selectedLayer}
          onSelectLayer={handleSelectLayer}
          showStops={showStops}
          onToggleStops={handleToggleStops}
          showRoute={showRoute}
          onToggleRoute={handleToggleRoute}
          showTrail={showTrail}
          onToggleTrail={handleToggleTrail}
          flyToTarget={flyToTarget}
          isOffline={isOffline}
          userLocation={userLocation}
          nearestUserStop={nearestUserStop}
          onLocateUser={handleLocateUser}
        />

        <Sidebar
          busData={busData}
          timeAgo={timeAgo}
          isOffline={isOffline}
          nearestStop={nearestStop}
          nextStop={nextStop}
          distanceText={distanceText}
          etaText={etaText}
          stopsEta={stopsEta}
          stops={CAMPUS_STOPS}
          selectedBusId={selectedBusId}
          onSelectBus={handleSelectBus}
          onSelectStop={handleSelectStop}
          onCopyCoords={handleCopyCoords}
          userLocation={userLocation}
          isLocating={isLocating}
          locationError={locationError}
          requestLocation={requestLocation}
          nearestUserStop={nearestUserStop}
          userDistanceToStop={userDistanceToStop}
          userDistText={userDistText}
        />
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          โครงงาน “ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษาภายในมหาวิทยาลัยด้วยเทคโนโลยี IoT” | เชื่อมต่อ GPS NEO-6M, ESP32, PHP และ MySQL บน XAMPP
        </p>
      </footer>

      {/* Toast Notification */}
      <Toast message={toast.message} show={toast.show} />

      {/* Schedule Modal - rendered at root to avoid stacking context issues */}
      <ScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />
    </>
  );
}

export default App;
