import React from 'react';
import { BusDetailsCard } from './BusDetailsCard';
import { StopsEtaCard } from './StopsEtaCard';
import { VehicleSelectorCard } from './VehicleSelectorCard';

/**
 * Sidebar Component aggregating all information cards
 */
export function Sidebar({
  busData,
  timeAgo,
  isOffline,
  nearestStop,
  distanceText,
  etaText,
  stops,
  selectedBusId,
  onSelectBus,
  onSelectStop,
  onCopyCoords
}) {
  return (
    <aside className="sidebar-panel">
      <BusDetailsCard
        busData={busData}
        timeAgo={timeAgo}
        isOffline={isOffline}
        onCopyCoords={onCopyCoords}
      />

      <StopsEtaCard
        nearestStop={isOffline ? null : nearestStop}
        distanceText={distanceText}
        etaText={etaText}
        stops={stops}
        onSelectStop={onSelectStop}
      />

      <VehicleSelectorCard
        selectedBusId={selectedBusId}
        onSelectBus={onSelectBus}
      />
    </aside>
  );
}
