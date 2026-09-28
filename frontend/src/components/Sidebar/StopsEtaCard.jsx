import React from 'react';

/**
 * Stops and Route-Aware ETA Card with User Location Awareness
 *
 * Displays:
 *  - Pinned "ป้ายที่คุณกำลังรอรถ" at the top when user's GPS is active
 *  - All stops in ROUTE_ORDER with per-stop ETA below
 *
 * Props:
 *  @param {Object|null}  nextStop            - The next stop the bus will reach
 *  @param {Object|null}  nearestStop         - Raw nearest stop (for highlight fallback)
 *  @param {string}       distanceText        - Distance to nextStop
 *  @param {string}       etaText             - ETA text for nextStop
 *  @param {Array}        stopsEta            - [{stop, distanceText, etaText, isNext}] ordered by route
 *  @param {Array}        stops               - Full CAMPUS_STOPS list (for click-to-focus)
 *  @param {Function}     onSelectStop        - Called when user clicks a stop row
 *  @param {boolean}      isOffline
 *  @param {Object|null}  userLocation        - { lat, lng, accuracy }
 *  @param {boolean}      isLocating          - GPS search in progress
 *  @param {string|null}  locationError       - GPS error message
 *  @param {Function}     requestLocation     - Function to trigger GPS permission
 *  @param {Object|null}  nearestUserStop     - Stop closest to user's phone
 *  @param {number|null}  userDistanceToStop  - Distance in meters from user to nearest stop
 *  @param {string}       userDistText        - Formatted distance text (e.g. "35 ม.")
 */
export function StopsEtaCard({
  nextStop,
  nearestStop,
  distanceText,
  etaText,
  stopsEta = [],
  stops = [],
  onSelectStop,
  isOffline = false,
  userLocation = null,
  isLocating = false,
  locationError = null,
  requestLocation,
  nearestUserStop = null,
  userDistanceToStop = null,
  userDistText = ''
}) {
  // Build a lookup for click-to-focus: stop id → original stop object with lat/lng
  const stopLookup = Object.fromEntries(stops.map(s => [s.id, s]));

  const highlightId = nextStop?.id ?? nearestStop?.id;

  // Find ETA info for user's stop
  const userStopEtaInfo = nearestUserStop
    ? stopsEta.find(s => s.stop.id === nearestUserStop.id)
    : null;

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

      {/* ── 1. User Pinned Stop (แสดงเด่นบนสุดเมื่อตรวจพบตำแหน่งผู้ใช้) ── */}
      {nearestUserStop ? (
        <div
          className="user-stop-highlight-card"
          onClick={() => onSelectStop && onSelectStop(nearestUserStop)}
          title="คลิกเพื่อเลื่อนดูป้ายของคุณบนแผนที่"
        >
          <div className="user-stop-highlight-top">
            <span className="user-stop-badge">
              <span className="user-stop-pulse-dot" />
              ป้ายที่คุณกำลังรอรถ
            </span>
            {userDistText && (
              <span className="user-stop-walk-dist">
                📍 คุณอยู่ห่าง {userDistText}
              </span>
            )}
          </div>

          <div className="user-stop-highlight-body">
            <div className="user-stop-details">
              <h3 className="user-stop-title">{nearestUserStop.name}</h3>
              <span className="user-stop-bus-dist">
                {isOffline
                  ? 'รถรับ-ส่งออฟไลน์'
                  : `รถรับ-ส่งอยู่ห่าง ${userStopEtaInfo?.distanceText || '--'}`}
              </span>
            </div>

            <div className="user-stop-eta-box">
              <span className="user-stop-eta-label">รถจะมาถึงใน</span>
              <span className="user-stop-eta-value">
                {isOffline ? '--' : (userStopEtaInfo?.etaText || '-- นาที')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ปุ่มเปิดใช้งาน GPS มือถือเพื่อระบุป้ายของผู้ใช้ */
        <div className="user-location-prompt-box">
          <button
            type="button"
            className={`btn-locate-user ${isLocating ? 'is-loading' : ''}`}
            onClick={requestLocation}
            disabled={isLocating}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            <span>
              {isLocating
                ? 'กำลังค้นหาพิกัด GPS มือถือของคุณ...'
                : '📍 ค้นหาป้ายที่ฉันกำลังรอรถ (GPS มือถือ)'}
            </span>
          </button>
          {locationError && (
            <p className="user-location-error-msg">{locationError}</p>
          )}
        </div>
      )}

      {/* ── 2. All Stops List Header ── */}
      <div className="stops-list-section-title">
        <span>ลำดับป้ายที่จะถึง (เรียงตามตำแหน่งรถ)</span>
        <span className="sub-hint">ใกล้สุด ➔ ไกลสุด</span>
      </div>

      {/* ── 3. All Stops with ETA ── */}
      <ul className="stops-list" title="คลิกเพื่อเลื่อนแผนที่ไปยังป้ายนั้น">
        {stopsEta.length > 0
          ? stopsEta.map(({ stop, etaText: stopEta, distanceText: stopDist, isNext }, index) => {
              const isHighlighted = stop.id === highlightId;
              const isUserStop    = stop.id === nearestUserStop?.id;
              const originalStop  = stopLookup[stop.id] ?? stop;
              const stopNum       = parseInt(stop.id.replace(/\D/g, ''), 10) || (index + 1);
              return (
                <li
                  key={stop.id}
                  className={`stop-item ${isHighlighted ? 'active' : ''} ${isUserStop ? 'user-stop-row' : ''}`}
                  onClick={() => onSelectStop && onSelectStop(originalStop)}
                >
                  <div className="stop-name-group">
                    <span className={`stop-dot ${isHighlighted ? 'stop-dot-next' : ''}`} />
                    <div className="stop-name-col">
                      <div className="stop-name-row">
                        <span className="stop-name-text">
                          {stopNum}. {stop.name}
                        </span>
                        {isUserStop && (
                          <span className="my-stop-tag">คุณอยู่ที่นี่</span>
                        )}
                      </div>
                      {!isOffline && (
                        <span className="stop-eta-sub">
                          {stopDist}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`stop-eta-badge ${isHighlighted ? 'stop-eta-badge-next' : ''}`}>
                    {isOffline ? '--' : stopEta}
                  </span>
                </li>
              );
            })
          /* Fallback: when offline or ETA not yet computed, show plain list */
          : stops.map((stop, index) => (
              <li
                key={stop.id}
                className={`stop-item ${stop.id === highlightId ? 'active' : ''}`}
                onClick={() => onSelectStop && onSelectStop(stop)}
              >
                <div className="stop-name-group">
                  <span className="stop-dot" />
                  <span>{index + 1}. {stop.name}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {stop.id}
                </span>
              </li>
            ))
        }
      </ul>
    </div>
  );
}
