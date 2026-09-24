<?php
// ป้องกัน Browser Caching ในการพัฒนา
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
$assetVersion = time();
?>
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษา | Shuttle Tracking System</title>
  <meta name="description" content="ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษาภายในมหาวิทยาลัยด้วยเทคโนโลยี IoT เชื่อมต่อ GPS NEO-6M และ ESP32 แสดงผลแบบ Real-time บนแผนที่">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="images/favicon.svg">

  <!-- Leaflet.js CSS (OpenStreetMap - Free & No API Key Required) -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />

  <!-- Google Fonts: Prompt (Thai) & Inter (English) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- Custom CSS -->
  <link rel="stylesheet" href="css/style.css?v=<?= $assetVersion ?>">
</head>

<body>

  <!-- =====================================================================
       Navbar Section
       ===================================================================== -->
  <header class="navbar">
    <div class="navbar-container">
      <div class="brand-section">
        <div class="brand-icon">
          <!-- Shuttle SVG Vector -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"></path>
            <path d="M15 6v6"></path>
            <path d="M2 12h19.6"></path>
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5c-.3-1-1.1-1.8-2.1-1.8H4.7c-1 0-1.8.8-2.1 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C2 16.3 3 18 3 18h3"></path>
            <circle cx="7" cy="18" r="2"></circle>
            <path d="M9 18h5"></path>
            <circle cx="16" cy="18" r="2"></circle>
          </svg>
        </div>
        <div class="brand-info">
          <h1>Shuttle Tracking System</h1>
          <div class="sub-text">ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษา</div>
        </div>
      </div>

      <div class="nav-actions">
        <!-- Live Tracking / Offline Indicator -->
        <div class="live-status-pill" id="liveStatusPill">
          <span class="pulse-dot"></span>
          <span id="liveStatusText">Live Tracking</span>
        </div>

        <!-- Real-time Digital Clock -->
        <div class="clock-display" title="เวลาปัจจุบัน">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span id="liveClock">--:--:--</span>
        </div>
      </div>
    </div>
  </header>

  <!-- =====================================================================
       Dashboard Main Content
       ===================================================================== -->
  <main class="dashboard-container">

    <!-- -------------------------------------------------------------------
         Part 1: Map Panel (Leaflet.js + OpenStreetMap)
         ------------------------------------------------------------------- -->
    <section class="map-panel" aria-label="แผนที่ตำแหน่งรถ">
      <div class="map-header">
        <div class="map-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
            <line x1="9" y1="3" x2="9" y2="18"></line>
            <line x1="15" y1="6" x2="15" y2="21"></line>
          </svg>
          <span>แผนที่ติดตามตำแหน่งแบบเรียลไทม์ (Live Campus Map)</span>
        </div>

        <!-- Quick Action Map Controls -->
        <div class="map-controls-bar">
          <div class="map-theme-select-wrapper">
            <select class="select-map-layer" id="selectMapLayer" title="เลือกรูปแบบแผนที่">
              <option value="google_roadmap" selected>🗺️ Google แผนที่</option>
              <option value="google_satellite">🛰️ ภาพดาวเทียม (Satellite)</option>
              <option value="carto_voyager">🎨 โมเดิร์น (Voyager)</option>
              <option value="carto_dark">🌙 โหมดมืด (Dark)</option>
              <option value="osm">📌 OpenStreetMap</option>
            </select>
          </div>

          <button type="button" class="btn-map-control active" id="btnCenterBus" title="เลื่อนแผนที่ไปยังตำแหน่งรถบัส">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="22" y1="12" x2="18" y2="12"></line>
              <line x1="6" y1="12" x2="2" y2="12"></line>
              <line x1="12" y1="6" x2="12" y2="2"></line>
              <line x1="12" y1="22" x2="12" y2="18"></line>
            </svg>
            <span>โฟกัสรถ</span>
          </button>

          <button type="button" class="btn-map-control active" id="btnToggleStops" title="เปิด/ปิด การแสดงป้ายรถรับ-ส่ง">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>ป้ายรถ</span>
          </button>

          <button type="button" class="btn-map-control active" id="btnToggleRoute" title="เปิด/ปิด การแสดงเส้นทางเดินรถ">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6" cy="19" r="3"></circle>
              <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
              <circle cx="18" cy="5" r="3"></circle>
            </svg>
            <span>เส้นทาง</span>
          </button>

          <button type="button" class="btn-map-control active" id="btnToggleTrail" title="เปิด/ปิด การแสดงประวัติการวิ่ง">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>ประวัติวิ่ง</span>
          </button>
        </div>
      </div>

      <!-- Leaflet Map Container -->
      <div id="map"></div>

      <!-- Floating HUD on Map -->
      <div class="map-hud-overlay">
        <div class="hud-item">
          <span class="hud-label">ความเร็ว</span>
          <span class="hud-value" id="hudSpeed">0.0 km/h</span>
        </div>
        <div class="hud-divider"></div>
        <div class="hud-item">
          <span class="hud-label">สถานะระบบ</span>
          <span class="hud-value" id="hudStatus" style="color: var(--status-moving);">LIVE</span>
        </div>
      </div>
    </section>

    <!-- -------------------------------------------------------------------
         Part 2: Sidebar (Bus Info, GPS Status & Future Extensions)
         ------------------------------------------------------------------- -->
    <aside class="sidebar-panel">

      <!-- Card 1: Bus Information -->
      <div class="info-card">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <path d="M7 7h10"></path>
                <path d="M7 12h10"></path>
                <path d="M7 17h10"></path>
              </svg>
            </div>
            <h2 class="card-title">ข้อมูลรถรับ-ส่ง (Bus Details)</h2>
          </div>
        </div>

        <!-- Bus Identity & Status Badge -->
        <div class="bus-profile">
          <div class="bus-identity">
            <span class="bus-name" id="busName">กำลังโหลดข้อมูล...</span>
            <span class="bus-id-tag" id="busIdTag">BUS01</span>
          </div>
          <!-- Dynamic Motion Badge: กำลังวิ่ง (Green) vs จอดอยู่ (Slate) -->
          <div class="motion-badge stopped" id="motionBadge">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span id="motionBadgeText">จอดอยู่</span>
          </div>
        </div>

        <!-- Speedometer Display -->
        <div class="speed-meter-box">
          <div class="speed-metric">
            <span class="speed-number" id="speedNumber">0.0</span>
            <span class="speed-unit">km/h</span>
          </div>
          <div class="speed-bar-track">
            <div class="speed-bar-fill" id="speedBarFill"></div>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              ละติจูด (Latitude)
            </span>
            <div class="coords-box">
              <span class="detail-value" id="valLatitude">-</span>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="2" x2="12" y2="22"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              ลองจิจูด (Longitude)
            </span>
            <div class="coords-box">
              <span class="detail-value" id="valLongitude">-</span>
              <button type="button" class="btn-copy" id="btnCopyCoords" title="คัดลอกพิกัด GPS">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              จำนวนดาวเทียม
            </span>
            <span class="detail-value" id="valSatellites">-</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              เวลาอัปเดตล่าสุด
            </span>
            <div style="text-align: right;">
              <span class="detail-value" id="valLastUpdate">-</span>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;" id="timeAgoBadge">กำลังดึงข้อมูล...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 2: GPS Status -->
      <div class="info-card">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.93 4.93l4.24 4.24"></path>
                <path d="M14.83 9.17l4.24-4.24"></path>
                <path d="M14.83 14.83l4.24 4.24"></path>
                <path d="M9.17 14.83l-4.24 4.24"></path>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
            </div>
            <h2 class="card-title">สถานะสัญญาณ GPS (NEO-6M)</h2>
          </div>
        </div>

        <div class="gps-card-body">
          <div class="gps-info-col">
            <div class="gps-sat-count" id="gpsSatCount">- ดวง</div>
            <span class="gps-quality-badge quality-normal" id="gpsQualityBadge">กำลังตรวจสอบ...</span>
          </div>

          <!-- 4-bar Signal Strength Meter -->
          <div class="gps-meter" title="ระดับความแรงสัญญาณดาวเทียม">
            <div class="meter-bar active" id="meterBar1"></div>
            <div class="meter-bar active" id="meterBar2"></div>
            <div class="meter-bar active" id="meterBar3"></div>
            <div class="meter-bar" id="meterBar4"></div>
          </div>
        </div>
      </div>

      <!-- Card 3: Stops & ETA (Future-Ready Architecture) -->
      <div class="info-card stops-card">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h2 class="card-title">จุดจอดและประมาณการเวลา (ETA)</h2>
          </div>
        </div>

        <!-- Nearest Stop & ETA Highlight -->
        <div class="eta-highlight">
          <div class="eta-left">
            <span class="eta-title">ป้ายรถถัดไปที่ใกล้ที่สุด</span>
            <span class="eta-stop-name" id="etaStopName">กำลังประมวลผล...</span>
            <span class="eta-dist" id="etaDist">-- เมตร</span>
          </div>
          <div class="eta-badge">
            <div class="eta-time" id="etaTime">-- นาที</div>
          </div>
        </div>

        <!-- Stops List with Click-to-Focus -->
        <ul class="stops-list" id="stopsListContainer" title="คลิกเพื่อเลื่อนแผนที่ไปยังป้ายนั้น">
          <!-- Populated by map.js -->
        </ul>
      </div>

      <!-- Card 4: Multi-Vehicle Selector (Future-Ready) -->
      <div class="info-card">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h2 class="card-title">เลือกรถติดตาม (Vehicle Selection)</h2>
          </div>
        </div>

        <select class="bus-selector-dropdown" id="busSelect" aria-label="เลือกรถรับ-ส่ง">
          <option value="BUS01">🚌 BUS01 - Shuttle1 (ใช้งานอยู่)</option>
          <option value="BUS02" disabled>🚌 BUS02 - Shuttle2 (เร็วๆ นี้)</option>
          <option value="BUS03" disabled>🚌 BUS03 - Shuttle3 (เร็วๆ นี้)</option>
        </select>
      </div>

    </aside>

  </main>

  <!-- =====================================================================
       Footer Section
       ===================================================================== -->
  <footer class="footer">
    <p>โครงงาน “ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษาภายในมหาวิทยาลัยด้วยเทคโนโลยี IoT” | เชื่อมต่อ GPS NEO-6M, ESP32, PHP และ MySQL บน XAMPP</p>
  </footer>

  <!-- Toast Notification element -->
  <div class="toast-notice" id="toastNotice">แจ้งเตือน</div>

  <!-- Leaflet.js Library (OpenStreetMap - Free & No API Key Required) -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

  <!-- Custom Map Logic & Polling -->
  <script src="js/map.js?v=<?= $assetVersion ?>"></script>

</body>
</html>
