import React from 'react';

/**
 * Floating HUD on Leaflet Map
 * @param {Object} props
 * @param {number} props.speed
 * @param {boolean} props.isOffline
 * @param {boolean} props.isMoving
 */
export function MapHudOverlay({ speed = 0, isOffline = false, isMoving = false }) {
  // ซ่อนทั้งกล่องเมื่อ GPS Offline
  if (isOffline) return null;

  return (
    <div className="map-hud-overlay">
      {/* ซ่อนความเร็วเมื่อรถจอด */}
      {isMoving && (
        <>
          <div className="hud-item">
            <span className="hud-label">ความเร็ว</span>
            <span className="hud-value">{speed.toFixed(1)} km/h</span>
          </div>
          <div className="hud-divider"></div>
        </>
      )}
      <div className="hud-item">
        <span className="hud-label">สถานะระบบ</span>
        <span
          className="hud-value"
          style={{ color: 'var(--status-moving)' }}
        >
          LIVE
        </span>
      </div>
    </div>
  );
}
