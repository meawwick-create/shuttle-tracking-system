import React from 'react';

/**
 * Toast Notification Banner
 * @param {Object} props
 * @param {string} props.message
 * @param {boolean} props.show
 */
export function Toast({ message, show }) {
  return (
    <div className={`toast-notice ${show ? 'show' : ''}`} role="alert">
      <span>🔔</span>
      <span>{message}</span>
    </div>
  );
}
