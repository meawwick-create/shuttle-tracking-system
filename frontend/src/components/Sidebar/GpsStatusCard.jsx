import React from 'react';

/**
 * GPS Signal Status Card for NEO-6M
 * @param {Object} props
 * @param {number} props.satellites
 */
export function GpsStatusCard({ satellites = 0 }) {
  let qualityText = '';
  let qualityClass = '';
  let activeBars = 0;
  let barColorClass = '';

  if (satellites === 0) {
    qualityText = 'ไม่มีสัญญาณ GPS';
    qualityClass = 'quality-none';
    barColorClass = 'bar-none';
    activeBars = 0;
  } else if (satellites >= 1 && satellites <= 3) {
    qualityText = 'สัญญาณ GPS อ่อน';
    qualityClass = 'quality-weak';
    barColorClass = 'bar-weak';
    activeBars = 1;
  } else if (satellites >= 4 && satellites <= 6) {
    qualityText = 'สัญญาณ GPS ปกติ';
    qualityClass = 'quality-normal';
    barColorClass = 'bar-normal';
    activeBars = 3;
  } else {
    qualityText = 'สัญญาณ GPS ดีมาก';
    qualityClass = 'quality-good';
    barColorClass = 'bar-good';
    activeBars = 4;
  }

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
              <path d="M4.93 4.93l4.24 4.24"></path>
              <path d="M14.83 9.17l4.24-4.24"></path>
              <path d="M14.83 14.83l4.24 4.24"></path>
              <path d="M9.17 14.83l-4.24 4.24"></path>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
          </div>
          <h2 className="card-title">สถานะสัญญาณ GPS (NEO-6M)</h2>
        </div>
      </div>

      <div className="gps-card-body">
        <div className="gps-info-col">
          <div className="gps-sat-count">{satellites} ดวง</div>
          <span className={`gps-quality-badge ${qualityClass}`}>{qualityText}</span>
        </div>

        {/* 4-bar Signal Strength Meter */}
        <div className="gps-meter" title="ระดับความแรงสัญญาณดาวเทียม">
          {[1, 2, 3, 4].map(barIndex => (
            <div
              key={barIndex}
              className={`meter-bar ${barIndex <= activeBars ? `active ${barColorClass}` : ''}`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
