import React from 'react';

/**
 * Bus Details Card Component
 * @param {Object} props
 * @param {Object|null} props.busData
 * @param {string} props.timeAgo
 * @param {Function} props.onCopyCoords
 */
export function BusDetailsCard({ busData, timeAgo, isOffline, onCopyCoords }) {
  const speed = busData?.speed ?? 0;
  const isMoving = busData?.isMoving ?? false;
  const speedPercent = Math.min(100, Math.max(4, (speed / 60) * 100));

  const latText = busData?.latitude ? busData.latitude.toFixed(7) : '-';
  const lngText = busData?.longitude ? busData.longitude.toFixed(7) : '-';

  return (
    <div className="info-card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-badge">
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
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M7 7h10"></path>
              <path d="M7 12h10"></path>
              <path d="M7 17h10"></path>
            </svg>
          </div>
          <h2 className="card-title">ข้อมูลรถรับ-ส่ง (Bus Details)</h2>
        </div>
      </div>

      {/* Bus Identity & Status Badge */}
      <div className="bus-profile">
        <div className="bus-identity">
          <span className="bus-name">{busData?.busName || 'กำลังโหลดข้อมูล...'}</span>
          <span className="bus-id-tag">{busData?.busId || 'BUS01'}</span>
        </div>
        <div className={`motion-badge ${isMoving ? 'moving' : 'stopped'}`}>
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
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>{isMoving ? 'กำลังวิ่ง' : 'จอดอยู่'}</span>
        </div>
      </div>

      {/* Speedometer Display */}
      {isMoving && !isOffline && (
        <div className="speed-meter-box">
          <div className="speed-metric">
            <span className="speed-number">{speed.toFixed(1)}</span>
            <span className="speed-unit">km/h</span>
          </div>
          <div className="speed-bar-track">
            <div className="speed-bar-fill" style={{ width: `${speedPercent}%` }}></div>
          </div>
        </div>
      )}

    </div>
  );
}
