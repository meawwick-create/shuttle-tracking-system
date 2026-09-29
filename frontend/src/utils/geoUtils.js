/**
 * Geospatial Calculation Utilities
 */

/**
 * Haversine Formula: Calculates distance between two GPS coordinates in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
export function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates the forward azimuth / bearing between two points in degrees (0 - 360).
 * 0 = North, 90 = East, 180 = South, 270 = West
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} bearing in degrees
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Calculates the shortest signed angular difference from currentDeg to targetDeg in range [-180, 180].
 * Correctly handles 0/360 boundary crossings and unwrapped multi-revolution angles.
 * @param {number} currentDeg
 * @param {number} targetDeg
 * @returns {number} delta in degrees (-180 to +180)
 */
export function getShortestAngleDelta(currentDeg, targetDeg) {
  const diff = (targetDeg - currentDeg) % 360;
  return ((diff + 540) % 360) - 180;
}

/**
 * Validates GPS coordinate numbers.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    !(lat === 0 && lng === 0) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Projects a GPS coordinate forward by a given distance (meters) along a bearing (degrees).
 * Used for dead-reckoning and network latency compensation at high vehicle speeds (>25 km/h).
 * @param {number} lat
 * @param {number} lon
 * @param {number} bearingDeg
 * @param {number} distanceM
 * @returns {[number, number]} [projectedLat, projectedLng]
 */
export function projectCoordinates(lat, lon, bearingDeg, distanceM) {
  if (!distanceM || distanceM <= 0) return [lat, lon];
  const R = 6371e3;
  const dByR = distanceM / R;
  const rad = deg => (deg * Math.PI) / 180;
  const deg = r => (r * 180) / Math.PI;

  const lat1 = rad(lat);
  const lon1 = rad(lon);
  const brng = rad(bearingDeg);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) +
    Math.cos(lat1) * Math.sin(dByR) * Math.cos(brng)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(dByR) * Math.cos(lat1),
    Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [deg(lat2), deg(lon2)];
}
