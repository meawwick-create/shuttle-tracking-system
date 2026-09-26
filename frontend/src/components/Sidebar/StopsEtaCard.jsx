import React from 'react';

/**
 * Stops and Route-Aware ETA Card
 *
 * Displays:
 *  - The immediate next stop with distance + ETA badge
 *  - All stops in ROUTE_ORDER with per-stop ETA (cumulative along route)
 *
 * Props:
 *  @param {Object|null}  nextStop      - The next stop the bus will reach
 *  @param {Object|null}  nearestStop   - Raw nearest stop (for highlight fallback)
 *  @param {string}       distanceText  - Distance to nextStop
 *  @param {string}       etaText       - ETA text for nextStop
 *  @param {Array}        stopsEta      - [{stop, distanceText, etaText, isNext}] ordered by route
 *  @param {Array}        stops         - Full CAMPUS_STOPS list (for click-to-focus)
 *  @param {Function}     onSelectStop  - Called when user clicks a stop row
 *  @param {boolean}      isOffline
 */
export function StopsEtaCard({
  nextStop,
  nearestStop,
  distanceText,
  etaText,
  stopsEta = [],
  stops = [],
  onSelectStop,
  isOffline = false
}) {
  // Build a lookup for click-to-focus: stop id → original stop object with lat/lng
  const stopLookup = Object.fromEntries(stops.map(s => [s.id, s]));

  const highlightId = nextStop?.id ?? nearestStop?.id;

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

      {/* ── Next Stop Highlight ── */}
      <div className="eta-highlight">
        <div className="eta-left">
          <span className="eta-title">ป้ายถัดไป (ตามเส้นทาง)</span>
          <span
            className="eta-stop-name"
            style={{ color: isOffline ? 'var(--text-muted)' : undefined }}
          >
            {isOffline
              ? 'ไม่มีรถให้บริการในขณะนี้'
              : nextStop
              ? nextStop.name
              : 'กำลังค้นหาตำแหน่ง...'}
          </span>
          <span className="eta-dist">
            {isOffline
              ? 'รถออฟไลน์'
              : nextStop
              ? `ระยะทาง ${distanceText}`
              : '-- เมตร'}
          </span>
        </div>
        <div className="eta-badge">
          <div
            className="eta-time"
            style={{ color: isOffline ? 'var(--text-muted)' : undefined }}
          >
            {isOffline ? '--' : nextStop ? etaText : '-- นาที'}
          </div>
        </div>
      </div>

      {/* ── All Stops in Route Order with ETA ── */}
      <ul className="stops-list" title="คลิกเพื่อเลื่อนแผนที่ไปยังป้ายนั้น">
        {stopsEta.length > 0
          ? stopsEta.map(({ stop, etaText: stopEta, distanceText: stopDist, isNext }, index) => {
              const isHighlighted = stop.id === highlightId;
              const originalStop  = stopLookup[stop.id] ?? stop;
              return (
                <li
                  key={stop.id}
                  className={`stop-item ${isHighlighted ? 'active' : ''}`}
                  onClick={() => onSelectStop && onSelectStop(originalStop)}
                >
                  <div className="stop-name-group">
                    <span className={`stop-dot ${isNext ? 'stop-dot-next' : ''}`} />
                    <div className="stop-name-col">
                      <span className="stop-name-text">
                        {stop.name}
                      </span>
                      {!isOffline && (
                        <span className="stop-eta-sub">
                          {isNext ? `▶ ถัดไป · ${stopDist}` : stopDist}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`stop-eta-badge ${isNext ? 'stop-eta-badge-next' : ''}`}>
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
