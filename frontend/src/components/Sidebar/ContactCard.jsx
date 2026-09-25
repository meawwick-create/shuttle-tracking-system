import React from 'react';

/**
 * Contact Card Component
 * Displays campus transit & asset management contact info directly in the sidebar
 */
export function ContactCard() {
  return (
    <div className="info-card contact-card">
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
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          <h2 className="card-title">ติดต่อสอบถามข้อมูล</h2>
        </div>
      </div>

      <div className="contact-card-body">
        <div className="contact-dept-row">
          <span className="contact-dept-badge">ผู้รับผิดชอบ</span>
          <span className="contact-dept-title">งานบริหารทรัพย์สิน วิทยาเขตสุราษฎร์ธานี</span>
        </div>

        <div className="contact-list">
          <div className="contact-item">
            <span className="contact-item-icon">📞</span>
            <div className="contact-item-info">
              <a href="tel:077278826" className="contact-phone-link">
                โทร 0 7727 8826
              </a>
              <span className="contact-time-note">(วันเวลาทำการ 08.30 - 16.30 น.)</span>
            </div>
          </div>

          <div className="contact-item">
            <span className="contact-item-icon">🌐</span>
            <div className="contact-item-info">
              <span className="contact-fb-label">FB: </span>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-fb-link"
              >
                งานบริหารทรัพย์สิน มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตสุราษฎร์ธานี
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
