import React from 'react';
import { BusDetailsCard } from './BusDetailsCard';
import { StopsEtaCard } from './StopsEtaCard';
import { VehicleSelectorCard } from './VehicleSelectorCard';
import { ContactCard } from './ContactCard';

/**
 * Sidebar Component aggregating all information cards
 */
export function Sidebar({
  busData,
  timeAgo,
  isOffline,
  nearestStop,
  nextStop,
  distanceText,
  etaText,
  stopsEta = [],
  stops,
  selectedBusId,
  onSelectBus,
  onSelectStop,
  onCopyCoords,
  userLocation,
  isLocating,
  locationError,
  requestLocation,
  nearestUserStop,
  userDistanceToStop,
  userDistText
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
        nextStop={isOffline ? null : nextStop}
        distanceText={distanceText}
        etaText={etaText}
        stopsEta={isOffline ? [] : stopsEta}
        stops={stops}
        onSelectStop={onSelectStop}
        isOffline={isOffline}
        userLocation={userLocation}
        isLocating={isLocating}
        locationError={locationError}
        requestLocation={requestLocation}
        nearestUserStop={nearestUserStop}
        userDistanceToStop={userDistanceToStop}
        userDistText={userDistText}
      />

      <VehicleSelectorCard
        selectedBusId={selectedBusId}
        onSelectBus={onSelectBus}
      />

      <ContactCard />
    </aside>
  );
}

