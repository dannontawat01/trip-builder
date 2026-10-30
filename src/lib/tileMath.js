export const MAX_OFFLINE_TILES = 300;
export const OFFLINE_MIN_ZOOM = 12;
export const OFFLINE_MAX_ZOOM = 16;
const MAX_MERCATOR_LATITUDE = 85.05112878;
const DEFAULT_PADDING_DEGREES = 0.01;
const MAX_ZOOM = 22;

export function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function validateZoom(zoom) {
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > MAX_ZOOM) throw new RangeError('Invalid tile zoom');
}

function wrapLongitude(longitude) {
  return longitude >= -180 && longitude <= 180 ? longitude : ((longitude + 180) % 360 + 360) % 360 - 180;
}

export function latLngToTile(lat, lng, zoom) {
  if (!isValidCoordinate(lat, lng)) throw new RangeError('Invalid tile coordinate');
  validateZoom(zoom);
  const clampedLat = Math.max(Math.min(lat, MAX_MERCATOR_LATITUDE), -MAX_MERCATOR_LATITUDE);
  const tileCount = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * tileCount);
  const latRadians = (clampedLat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) * tileCount);
  return {
    x: Math.min(Math.max(x, 0), tileCount - 1),
    y: Math.min(Math.max(y, 0), tileCount - 1),
    z: zoom
  };
}

export function boundsFromPoints(points, paddingDegrees = DEFAULT_PADDING_DEGREES) {
  if (!Number.isFinite(paddingDegrees) || paddingDegrees < 0 || paddingDegrees > 1) throw new RangeError('Invalid padding');
  const validPoints = (Array.isArray(points) ? points : []).filter(point => point && isValidCoordinate(point.lat, point.lng));
  if (validPoints.length === 0) return null;
  const longitudes = validPoints.map(point => point.lng).sort((left, right) => left - right);
  let gapIndex = longitudes.length - 1;
  let largestGap = longitudes[0] + 360 - longitudes[gapIndex];
  for (let index = 0; index < longitudes.length - 1; index++) {
    const gap = longitudes[index + 1] - longitudes[index];
    if (gap > largestGap) { largestGap = gap; gapIndex = index; }
  }
  const south = validPoints.reduce((lowest, point) => Math.min(lowest, point.lat), 90);
  const north = validPoints.reduce((highest, point) => Math.max(highest, point.lat), -90);
  const coversWorld = 360 - largestGap + paddingDegrees * 2 >= 360;
  return {
    north: Math.min(90, north + paddingDegrees),
    south: Math.max(-90, south - paddingDegrees),
    east: coversWorld ? 180 : wrapLongitude(longitudes[gapIndex] + paddingDegrees),
    west: coversWorld ? -180 : wrapLongitude(longitudes[(gapIndex + 1) % longitudes.length] - paddingDegrees)
  };
}

function rangesForZoom(bounds, zoom) {
  const topLeft = latLngToTile(bounds.north, bounds.west, zoom);
  const bottomRight = latLngToTile(bounds.south, bounds.east, zoom);
  const lastColumn = 2 ** zoom - 1;
  const columns = bounds.west <= bounds.east ? [[topLeft.x, bottomRight.x]]
    : topLeft.x <= bottomRight.x ? [[0, lastColumn]] : [[topLeft.x, lastColumn], [0, bottomRight.x]];
  const rows = bottomRight.y - topLeft.y + 1;
  return { columns, firstRow: topLeft.y, lastRow: bottomRight.y,
    count: columns.reduce((count, [first, last]) => count + (last - first + 1) * rows, 0) };
}

// Adds zoom levels from low to high and stops before a level would exceed the tile budget.
export function tilesForBounds(bounds, {
  minZoom = OFFLINE_MIN_ZOOM,
  maxZoom = OFFLINE_MAX_ZOOM,
  maxTiles = MAX_OFFLINE_TILES
} = {}) {
  if (!bounds) return [];
  validateZoom(minZoom);
  validateZoom(maxZoom);
  if (minZoom > maxZoom || !Number.isInteger(maxTiles) || maxTiles < 1 || maxTiles > MAX_OFFLINE_TILES) throw new RangeError('Invalid tile budget');
  if (!isValidCoordinate(bounds.north, bounds.west) || !isValidCoordinate(bounds.south, bounds.east) || bounds.north < bounds.south) throw new RangeError('Invalid tile bounds');
  const tiles = [];
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const ranges = rangesForZoom(bounds, zoom);
    if (tiles.length + ranges.count > maxTiles) break;
    for (const [firstColumn, lastColumn] of ranges.columns) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        for (let row = ranges.firstRow; row <= ranges.lastRow; row++) tiles.push({ x: column, y: row, z: zoom });
      }
    }
  }
  return tiles;
}

export function buildTileUrl(template, tile, subdomains = '') {
  const subdomain = subdomains ? subdomains[(tile.x + tile.y) % subdomains.length] : '';
  return template
    .replace('{s}', subdomain)
    .replace('{z}', String(tile.z))
    .replace('{x}', String(tile.x))
    .replace('{y}', String(tile.y))
    .replace('{r}', '');
}
