# 🚌 ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษา (Shuttle Tracking System)

> โครงงาน "ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษาภายในมหาวิทยาลัยด้วยเทคโนโลยี IoT"  
> **มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตสุราษฎร์ธานี**

---

## 📋 สารบัญ
- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [Tech Stack](#tech-stack)
- [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
- [ติดตั้งและรันโปรเจกต์](#ติดตั้งและรันโปรเจกต์)
- [โครงสร้างไฟล์](#โครงสร้างไฟล์)
- [Components และ Hooks](#components-และ-hooks)
- [การตั้งค่า Supabase](#การตั้งค่า-supabase)
- [การตั้งค่า Hardware ESP32](#การตั้งค่า-hardware-esp32)
- [สิ่งที่ควรพัฒนาต่อ](#สิ่งที่ควรพัฒนาต่อ)

---

## ภาพรวมระบบ

ระบบนี้แสดงตำแหน่งรถรับ-ส่งนักศึกษาแบบ Real-Time บนแผนที่ผ่านเว็บไซต์ โดยใช้:
- **ESP32 + GPS NEO-6M** ติดในรถ → ส่งพิกัดขึ้น Supabase ทุก 500ms
- **Supabase Realtime (WebSocket)** → Push ข้อมูลมายัง Frontend ทันที
- **React Frontend** → แสดงตำแหน่งรถ, ETA, ป้ายจอด, แผนที่

```
[ESP32 + GPS NEO-6M]  →  HTTP PATCH (500ms)  →  [Supabase PostgreSQL]
                                                         |
                                              WebSocket Realtime Push
                                                         ↓
[GPS มือถือผู้ใช้]  ←  Browser Geolocation  ←  [React Frontend - Vite]
```

---

## Tech Stack

| ส่วน | เทคโนโลยี | เวอร์ชัน |
|------|-----------|---------|
| Frontend Framework | React | 19.x |
| Build Tool | Vite | 8.x |
| แผนที่ | React-Leaflet + Leaflet | 5.x / 1.9.x |
| Realtime Database | Supabase (PostgreSQL + WebSocket) | SDK 2.x |
| Linter | Oxlint | 1.x |
| Hardware | ESP32 + GPS NEO-6M | - |

---

## สถาปัตยกรรมระบบ

### Data Flow แบบ Realtime

```
ESP32 Firmware
  └─ อ่าน NEO-6M ทุก 500ms → HTTP PATCH → Supabase
      table: current_bus_location { bus_id, lat, lng, speed, satellites, updated_at }

Supabase Realtime
  └─ ได้รับ UPDATE → broadcast WebSocket payload ไปยัง subscriber ทั้งหมด

useBusTracking hook (Frontend)
  ├─ subscribe channel "bus-tracking-BUS01"
  ├─ รับ payload.new → processRow()
  │    ├─ Validate coordinates (isValidCoordinate)
  │    ├─ Ghost Speed Filter (sliding window 6s)
  │    └─ คำนวณ Bearing จาก prev position
  ├─ Freshness Checker (setInterval 1s)
  │    └─ ถ้าไม่มี update > 8s → isOffline = true
  └─ return { busData, historyTrail, isOffline, statusMessage }
```

### Component Tree

```
App.jsx  ← State ทั้งหมดอยู่ที่นี่
├── Navbar             (Clock, Status, ปุ่มตาราง, Toggle Theme)
├── main.dashboard-container
│   ├── CampusMap      (แผนที่หลัก Leaflet)
│   │   ├── MapControls   (Layer, Toggle ป้าย/เส้น/ประวัติ)
│   │   ├── Bus Marker    (SVG ลูกศร หมุนตาม bearing)
│   │   ├── Stop Markers
│   │   ├── Route Polyline
│   │   └── History Trail
│   └── Sidebar
│       ├── VehicleSelectorCard  (เลือกรถ)
│       ├── BusDetailsCard       (พิกัด, ความเร็ว, ดาวเทียม)
│       ├── StopsEtaCard         (ป้ายจอด + ETA)
│       ├── GpsStatusCard        (GPS มือถือผู้ใช้)
│       └── ContactCard
├── Toast              (notification)
└── ScheduleModal      (ตารางเวลา)
```

---

## ติดตั้งและรันโปรเจกต์

### ความต้องการ
- **Node.js** v18+ → https://nodejs.org/
- **npm** v9+ (มาพร้อม Node.js)

### ขั้นตอน

```bash
# 1. เข้าโฟลเดอร์โปรเจกต์
cd d:/xampp/htdocs/shuttle_tracking/frontend

# 2. ติดตั้ง dependencies
npm install

# 3. คัดลอก .env.example เป็น .env แล้วใส่ key จริง
copy .env.example .env

# 4. รัน Development
npm run dev
# → เปิด http://localhost:5173

# 5. Build Production
npm run build
# → ไฟล์อยู่ใน /dist/

# 6. Preview Production Build
npm run preview
```

### ไฟล์ .env (ต้องสร้างเอง)

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_KEY=sb_publishable_YOUR_ANON_KEY
```

> ⚠️ **ห้าม commit .env ขึ้น Git!** ไฟล์ถูก ignore ใน .gitignore แล้ว  
> ใช้ `.env.example` เป็น template แทน

---

## โครงสร้างไฟล์

```
frontend/
├── .env                    ← API Keys จริง (ห้าม commit!)
├── .env.example            ← Template สำหรับ .env
├── index.html              ← Entry HTML
├── package.json
├── vite.config.js
├── netlify.toml            ← Deploy config (Netlify)
└── src/
    ├── main.jsx            ← React entry point
    ├── App.jsx             ← Root component + state ทั้งหมด
    ├── index.css           ← Global CSS + CSS Variables + Dark Mode
    ├── supabaseClient.js   ← Supabase client singleton
    ├── config/
    │   └── campusConfig.js ★ แก้ที่นี่เพื่อเพิ่มป้าย/รถ/ค่า config
    ├── hooks/
    │   ├── useBusTracking.js    ★ หัวใจระบบ - Realtime + Ghost Filter
    │   ├── useEtaCalculator.js  ★ คำนวณ ETA ทุกป้าย
    │   ├── useUserLocation.js   - GPS มือถือผู้ใช้
    │   └── useClock.js          - นาฬิกา + relative time
    ├── components/
    │   ├── Navbar/Navbar.jsx
    │   ├── Map/
    │   │   ├── CampusMap.jsx    ★ แผนที่หลัก (ไฟล์ใหญ่สุด ~23KB)
    │   │   ├── MapControls.jsx
    │   │   └── MapHudOverlay.jsx
    │   ├── Sidebar/
    │   │   ├── Sidebar.jsx
    │   │   ├── BusDetailsCard.jsx
    │   │   ├── StopsEtaCard.jsx
    │   │   ├── VehicleSelectorCard.jsx
    │   │   ├── GpsStatusCard.jsx
    │   │   └── ContactCard.jsx
    │   └── Common/
    │       ├── ScheduleModal.jsx  ← ยังว่างอยู่ ต้องพัฒนาต่อ
    │       └── Toast.jsx
    └── utils/
        ├── geoUtils.js    - Haversine, Bearing, projectCoordinates
        └── dateUtils.js   - parseSqlDate, getTimeAgoText
```

★ = ไฟล์สำคัญที่ต้องรู้จักก่อน

---

## Components และ Hooks

### useBusTracking(busId) — หัวใจของระบบ

```js
const { busData, historyTrail, isOffline, statusMessage } = useBusTracking('BUS01');
```

| Return | Type | คำอธิบาย |
|--------|------|----------|
| `busData` | object \| null | ข้อมูลล่าสุด { lat, lng, speed, bearing, satellites, isMoving, ... } |
| `historyTrail` | `[lat,lng][]` | เส้นทางที่ผ่านมา สูงสุด 100 จุด |
| `isOffline` | boolean | true ถ้าไม่มี update > 8 วินาที |
| `statusMessage` | string | "Live Tracking" / "Offline" / "กำลังเชื่อมต่อ..." |

**Ghost Speed Filter:** GPS indoor drift ทำให้พิกัดกระโดด ~2-4 m/s แม้รถจะจอดนิ่ง ระบบตรวจสอบ net displacement ใน 6 วินาทีที่ผ่านมา ถ้า < 3.5 km/h จะ override speed = 0

---

### useEtaCalculator(busLat, busLng, speed, stops, isMoving) — คำนวณ ETA

```js
const { nearestStop, distanceText, etaText, stopsEta, busStopStatus } =
  useEtaCalculator(busData?.latitude, busData?.longitude, busData?.speed, CAMPUS_STOPS, busData?.isMoving);
```

- ใช้ Haversine formula คำนวณระยะจากรถถึงทุกป้าย
- เรียงป้ายจากใกล้ไปไกล
- ถ้ารถ < 5 km/h → ใช้ 20 km/h เป็น default speed สำหรับ ETA
- ถ้ารถอยู่ในรัศมี 7m → "ถึงแล้ว รอรับนักศึกษา"

---

### useUserLocation(stops) — GPS มือถือผู้ใช้

```js
const { userLocation, isLocating, locationError, requestLocation, nearestUserStop, userDistText } =
  useUserLocation(CAMPUS_STOPS);
```

- จำ Permission ใน localStorage → auto-start ถ้าเคยอนุญาต
- `watchPosition` สำหรับ continuous tracking
- คำนวณป้ายที่ใกล้ที่สุดด้วย Haversine

---

### campusConfig.js — ตั้งค่าหลัก (แก้ที่นี่!)

```js
// เพิ่มป้ายใหม่
export const CAMPUS_STOPS = [
  { id: 'STOP01', name: 'ชื่อป้าย', lat: 9.0000, lng: 99.0000 },
  // เพิ่มตรงนี้ ...
];

// เปิดรถใหม่ (เปลี่ยน disabled: true → false)
export const VEHICLES = [
  { id: 'BUS01', name: '🚌 BUS01', disabled: false },
  { id: 'BUS02', name: '🚌 BUS02', disabled: false }, // เปิดเมื่อมี hardware พร้อม
];

// ปรับ threshold
export const CONFIG = {
  offlineThresholdSec: 8,    // Offline หลัง X วินาที
  defaultZoom: 17,
  defaultCenter: [9.0954688, 99.3576160],
};
```

---

## การตั้งค่า Supabase

### 1. สร้าง Project

ไปที่ https://supabase.com → New Project → Region: Southeast Asia (Singapore)

### 2. สร้าง Table (รัน SQL นี้ใน SQL Editor)

```sql
CREATE TABLE current_bus_location (
  id          BIGSERIAL        PRIMARY KEY,
  bus_id      TEXT             NOT NULL UNIQUE,
  bus_name    TEXT             NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  speed       DOUBLE PRECISION DEFAULT 0.0,
  satellites  INTEGER          DEFAULT 0,
  heading     DOUBLE PRECISION DEFAULT 0.0,
  updated_at  TIMESTAMPTZ      DEFAULT NOW()
);

-- Insert initial row
INSERT INTO current_bus_location (bus_id, bus_name, latitude, longitude)
VALUES ('BUS01', 'Shuttle 1', 9.0954688, 99.3576160);

-- Enable Realtime
ALTER TABLE current_bus_location REPLICA IDENTITY FULL;
```

### 3. เปิด Realtime

**Database → Replication → เปิด toggle สำหรับ `current_bus_location`**

### 4. Row Level Security

```sql
ALTER TABLE current_bus_location ENABLE ROW LEVEL SECURITY;

-- Frontend (anon) อ่านได้
CREATE POLICY "Allow anonymous read" ON current_bus_location
FOR SELECT TO anon USING (true);

-- ESP32 (service_role) update ได้
CREATE POLICY "Allow service role update" ON current_bus_location
FOR UPDATE TO service_role USING (true);
```

### 5. Keys ที่ต้องใช้

| Key | ใช้ที่ | ความลับ |
|-----|--------|---------|
| `anon public key` | Frontend `.env` | เปิดเผยได้ |
| `service_role key` | ESP32 firmware | **SECRET — ห้ามใส่ใน code Frontend!** |

---

## การตั้งค่า Hardware ESP32

### วงจร

| GPS NEO-6M | ESP32 | หมายเหตุ |
|------------|-------|----------|
| VCC | 3.3V | ไฟเลี้ยง |
| GND | GND | กราวด์ |
| TX | GPIO 16 (RX2) | ส่งข้อมูล NMEA |
| RX | GPIO 17 (TX2) | รับคำสั่ง (optional) |

### Firmware Pseudo-code

```cpp
// Arduino Libraries: TinyGPSPlus, WiFi.h, HTTPClient.h
void loop() {
  while (Serial2.available()) gps.encode(Serial2.read());

  if (millis() - lastSend >= 500 && gps.location.isValid()) {
    String body = "{\"latitude\":"  + String(gps.location.lat(), 6)
                + ",\"longitude\":" + String(gps.location.lng(), 6)
                + ",\"speed\":"     + String(gps.speed.kmph(), 1)
                + ",\"satellites\":"+ String(gps.satellites.value())
                + ",\"updated_at\":\""  + getNTPTimeISO() + "\"}";

    HTTPClient http;
    http.begin("https://PROJ.supabase.co/rest/v1/current_bus_location?bus_id=eq.BUS01");
    http.addHeader("apikey", SERVICE_ROLE_KEY);
    http.addHeader("Authorization", "Bearer " + String(SERVICE_ROLE_KEY));
    http.addHeader("Content-Type", "application/json");
    http.PATCH(body);
    http.end();
    lastSend = millis();
  }
}
```

---

## สิ่งที่ควรพัฒนาต่อ

### 🔴 Priority สูง

| # | สิ่งที่ต้องทำ | ความยาก |
|---|---|---|
| 1 | **Multi-Bus Support** — เปิด BUS02/BUS03 ใน `campusConfig.js` + ติด hardware | ปานกลาง |
| 2 | **ตารางเวลา** — เติมข้อมูลใน `ScheduleModal.jsx` | ง่าย |
| 3 | **Push Notification** — แจ้งเตือนเมื่อรถใกล้ถึง (Web Push / FCM) | ยาก |

### 🟡 Priority กลาง

| # | สิ่งที่ต้องทำ |
|---|---|
| 4 | **PWA** — Add to Home Screen บนมือถือ (`vite-plugin-pwa`) |
| 5 | **Trip History** — บันทึก GPS log table แยก + หน้าดูย้อนหลัง |
| 6 | **Admin Dashboard** — สถิติ, จัดการตาราง |

### 🟢 Priority รอง

| # | สิ่งที่ต้องทำ |
|---|---|
| 7 | **Migrate TypeScript** — เพิ่ม type safety |
| 8 | **Unit Tests** — Vitest + React Testing Library |
| 9 | **Offline Mode** — Service Worker + Cache API |

### ค่าที่ปรับบ่อย

| ค่า | ไฟล์ | Default | คำอธิบาย |
|-----|------|---------|----------|
| `STOP_PASS_THRESHOLD_M` | `campusConfig.js` | 60m | รัศมีที่ถือว่ารถ "ผ่าน" ป้าย |
| `offlineThresholdSec` | `campusConfig.js` | 8s | Timeout ก่อนแสดง Offline |
| History trail max | `useBusTracking.js:135` | 100 pts | จำนวนจุดประวัติสูงสุด |
| Ghost speed window | `useBusTracking.js:63` | 6s | Sliding window filter |

---

*เอกสารนี้อัพเดตล่าสุด: ตุลาคม 2026*
