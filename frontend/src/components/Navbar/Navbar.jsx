import React, { useState, useEffect } from 'react';
import { LiveStatusPill } from './LiveStatusPill';

/**
 * Top Navbar component with self-contained digital clock
 * @param {Object} props
 * @param {string} props.theme
 * @param {Function} props.onToggleTheme
 */
export function Navbar({ isOffline, statusMessage, onOpenSchedule, theme, onToggleTheme }) {
  const [clock, setClock] = useState('--:--:--');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('th-TH', { hour12: false }));
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="brand-section">
          <div className="brand-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 6v6"></path>
              <path d="M15 6v6"></path>
              <path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5c-.3-1-1.1-1.8-2.1-1.8H4.7c-1 0-1.8.8-2.1 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C2 16.3 3 18 3 18h3"></path>
              <circle cx="7" cy="18" r="2"></circle>
              <path d="M9 18h5"></path>
              <circle cx="16" cy="18" r="2"></circle>
            </svg>
          </div>
          <div className="brand-info">
            <h1>Shuttle Tracking System</h1>
            <div className="sub-text">ระบบติดตามตำแหน่งรถรับ-ส่งนักศึกษา</div>
          </div>
        </div>

        <div className="nav-actions">
          <button 
            className="theme-toggle-btn" 
            onClick={onToggleTheme}
            title={theme === 'light' ? 'เปลี่ยนเป็นโหมดมืด' : 'เปลี่ยนเป็นโหมดสว่าง'}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              fontSize: '1.25rem', 
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button className="btn-schedule" onClick={onOpenSchedule} title="ตารางเวลาเดินรถ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>ตารางรถ</span>
          </button>

          <LiveStatusPill isOffline={isOffline} statusMessage={statusMessage} />

          <div className="clock-display" title="เวลาปัจจุบัน">
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
            <span>{clock}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
