'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

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

export default function MapComponent({ itin, nDays, activeCity, activeLang }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const pathsLayerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Handle invalidate size when fullscreen toggles
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current.invalidateSize();
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
    }).setView(center, 13);

    // Add Zoom Control to bottom-right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Add tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Initialize Layers for markers and paths
    const markersLayer = L.layerGroup().addTo(map);
    const pathsLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    pathsLayerRef.current = pathsLayer;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
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
      const hasMarkers = Object.values(itin).flat().some(item => item.lat && item.lng);
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
    for (let day = 1; day <= nDays; day++) {
      const items = itin[day] || [];
      const dayColor = DAY_COLORS[(day - 1) % DAY_COLORS.length];
      const dayCoordinates = [];

      items.forEach((item, index) => {
        if (!item.lat || !item.lng) return;

        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        const latLng = L.latLng(lat, lng);
        dayCoordinates.push(latLng);
        bounds.extend(latLng);
        hasCoords = true;

        const iconHtml = `
          <div class="custom-map-pin-container">
            <div class="pin-teardrop" style="background-color: ${dayColor};"></div>
            <span class="pin-icon">${item.icon || '📍'}</span>
            <span class="pin-number">${day}-${index + 1}</span>
          </div>
        `;

        const markerIcon = L.divIcon({
          className: 'custom-leaflet-icon',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        });

        // Add Marker
        const marker = L.marker([lat, lng], { icon: markerIcon });
        
        // Add Popup
        const placeName = (item.names && item.names[activeLang]) || item.name;
        const mapsLink = item.gmaps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}+${lat},${lng}`;
        const popupContent = `
          <div class="map-popup-card">
            <div class="popup-title">${item.icon || '📍'} ${placeName} ${item.rating ? `<span style="color: #EF9F27; font-size: 11px; font-weight: bold; margin-left: 4px;">⭐ ${item.rating}</span>` : ''}</div>
            <div class="popup-day" style="background: ${dayColor}22; color: ${dayColor}">${activeLang === 'th' ? `วันที่ ${day} · ลำดับที่ ${index + 1}` : `Day ${day} · Stop ${index + 1}`}</div>
            ${item.dur ? `<div class="popup-time">⏱ ${activeLang === 'th' ? `ใช้เวลา: ${item.dur} นาที` : `Duration: ${item.dur} mins`}</div>` : ''}
            ${item.addr ? `<div class="popup-addr">${item.addr}</div>` : ''}
            <div class="popup-gmaps" style="margin-top: 6px; border-top: 1px dashed var(--border); padding-top: 6px;">
              <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" style="color: #1D9E75; font-size: 11px; font-weight: 600; text-decoration: underline; display: flex; align-items: center; gap: 4px;">
                🗺️ ${activeLang === 'th' ? 'เปิดใน Google Maps' : 'Open in Google Maps'}
              </a>
            </div>
          </div>
        `;
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
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itin, nDays, activeLang]);

  return (
    <div className={`map-component-wrapper ${isFullscreen ? 'fullscreen' : ''}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <button
        className="map-fullscreen-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? (activeLang === 'th' ? 'ย่อหน้าจอ' : 'Exit Fullscreen') : (activeLang === 'th' ? 'ขยายเต็มจอ' : 'Fullscreen')}
      >
        {isFullscreen ? '✕' : '⛶'}
      </button>
    </div>
  );
}
