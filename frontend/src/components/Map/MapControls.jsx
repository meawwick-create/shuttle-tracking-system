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
  isOffline = false
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
        className="btn-map-control"
        onClick={onToggleCenter}
        title="โฟกัสตำแหน่งรถบัส"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
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
    </div>
  );
}
