import React from 'react';
import { MAP_LAYERS } from '../../config/campusConfig';

/**
 * Map Controls Bar
 * @param {Object} props
 * @param {string} props.selectedLayer
 * @param {Function} props.onSelectLayer
 * @param {boolean} props.autoCenter
 * @param {Function} props.onToggleCenter
 * @param {boolean} props.showStops
 * @param {Function} props.onToggleStops
 * @param {boolean} props.showRoute
 * @param {Function} props.onToggleRoute
 * @param {boolean} props.showTrail
 * @param {Function} props.onToggleTrail
 */
export function MapControls({
  selectedLayer,
  onSelectLayer,
  autoCenter,
  onToggleCenter,
  showStops,
  onToggleStops,
  showRoute,
  onToggleRoute,
  showTrail,
  onToggleTrail
}) {
  return (
    <div className="map-controls-bar">
      {/* Tile Layer Selector */}
      <div className="map-theme-select-wrapper">
        <select
          className="select-map-layer"
          value={selectedLayer}
          onChange={e => onSelectLayer(e.target.value)}
          title="เลือกรูปแบบแผนที่"
        >
          {MAP_LAYERS.map(layer => (
            <option key={layer.id} value={layer.id}>
              {layer.name}
            </option>
          ))}
        </select>
      </div>

      {/* Focus Bus Button */}
      <button
        type="button"
        className={`btn-map-control ${autoCenter ? 'active' : ''}`}
        onClick={onToggleCenter}
        title="เลื่อนแผนที่ไปยังตำแหน่งรถบัส"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="22" y1="12" x2="18" y2="12"></line>
          <line x1="6" y1="12" x2="2" y2="12"></line>
          <line x1="12" y1="6" x2="12" y2="2"></line>
          <line x1="12" y1="22" x2="12" y2="18"></line>
        </svg>
        <span>โฟกัสรถ</span>
      </button>

      {/* Toggle Stops Button */}
      <button
        type="button"
        className={`btn-map-control ${showStops ? 'active' : ''}`}
        onClick={onToggleStops}
        title="เปิด/ปิด การแสดงป้ายรถรับ-ส่ง"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>ป้ายรถ</span>
      </button>

      {/* Toggle Route Button */}
      <button
        type="button"
        className={`btn-map-control ${showRoute ? 'active' : ''}`}
        onClick={onToggleRoute}
        title="เปิด/ปิด การแสดงเส้นทางเดินรถ"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="19" r="3"></circle>
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path>
          <circle cx="18" cy="5" r="3"></circle>
        </svg>
        <span>เส้นทาง</span>
      </button>

      {/* Toggle Trail Button */}
      <button
        type="button"
        className={`btn-map-control ${showTrail ? 'active' : ''}`}
        onClick={onToggleTrail}
        title="เปิด/ปิด การแสดงประวัติการวิ่ง"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        <span>ประวัติวิ่ง</span>
      </button>
    </div>
  );
}
