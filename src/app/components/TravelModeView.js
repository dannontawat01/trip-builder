'use client';

import { useState, useEffect, useMemo } from 'react';
import { calculateDistanceKm, estimateTravelTimeMins } from '@/lib/routeOptimizer';

/**
 * Helper to get the best local name for the Taxi Card
 * Priority: native script for the country/city, then active language, then fallback name
 */
function getLocalTaxiName(place, activeCity, activeLang) {
  if (!place) return '';
  const names = place.names || {};

  // Japan cities: tky (Tokyo), kyo (Kyoto), osk (Osaka)
  if (['tky', 'kyo', 'osk'].includes(activeCity)) {
    return names.ja || names.jp || names.en || place.name;
  }
  // Korea cities: sel (Seoul), bus (Busan), jej (Jeju)
  if (['sel', 'bus', 'jej'].includes(activeCity)) {
    return names.ko || names.kr || names.en || place.name;
  }
  // Thailand cities: bkk, cnx, hkt, ptt, aya
  if (['bkk', 'cnx', 'hkt', 'ptt', 'aya'].includes(activeCity)) {
    return names.th || place.name || names.en;
  }

  return names[activeLang] || place.name || names.en || '';
}

/**
 * Generates Google Maps Directions URL
 */
function getNavigationUrl(destination) {
  if (!destination) return null;
  const lat = parseFloat(destination.lat);
  const lng = parseFloat(destination.lng);

  if (!isNaN(lat) && !isNaN(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  const query = destination.name || destination.address || '';
  if (query) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  }
  return null;
}

export default function TravelModeView({
  itin = {},
  nDays = 3,
  activeCity = 'bkk',
  activeLang = 'th',
  hotel = '',
  planId = 'default',
  onClose,
  findLandmarkGlobally,
  t
}) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [activeSpotIndex, setActiveSpotIndex] = useState(0);
  const [taxiModalItem, setTaxiModalItem] = useState(null);

  // Storage key for checked-in spots
  const storageKey = `tb_checked_stops_${planId || 'default'}_d${selectedDay}`;

  // Load checked stops from localStorage for the active day
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCheckedIds(new Set(parsed));
        }
      } else {
        setCheckedIds(new Set());
      }
    } catch (_) {
      setCheckedIds(new Set());
    }
  }, [storageKey, selectedDay]);

  // Current day's items
  const rawItems = itin[selectedDay] || [];
  const dayItems = useMemo(() => {
    return rawItems.map(it => {
      const full = findLandmarkGlobally ? findLandmarkGlobally(it.id, it.city_id) : null;
      return {
        ...it,
        lat: it.lat || (full && full.lat),
        lng: it.lng || (full && full.lng),
        address: it.address || (full && (full.addr || full.address)),
        cover_image: it.cover_image || (full && full.cover_image),
        names: it.names || (full && full.names) || {}
      };
    });
  }, [rawItems, findLandmarkGlobally]);

  // Automatically find the first unchecked item when day or checkedIds changes
  useEffect(() => {
    if (dayItems.length === 0) {
      setActiveSpotIndex(0);
      return;
    }
    const firstUncheckedIdx = dayItems.findIndex(it => !checkedIds.has(it.itinId || it.id));
    if (firstUncheckedIdx !== -1) {
      setActiveSpotIndex(firstUncheckedIdx);
    } else {
      setActiveSpotIndex(dayItems.length - 1);
    }
  }, [selectedDay, checkedIds, dayItems]);

  // Toggle Check-in status
  const handleToggleCheckIn = (item) => {
    const key = item.itinId || item.id;
    const nextSet = new Set(checkedIds);
    const wasChecked = nextSet.has(key);

    if (wasChecked) {
      nextSet.delete(key);
    } else {
      nextSet.add(key);
    }

    setCheckedIds(nextSet);

    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(nextSet)));
    } catch (_) {}

    // If we just checked it in, advance to the next stop if available
    if (!wasChecked && activeSpotIndex < dayItems.length - 1) {
      setActiveSpotIndex(prev => prev + 1);
    }
  };

  const currentItem = dayItems[activeSpotIndex] || null;
  const isCurrentChecked = currentItem ? checkedIds.has(currentItem.itinId || currentItem.id) : false;

  // Next item in queue
  const nextItem = activeSpotIndex + 1 < dayItems.length ? dayItems[activeSpotIndex + 1] : null;

  // Calculate distance & travel time from current to next
  let travelToNext = null;
  if (currentItem && nextItem) {
    const dist = calculateDistanceKm(currentItem, nextItem);
    if (dist !== null) {
      travelToNext = estimateTravelTimeMins(dist);
    }
  }

  const allCompleted = dayItems.length > 0 && dayItems.every(it => checkedIds.has(it.itinId || it.id));

  // Hotel navigation link
  const hotelNavUrl = hotel ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel)}` : null;

  return (
    <div className="travel-mode-overlay">
      {/* Top Header Bar */}
      <div className="travel-mode-header">
        <div className="travel-mode-brand">
          <span className="travel-mode-badge">✈️ TRAVEL MODE</span>
          <span className="travel-mode-day-title">
            {t('dayLabel')} {selectedDay} / {nDays}
          </span>
        </div>
        <button
          type="button"
          className="travel-mode-exit-btn"
          onClick={onClose}
          title={t('exitTravelMode')}
        >
          ✕ <span className="exit-text">{t('exitTravelMode')}</span>
        </button>
      </div>

      {/* Day Selector Pills */}
      <div className="travel-mode-days-bar">
        {Array.from({ length: nDays }, (_, i) => i + 1).map(d => {
          const count = (itin[d] || []).length;
          const isSelected = d === selectedDay;
          return (
            <button
              key={d}
              type="button"
              className={`travel-day-pill ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedDay(d)}
            >
              <span>{t('dayLabel')} {d}</span>
              <span className="day-count">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Focus Container */}
      <div className="travel-mode-container">
        {dayItems.length === 0 ? (
          <div className="travel-mode-empty">
            <div className="empty-icon">🗺️</div>
            <div className="empty-title">{t('noPlacesForRoute')}</div>
            <div className="empty-desc">
              {activeLang === 'th'
                ? 'ยังไม่มีสถานที่ในวันนี้ ออกจากโหมดนี้แล้วเพิ่มสถานที่เพื่อเริ่มต้นใช้งาน'
                : 'No attractions scheduled for this day yet. Exit to add places.'}
            </div>
          </div>
        ) : (
          <>
            {/* Mini Progress Stepper */}
            <div className="travel-stepper">
              {dayItems.map((it, idx) => {
                const key = it.itinId || it.id;
                const isChecked = checkedIds.has(key);
                const isActive = idx === activeSpotIndex;
                const displayName = (it.names && it.names[activeLang]) || it.name;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`stepper-node ${isChecked ? 'completed' : ''} ${isActive ? 'current' : ''}`}
                    onClick={() => setActiveSpotIndex(idx)}
                    title={displayName}
                  >
                    <span className="stepper-idx">
                      {isChecked ? '✓' : idx + 1}
                    </span>
                    <span className="stepper-name">{displayName}</span>
                  </button>
                );
              })}
            </div>

            {/* All Completed Banner */}
            {allCompleted && (
              <div className="travel-completed-banner">
                <span style={{ fontSize: '24px' }}>🎉</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t('allStopsCompleted')}</div>
                  <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                    {activeLang === 'th' ? 'พักผ่อนอย่างมีความสุข หรือนำทางกลับโรงแรมด้านล่างได้เลย' : 'Enjoy your time or navigate back to your hotel below.'}
                  </div>
                </div>
              </div>
            )}

            {/* Current Spot Focus Card */}
            {currentItem && (
              <div className={`travel-card current-spot-card ${isCurrentChecked ? 'is-checked' : ''}`}>
                <div className="card-status-strip">
                  <span className="status-label">
                    {isCurrentChecked ? '✅ ' + (activeLang === 'th' ? 'เช็กอินแล้ว' : 'Checked In') : t('currentStop')}
                  </span>
                  <span className="status-step">
                    {activeSpotIndex + 1} / {dayItems.length}
                  </span>
                </div>

                <div className="spot-main-info">
                  {currentItem.cover_image && (
                    <div className="spot-photo-wrapper">
                      <img src={currentItem.cover_image} alt={currentItem.name} className="spot-photo" />
                    </div>
                  )}

                  <div className="spot-details">
                    <div className="spot-header-row">
                      {currentItem.icon && <span className="spot-icon">{currentItem.icon}</span>}
                      <h2 className="spot-name">
                        {(currentItem.names && currentItem.names[activeLang]) || currentItem.name}
                      </h2>
                    </div>

                    {/* Local script subtitle (e.g. Japanese Kanji or Korean Hangeul) */}
                    {(() => {
                      const localName = getLocalTaxiName(currentItem, activeCity, activeLang);
                      const displayName = (currentItem.names && currentItem.names[activeLang]) || currentItem.name;
                      if (localName && localName !== displayName) {
                        return <div className="spot-local-name">{localName}</div>;
                      }
                      return null;
                    })()}

                    {currentItem.address && (
                      <div className="spot-address">
                        <span>📍</span>
                        <span>{currentItem.address}</span>
                      </div>
                    )}

                    <div className="spot-meta-tags">
                      {currentItem.cat && <span className="meta-tag cat-tag">{currentItem.cat}</span>}
                      {currentItem.dur && (
                        <span className="meta-tag dur-tag">
                          ⏱️ ~{currentItem.dur} {activeLang === 'th' ? 'นาที' : 'mins'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="travel-actions-grid">
                  {/* Google Maps Directions */}
                  {(() => {
                    const navUrl = getNavigationUrl(currentItem);
                    return (
                      <a
                        href={navUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`action-btn btn-navigate ${!navUrl ? 'disabled' : ''}`}
                      >
                        <span className="btn-icon">🚗</span>
                        <span className="btn-label">
                          {activeLang === 'th' ? 'นำทางด้วย Maps' : 'Navigate in Maps'}
                        </span>
                      </a>
                    );
                  })()}

                  {/* Taxi Card */}
                  <button
                    type="button"
                    className="action-btn btn-taxi"
                    onClick={() => setTaxiModalItem(currentItem)}
                  >
                    <span className="btn-icon">🚕</span>
                    <span className="btn-label">{t('taxiCard')}</span>
                  </button>

                  {/* Check-in Toggle Button */}
                  <button
                    type="button"
                    className={`action-btn btn-checkin ${isCurrentChecked ? 'checked' : ''}`}
                    onClick={() => handleToggleCheckIn(currentItem)}
                  >
                    <span className="btn-icon">{isCurrentChecked ? '↩️' : '✅'}</span>
                    <span className="btn-label">
                      {isCurrentChecked ? t('undoCheckIn') : t('checkInBtn')}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Next Stop Preview Card */}
            {nextItem && (
              <div className="travel-card next-spot-card" onClick={() => setActiveSpotIndex(activeSpotIndex + 1)}>
                <div className="next-spot-header">
                  <div className="next-label">
                    <span>➡️</span>
                    <span>{t('nextStop')} ({activeSpotIndex + 2}/{dayItems.length})</span>
                  </div>
                  {travelToNext && (
                    <div className="next-transit-badge">
                      <span>{travelToNext.mode === 'walk' ? '🚶' : '🚗'}</span>
                      <span>~{travelToNext.timeMins} {activeLang === 'th' ? 'นาที' : 'm'}</span>
                      <span>({travelToNext.distanceKm} km)</span>
                    </div>
                  )}
                </div>

                <div className="next-spot-body">
                  <span className="next-spot-icon">{nextItem.icon || '📍'}</span>
                  <div className="next-spot-title">
                    {(nextItem.names && nextItem.names[activeLang]) || nextItem.name}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Utilities: Return to Hotel */}
            {hotel && (
              <div className="travel-hotel-box">
                <a
                  href={hotelNavUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hotel-return-btn"
                >
                  <span style={{ fontSize: '18px' }}>🏨</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{t('returnToHotel')}</div>
                    <div style={{ fontSize: '11px', opacity: 0.85 }}>{hotel}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '16px' }}>↗</span>
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── TAXI DRIVER CARD MODAL ────────────────────────────────── */}
      {taxiModalItem && (
        <div className="taxi-modal-overlay" onClick={() => setTaxiModalItem(null)}>
          <div className="taxi-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="taxi-modal-header">
              <div>
                <div className="taxi-modal-title">{t('taxiCardTitle')}</div>
                <div className="taxi-modal-subtitle">{t('taxiCardSubtitle')}</div>
              </div>
              <button
                type="button"
                className="taxi-modal-close"
                onClick={() => setTaxiModalItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="taxi-card-content">
              {/* Giant Native Place Name */}
              <div className="taxi-giant-name">
                {getLocalTaxiName(taxiModalItem, activeCity, activeLang)}
              </div>

              {/* Sub-name in English / active language */}
              <div className="taxi-sub-name">
                {(taxiModalItem.names && taxiModalItem.names[activeLang]) || taxiModalItem.name}
              </div>

              {/* Address in Local / Global */}
              {taxiModalItem.address && (
                <div className="taxi-address-box">
                  <div className="taxi-address-label">📍 {activeLang === 'th' ? 'ที่อยู่ / พิกัด' : 'Address'}:</div>
                  <div className="taxi-address-text">{taxiModalItem.address}</div>
                </div>
              )}

              {/* Quick Taxi Map Button */}
              {(() => {
                const navUrl = getNavigationUrl(taxiModalItem);
                return (
                  <a
                    href={navUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="taxi-open-maps-btn"
                  >
                    <span>🚗</span>
                    <span>{activeLang === 'th' ? 'เปิดแผนที่เพื่อดูเส้นทาง' : 'Open in Google Maps'}</span>
                  </a>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS Styles for Travel Mode */}
      <style jsx>{`
        .travel-mode-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #0f172a;
          color: #f8fafc;
          z-index: 15000;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .travel-mode-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .travel-mode-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .travel-mode-badge {
          background: #38bdf8;
          color: #0f172a;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }

        .travel-mode-day-title {
          font-weight: 700;
          font-size: 15px;
          color: #e2e8f0;
        }

        .travel-mode-exit-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #334155;
          color: #f1f5f9;
          border: 1px solid #475569;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .travel-mode-exit-btn:hover {
          background: #475569;
        }

        .travel-mode-days-bar {
          display: flex;
          gap: 8px;
          padding: 10px 16px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          overflow-x: auto;
          white-space: nowrap;
        }

        .travel-day-pill {
          background: #0f172a;
          color: #94a3b8;
          border: 1px solid #334155;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .travel-day-pill.active {
          background: #38bdf8;
          color: #0f172a;
          border-color: #38bdf8;
        }

        .travel-mode-container {
          flex: 1;
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .travel-stepper {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .stepper-node {
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid #334155;
          padding: 6px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          cursor: pointer;
          flex-shrink: 0;
          max-width: 140px;
        }

        .stepper-node.current {
          background: #0284c7;
          color: #ffffff;
          border-color: #38bdf8;
          font-weight: bold;
        }

        .stepper-node.completed {
          background: #064e3b;
          color: #6ee7b7;
          border-color: #059669;
        }

        .stepper-idx {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          flex-shrink: 0;
        }

        .stepper-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .travel-card {
          background: #1e293b;
          border-radius: 16px;
          border: 1px solid #334155;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .current-spot-card {
          border: 2px solid #38bdf8;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        }

        .current-spot-card.is-checked {
          border-color: #10b981;
          background: linear-gradient(180deg, #064e3b 0%, #0f172a 100%);
        }

        .card-status-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 12px;
        }

        .status-label {
          font-weight: 700;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .current-spot-card.is-checked .status-label {
          color: #34d399;
        }

        .status-step {
          background: #334155;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          color: #94a3b8;
        }

        .spot-photo-wrapper {
          width: 100%;
          height: 160px;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 14px;
        }

        .spot-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .spot-header-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .spot-icon {
          font-size: 24px;
        }

        .spot-name {
          font-size: 20px;
          font-weight: 800;
          color: #f8fafc;
          margin: 0;
          line-height: 1.3;
        }

        .spot-local-name {
          font-size: 15px;
          font-weight: 600;
          color: #38bdf8;
          margin-bottom: 6px;
        }

        .spot-address {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 10px;
          line-height: 1.4;
        }

        .spot-meta-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .meta-tag {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
          background: #334155;
          color: #e2e8f0;
        }

        .travel-actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.1s ease, filter 0.15s ease;
          border: none;
        }

        .action-btn:active {
          transform: scale(0.98);
        }

        .btn-navigate {
          background: #0284c7;
          color: #ffffff;
          grid-column: span 2;
          font-size: 14px;
          padding: 14px;
        }

        .btn-taxi {
          background: #f59e0b;
          color: #0f172a;
        }

        .btn-checkin {
          background: #10b981;
          color: #ffffff;
        }

        .btn-checkin.checked {
          background: #475569;
          color: #cbd5e1;
        }

        .next-spot-card {
          cursor: pointer;
          background: #1e293b;
          border: 1px dashed #475569;
          transition: background 0.15s ease;
        }

        .next-spot-card:hover {
          background: #334155;
        }

        .next-spot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .next-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #94a3b8;
        }

        .next-transit-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #0f172a;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 11px;
          color: #38bdf8;
          font-weight: 600;
        }

        .next-spot-body {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .next-spot-icon {
          font-size: 18px;
        }

        .next-spot-title {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .travel-hotel-box {
          margin-top: 8px;
        }

        .hotel-return-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1e293b;
          border: 1px solid #334155;
          padding: 12px 16px;
          border-radius: 12px;
          color: #e2e8f0;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .hotel-return-btn:hover {
          background: #334155;
        }

        .travel-completed-banner {
          background: #064e3b;
          border: 1px solid #10b981;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #ecfdf5;
        }

        /* ─── TAXI MODAL STYLES ─── */
        .taxi-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .taxi-modal-card {
          background: #ffffff;
          color: #0f172a;
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        .taxi-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px dashed #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 20px;
          text-align: left;
        }

        .taxi-modal-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .taxi-modal-subtitle {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .taxi-modal-close {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          color: #475569;
        }

        .taxi-giant-name {
          font-size: 32px;
          font-weight: 900;
          line-height: 1.25;
          color: #000000;
          margin: 16px 0 10px;
          word-break: break-word;
        }

        .taxi-sub-name {
          font-size: 16px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 20px;
        }

        .taxi-address-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 20px;
          text-align: left;
        }

        .taxi-address-label {
          font-size: 11px;
          font-weight: bold;
          color: #64748b;
          margin-bottom: 4px;
        }

        .taxi-address-text {
          font-size: 14px;
          color: #1e293b;
          line-height: 1.4;
          font-weight: 600;
        }

        .taxi-open-maps-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #0284c7;
          color: #ffffff;
          padding: 12px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
        }

        /* ─── Landscape Optimization (Phones & Small Screens) ─── */
        @media (orientation: landscape) and (max-height: 600px) {
          .travel-mode-header {
            padding: 4px 12px;
          }
          .travel-mode-days-bar {
            padding: 4px 12px;
          }
          .travel-mode-container {
            max-width: 900px;
            padding: 8px 14px;
            gap: 8px;
          }
          .travel-stepper {
            padding-bottom: 2px;
          }
          .current-spot-card {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            grid-template-areas:
              "status status"
              "info actions";
            gap: 10px;
            padding: 10px 14px;
          }
          .card-status-strip {
            grid-area: status;
            margin-bottom: 2px;
          }
          .spot-main-info {
            grid-area: info;
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }
          .spot-photo-wrapper {
            width: 90px;
            height: 90px;
            min-width: 90px;
            margin-bottom: 0;
            border-radius: 8px;
          }
          .spot-name {
            font-size: 16px;
            line-height: 1.2;
          }
          .spot-local-name {
            font-size: 13px;
          }
          .spot-address {
            font-size: 11px;
            margin-top: 2px;
          }
          .spot-meta-tags {
            margin-top: 4px;
          }
          .travel-actions-grid {
            grid-area: actions;
            display: flex;
            flex-direction: column;
            gap: 6px;
            justify-content: center;
          }
          .action-btn {
            padding: 8px 10px;
            font-size: 12px;
            border-radius: 8px;
          }
          .btn-navigate {
            padding: 8px 10px;
            font-size: 12px;
          }
          .next-spot-card {
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
}
