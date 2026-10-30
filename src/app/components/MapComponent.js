'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { escapeHtml } from '@/lib/htmlEscape';
import { boundsFromPoints, isValidCoordinate, tilesForBounds } from '@/lib/tileMath';
import { getOfflineProvider, sendOfflineMessage } from '@/lib/offlineMap';
import GlassSurface from './GlassSurface';

const CITY_COORDS = {
  bkk: [13.7563, 100.5018], // Bangkok
  cnx: [18.7883, 98.9853],  // Chiang Mai
  hkt: [7.8804, 98.3922],   // Phuket
  ptt: [12.9236, 100.8824],  // Pattaya
  aya: [14.3532, 100.5681],  // Ayutthaya
  sel: [37.5665, 126.9780],  // Seoul
  bus: [35.1796, 129.0756],  // Busan
  jej: [33.4996, 126.5312],  // Jeju
  tky: [35.6762, 139.6503],  // Tokyo
  kyo: [35.0116, 135.7681],  // Kyoto
  osk: [34.6937, 135.5023],  // Osaka
};

const DAY_COLORS = [
  "#639922", // Day 1 Acc
  "#1D9E75", // Day 2 Acc
  "#378ADD", // Day 3 Acc
  "#EF9F27", // Day 4 Acc
  "#D4537E", // Day 5 Acc
  "#E24B4A", // Day 6 Acc
  "#7F77DD", // Day 7 Acc
];

const OFFLINE_PROVIDER = getOfflineProvider(process.env.NEXT_PUBLIC_OFFLINE_TILE_URL_TEMPLATE, process.env.NEXT_PUBLIC_OFFLINE_TILE_LICENSED);
const MAP_TOOL_STYLE = { width: 30, height: 30, flexShrink: 0, border: '1px solid var(--border, #ccc)', borderRadius: 4, background: 'transparent', color: 'inherit', fontSize: 18 };
const OFFLINE_COPY = {
  th: { download: 'ดาวน์โหลดแผนที่', cancel: 'ยกเลิก', clear: 'ล้างแคชแผนที่', refresh: 'นับแคชใหม่', cached: 'แคช', tiles: 'ไทล์', unavailable: 'ยังไม่มีผู้ให้บริการที่อนุญาตใช้งาน offline', worker: 'แผนที่ offline ยังไม่พร้อม', complete: 'พื้นที่ที่เลือกพร้อม offline', cancelled: 'ยกเลิกแล้ว พื้นที่ยังไม่พร้อม offline', error: 'ดาวน์โหลดไม่ครบ พื้นที่ยังไม่พร้อม offline', empty: 'พื้นที่เกินงบ 300 ไทล์', idle: 'พร้อมดาวน์โหลด', fullscreen: 'ขยายเต็มจอ', exit: 'ย่อหน้าจอ' },
  en: { download: 'Download map', cancel: 'Cancel', clear: 'Clear map cache', refresh: 'Refresh cache count', cached: 'Cached', tiles: 'tiles', unavailable: 'No offline-licensed provider configured', worker: 'Offline map is not available yet', complete: 'Selected area ready offline', cancelled: 'Cancelled; area not ready offline', error: 'Incomplete; area not ready offline', empty: 'Area exceeds the 300-tile budget', idle: 'Ready to download', fullscreen: 'Fullscreen', exit: 'Exit fullscreen' }
};

function safeMapsLink(candidate, name, lat, lng) {
  const fallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name || '')}+${lat},${lng}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && ['www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export function createPlaceMarkup(item, day, index, color, activeLang, lat, lng) {
  const dayColor = DAY_COLORS.includes(color) ? color : DAY_COLORS[0];
  const placeName = item.names?.[activeLang] || item.name || '';
  const icon = escapeHtml(item.icon || '📍');
  const position = `${escapeHtml(day)}-${escapeHtml(index + 1)}`;
  const mapsLink = escapeHtml(safeMapsLink(item.gmaps_url, placeName, lat, lng));
  const dayLabel = activeLang === 'th' ? `วันที่ ${escapeHtml(day)} · ลำดับที่ ${escapeHtml(index + 1)}` : `Day ${escapeHtml(day)} · Stop ${escapeHtml(index + 1)}`;
  const durationLabel = activeLang === 'th' ? `ใช้เวลา: ${escapeHtml(item.dur)} นาที` : `Duration: ${escapeHtml(item.dur)} mins`;
  return {
    iconHtml: `<div class="custom-map-pin-container"><div class="pin-teardrop" style="background-color: ${dayColor};"></div><span class="pin-icon">${icon}</span><span class="pin-number">${position}</span></div>`,
    popupContent: `<div class="map-popup-card">
      <div class="popup-title">${icon} ${escapeHtml(placeName)} ${item.rating ? `<span style="color: #EF9F27; font-size: 11px; font-weight: bold; margin-left: 4px;">⭐ ${escapeHtml(item.rating)}</span>` : ''}</div>
      <div class="popup-day" style="background: ${dayColor}22; color: ${dayColor}">${dayLabel}</div>
      ${item.dur ? `<div class="popup-time">⏱ ${durationLabel}</div>` : ''}
      ${item.addr ? `<div class="popup-addr">${escapeHtml(item.addr)}</div>` : ''}
      <div class="popup-gmaps" style="margin-top: 6px; border-top: 1px dashed var(--border); padding-top: 6px;">
        <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" style="color: #1D9E75; font-size: 11px; font-weight: 600; text-decoration: underline; display: flex; align-items: center; gap: 4px;">🗺️ ${activeLang === 'th' ? 'เปิดใน Google Maps' : 'Open in Google Maps'}</a>
      </div></div>`
  };
}

function placeCoordinates(item) {
  if (!item || item.lat == null || item.lng == null || String(item.lat).trim() === '' || String(item.lng).trim() === '') return null;
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
}

export default function MapComponent({ itin, nDays, activeCity, activeLang }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const pathsLayerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [offline, setOffline] = useState({ configured: false, count: 0, status: 'idle', completed: 0, total: 0 });
  const workerRef = useRef(null);
  const downloadRef = useRef(null);
  const areaTilesRef = useRef(null);
  const mountedRef = useRef(false);
  const copy = OFFLINE_COPY[activeLang] || OFFLINE_COPY.en;
  const downloading = offline.status === 'progress';

  useEffect(() => {
    mountedRef.current = true;
    if (!('serviceWorker' in navigator)) return () => { mountedRef.current = false; };
    let handshake;
    const sync = async () => {
      handshake?.abort();
      handshake = new AbortController();
      const { signal } = handshake;
      workerRef.current = navigator.serviceWorker.controller;
      setOffline(previous => ({ ...previous, configured: false }));
      try {
        await sendOfflineMessage(workerRef.current, OFFLINE_PROVIDER
          ? { type: 'OFFLINE_CONFIGURE', provider: OFFLINE_PROVIDER }
          : { type: 'OFFLINE_DISABLE' }, { signal });
        const status = await sendOfflineMessage(workerRef.current, { type: 'OFFLINE_STATUS' }, { signal });
        if (!signal.aborted) setOffline(previous => ({ ...previous, count: status.count, configured: !!OFFLINE_PROVIDER }));
      } catch {
        if (!signal.aborted) setOffline(previous => ({ ...previous, configured: false }));
      }
    };
    sync();
    navigator.serviceWorker.addEventListener('controllerchange', sync);
    return () => {
      mountedRef.current = false;
      handshake?.abort();
      navigator.serviceWorker.removeEventListener('controllerchange', sync);
      if (downloadRef.current) sendOfflineMessage(workerRef.current, { type: 'OFFLINE_CANCEL' }).catch(() => {});
      downloadRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (downloadRef.current) {
      sendOfflineMessage(workerRef.current, { type: 'OFFLINE_CANCEL' }).catch(() => {});
      downloadRef.current.abort();
      downloadRef.current = null;
    }
    areaTilesRef.current = null;
    setOffline(previous => ({ ...previous, status: 'idle', completed: 0, total: 0 }));
  }, [itin, nDays, activeCity]);

  const manageCache = async type => {
    try {
      const response = await sendOfflineMessage(workerRef.current, { type, ...(type === 'OFFLINE_STATUS' && areaTilesRef.current ? { tiles: areaTilesRef.current } : {}) });
      if (mountedRef.current) setOffline(previous => ({ ...previous, ...(Number.isInteger(response.count) ? { count: response.count } : {}), ...(type === 'OFFLINE_CLEAR' || (previous.status === 'complete' && !response.ready) ? { status: 'idle' } : {}) }));
    } catch {
      if (mountedRef.current) setOffline(previous => ({ ...previous, status: 'error' }));
    }
  };

  const downloadArea = async () => {
    if (!offline.configured || downloadRef.current) return;
    const points = Object.values(itin || {}).flat().map(placeCoordinates).filter(Boolean);
    const center = CITY_COORDS[activeCity] || CITY_COORDS.bkk;
    const tiles = tilesForBounds(boundsFromPoints(points.length ? points : [{ lat: center[0], lng: center[1] }]));
    if (!tiles.length) return setOffline(previous => ({ ...previous, status: 'empty' }));
    areaTilesRef.current = tiles;
    const controller = new AbortController();
    downloadRef.current = controller;
    setOffline(previous => ({ ...previous, status: 'progress', completed: 0, total: tiles.length }));
    try {
      await sendOfflineMessage(workerRef.current, { type: 'OFFLINE_CONFIGURE', provider: OFFLINE_PROVIDER }, { signal: controller.signal });
      const response = await sendOfflineMessage(workerRef.current, { type: 'OFFLINE_DOWNLOAD', tiles }, {
        signal: controller.signal,
        onProgress: progress => setOffline(previous => ({ ...previous, completed: progress.completed, total: progress.total }))
      });
      if (!controller.signal.aborted) setOffline(previous => ({ ...previous, status: response.ready ? 'complete' : 'cancelled', completed: response.completed }));
    } catch {
      if (!controller.signal.aborted) {
        sendOfflineMessage(workerRef.current, { type: 'OFFLINE_CANCEL' }).catch(() => {});
        setOffline(previous => ({ ...previous, status: 'error' }));
      }
    } finally {
      if (downloadRef.current === controller) downloadRef.current = null;
      if (!controller.signal.aborted) await manageCache('OFFLINE_STATUS');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Handle invalidate size when fullscreen toggles
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false });
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use default coordinates for the active city
    const center = CITY_COORDS[activeCity] || [13.7563, 100.5018];

    // Initialize leaflet map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      zoomAnimation: false,
    }).setView(center, 13);

    // Add Zoom Control to bottom-right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Add tile layer
    const cartoKey = typeof process.env.NEXT_PUBLIC_CARTO_API_KEY === 'string' ? process.env.NEXT_PUBLIC_CARTO_API_KEY.trim() : '';
    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let tileOptions = {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    };

    if (OFFLINE_PROVIDER) {
      tileUrl = OFFLINE_PROVIDER.template;
      tileOptions = { ...tileOptions, attribution: escapeHtml(process.env.NEXT_PUBLIC_OFFLINE_TILE_ATTRIBUTION || new URL(tileUrl).hostname), maxZoom: 16 };
    } else if (cartoKey && cartoKey.length > 0) {
      tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`;
      tileOptions = {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      };
    }

    L.tileLayer(tileUrl, tileOptions).addTo(map);

    // Initialize Layers for markers and paths
    const markersLayer = L.layerGroup().addTo(map);
    const pathsLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    pathsLayerRef.current = pathsLayer;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current === map) {
        map.invalidateSize({ animate: false });
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      mapRef.current = null;
      markersLayerRef.current = null;
      pathsLayerRef.current = null;
      map.stop();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle City Change
  useEffect(() => {
    if (!mapRef.current) return;
    const center = CITY_COORDS[activeCity];
    if (center) {
      // Check if we have any markers, if not zoom to city center
      const hasMarkers = Object.values(itin || {}).flat().some(item => placeCoordinates(item));
      if (!hasMarkers) {
        mapRef.current.setView(center, 13);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity]);

  // Update Markers & Paths when itinerary changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !pathsLayerRef.current) return;

    // Clear previous markers & paths
    markersLayerRef.current.clearLayers();
    pathsLayerRef.current.clearLayers();

    const bounds = L.latLngBounds();
    let hasCoords = false;

    // Iterate through each day to render markers and paths
    for (let day = 1; day <= Math.min(Number(nDays) || 0, 15); day++) {
      const items = Array.isArray(itin?.[day]) ? itin[day] : [];
      const dayColor = DAY_COLORS[(day - 1) % DAY_COLORS.length];
      const dayCoordinates = [];

      items.forEach((item, index) => {
        const coordinates = placeCoordinates(item);
        if (!coordinates) return;
        const { lat, lng } = coordinates;
        const latLng = L.latLng(lat, lng);
        dayCoordinates.push(latLng);
        bounds.extend(latLng);
        hasCoords = true;

        const { iconHtml, popupContent } = createPlaceMarkup(item, day, index, dayColor, activeLang, lat, lng);

        const markerIcon = L.divIcon({
          className: 'custom-leaflet-icon',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        });

        // Add Marker
        const marker = L.marker([lat, lng], { icon: markerIcon });
        
        marker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(marker);
      });

      // Draw path (polyline) for this day
      if (dayCoordinates.length > 1) {
        const polyline = L.polyline(dayCoordinates, {
          color: dayColor,
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
          className: 'animated-polyline'
        });
        pathsLayerRef.current.addLayer(polyline);
      }
    }

    // Auto fit map bounds if we have coordinates
    if (hasCoords) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
    }
  }, [itin, nDays, activeLang]);

  return (
    <div className={`map-component-wrapper ${isFullscreen ? 'fullscreen' : ''}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <GlassSurface variant="map-controls" className="map-offline-controls" role="group" aria-label={copy.download}>
        <div className="map-offline-row">
          <button type="button" style={MAP_TOOL_STYLE} title={copy.download} aria-label={copy.download} disabled={!offline.configured || downloading} onClick={downloadArea}>↓</button>
          {downloading && <button type="button" style={MAP_TOOL_STYLE} title={copy.cancel} aria-label={copy.cancel} onClick={() => manageCache('OFFLINE_CANCEL')}>✕</button>}
          <button type="button" style={MAP_TOOL_STYLE} title={copy.clear} aria-label={copy.clear} onClick={() => manageCache('OFFLINE_CLEAR')}>⌫</button>
          <button type="button" style={MAP_TOOL_STYLE} title={copy.refresh} aria-label={copy.refresh} onClick={() => manageCache('OFFLINE_STATUS')}>↻</button>
          <span>{copy.cached}: {offline.count} {copy.tiles}</span>
        </div>
        <div className="map-offline-status" role="status" aria-live="polite">
          {!OFFLINE_PROVIDER ? copy.unavailable : !offline.configured ? copy.worker : downloading ? `${offline.completed}/${offline.total} ${copy.tiles}` : copy[offline.status] || copy.idle}
        </div>
        {downloading && <progress aria-label={copy.download} max={offline.total || 1} value={offline.completed} style={{ width: '100%' }} />}
      </GlassSurface>
      <button
        type="button"
        className="map-fullscreen-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? copy.exit : copy.fullscreen}
        aria-pressed={isFullscreen}
        title={isFullscreen ? copy.exit : copy.fullscreen}
      >
        {isFullscreen ? '✕' : '⛶'}
      </button>
    </div>
  );
}
