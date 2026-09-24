import React from 'react';

/**
 * Stops and Estimated Time of Arrival (ETA) Card
 * @param {Object} props
 * @param {Object|null} props.nearestStop
 * @param {string} props.distanceText
 * @param {string} props.etaText
 * @param {Array} props.stops
 * @param {Function} props.onSelectStop
 */
export function StopsEtaCard({
  nearestStop,
  distanceText,
  etaText,
  stops = [],
  onSelectStop
}) {
  return (
    <div className="info-card stops-card">
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
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2 className="card-title">จุดจอดและประมาณการเวลา (ETA)</h2>
        </div>
      </div>

      {/* Nearest Stop & ETA Highlight */}
      <div className="eta-highlight">
        <div className="eta-left">
          <span className="eta-title">ป้ายรถถัดไปที่ใกล้ที่สุด</span>
          <span className="eta-stop-name">
            {nearestStop ? nearestStop.name : 'กำลังประมวลผล...'}
          </span>
          <span className="eta-dist">
            {nearestStop ? `ระยะทาง ${distanceText}` : '-- เมตร'}
          </span>
        </div>
        <div className="eta-badge">
          <div className="eta-time">{nearestStop ? etaText : '-- นาที'}</div>
        </div>
      </div>

      {/* Stops List with Click-to-Focus */}
      <ul className="stops-list" title="คลิกเพื่อเลื่อนแผนที่ไปยังป้ายนั้น">
        {stops.map((stop, index) => {
          const isNearest = nearestStop?.id === stop.id;
          return (
            <li
              key={stop.id}
              className={`stop-item ${isNearest ? 'active' : ''}`}
              onClick={() => onSelectStop && onSelectStop(stop)}
            >
              <div className="stop-name-group">
                <span className="stop-dot"></span>
                <span>
                  {index + 1}. {stop.name}
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {stop.id}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
