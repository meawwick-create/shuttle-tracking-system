import React from 'react';

/**
 * Live Tracking / Offline status badge with pulse radar animation
 * @param {Object} props
 * @param {boolean} props.isOffline
 * @param {string} props.statusMessage
 */
export function LiveStatusPill({ isOffline, statusMessage }) {
  return (
    <div className={`live-status-pill ${isOffline ? 'offline' : ''}`}>
      <span className="pulse-dot"></span>
      <span>{statusMessage || (isOffline ? 'Offline' : 'Live Tracking')}</span>
    </div>
  );
}
