import React from 'react';
import { VEHICLES } from '../../config/campusConfig';

/**
 * Multi-Vehicle Selector Card
 * @param {Object} props
 * @param {string} props.selectedBusId
 * @param {Function} props.onSelectBus
 */
export function VehicleSelectorCard({ selectedBusId = 'BUS01', onSelectBus }) {
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
              <rect x="2" y="3" width="20" height="14" rx="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h2 className="card-title">เลือกรถติดตาม (Vehicle Selection)</h2>
        </div>
      </div>

      <select
        className="bus-selector-dropdown"
        value={selectedBusId}
        onChange={e => onSelectBus(e.target.value)}
        aria-label="เลือกรถรับ-ส่ง"
      >
        {VEHICLES.map(vehicle => (
          <option
            key={vehicle.id}
            value={vehicle.id}
            disabled={vehicle.disabled}
          >
            {vehicle.name}
          </option>
        ))}
      </select>
    </div>
  );
}
