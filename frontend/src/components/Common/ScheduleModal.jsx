import React from 'react';

/**
 * Schedule Modal Component
 * Displays the timetable and contact info based on the provided signboard.
 */
export function ScheduleModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content schedule-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 ตารางเวลาและข้อมูลการให้บริการ</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          
          <div className="schedule-section">
            <h3 className="section-title">📍 การให้บริการภายในวิทยาเขตสุราษฎร์ธานี</h3>
            <p className="subtitle">วันจันทร์ - วันศุกร์ (ในวันทำการ)</p>
            <ul className="schedule-list">
              <li>เวลา 06.30 - 08.30 น. <span>(จำนวน 3 คัน)</span></li>
              <li>เวลา 08.30 - 10.00 น. <span>(จำนวน 4 คัน)</span></li>
              <li>เวลา 12.00 - 14.00 น. <span>(จำนวน 4 คัน)</span></li>
              <li>เวลา 15.00 - 16.30 น. <span>(จำนวน 4 คัน)</span></li>
              <li>เวลา 16.30 - 17.30 น. <span>(จำนวน 3 คัน)</span></li>
            </ul>
          </div>

          <div className="schedule-section">
            <h3 className="section-title">📍 การให้บริการภายนอกวิทยาเขตสุราษฎร์ธานี</h3>
            <p className="subtitle">ในวันทำการ</p>
            <ul className="schedule-list">
              <li>รอบที่ 1 เวลา 17.00 น.</li>
              <li>รอบที่ 2 เวลา 17.30 น.</li>
              <li>รอบที่ 3 เวลา 18.00 น.</li>
              <li>รอบที่ 4 เวลา 18.30 น.</li>
              <li>รอบที่ 5 เวลา 19.00 น. <span>(รับนักศึกษากลับ)</span></li>
            </ul>
          </div>

          <div className="emergency-section">
            <h3 className="section-title">🚑 บริการกรณีเจ็บป่วยฉุกเฉิน</h3>
            <div className="emergency-grid">
              <div className="emergency-card">
                <strong>ในวันทำการ</strong>
                <p>ตั้งแต่เวลา 07.30 - 17.30 น.</p>
              </div>
              <div className="emergency-card">
                <strong>ในวันหยุดทำการ</strong>
                <p>ตลอด 24 ชั่วโมง</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
