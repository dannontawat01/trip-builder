'use client';

import React from 'react';
import {
  COUNTRIES,
  getCityName,
  translateCategory
} from '@/app/constants/translations';
import { detectCityFromCoords, checkIsDuplicate } from '@/lib/cityDetector';

const hasImportedPhoto = (item) => Boolean(item.cover_image || (item.photos && item.photos[0]));

export default function AddPlaceModal({
  addModalOpen,
  setAddModalOpen,
  t,
  activeLang,
  activeAddTab,
  setActiveAddTab,
  osmQuery,
  setOsmQuery,
  osmResults,
  searchOSM,
  fillFromOSM,
  fName,
  setFName,
  fDesc,
  setFDesc,
  fCat,
  setFCat,
  fDur,
  setFDur,
  fAddr,
  setFAddr,
  fLat,
  setFLat,
  fLng,
  setFLng,
  fFee,
  setFFee,
  fTransport,
  setFTransport,
  fIcon,
  setFIcon,
  fRating,
  setFRating,
  fCity,
  setFCity,
  activeCity,
  aiSuggestQuery,
  setAiSuggestQuery,
  handleAISuggest,
  aiSuggestLoading,
  aiSuggestResult,
  addAIPlace,
  gmapsUrl,
  setGmapsUrl,
  parseGmaps,
  gmapsResult,
  gmapsLoading,
  fillFromMaps,
  toast,
  customPlaces,
  setCustomPlaces,
  googleSheets,
  user,
  setAuthLoading,
  setLandmarks,
  saveNewPlace,
  allExistingPlaces = [],
  gmapsSyncUrl = '',
  setGmapsSyncUrl = () => {}
}) {
  const [selectedListIndices, setSelectedListIndices] = React.useState([]);
  const [activeCityFilter, setActiveCityFilter] = React.useState('all');
  const [hideDuplicates, setHideDuplicates] = React.useState(false);
  const [otherTargetCity, setOtherTargetCity] = React.useState(activeCity);
  const [linkGmapsToTrip, setLinkGmapsToTrip] = React.useState(true);
  const [bulkImporting, setBulkImporting] = React.useState(false);

  // Helper map for fast city lookups
  const cityInfoMap = React.useMemo(() => {
    const map = {};
    COUNTRIES.forEach(co => {
      co.cities.forEach(ci => {
        map[ci.id] = ci;
      });
    });
    return map;
  }, []);

  // Process places with detected city and duplicate status
  const processedPlaces = React.useMemo(() => {
    if (!gmapsResult?.isList || !Array.isArray(gmapsResult.places)) return [];
    return gmapsResult.places.map((place, originalIndex) => {
      const detectedCity = detectCityFromCoords(place.lat, place.lng);
      const dupCheck = checkIsDuplicate(place, allExistingPlaces);
      return {
        ...place,
        originalIndex,
        detectedCity,
        isDuplicate: dupCheck.isDuplicate,
        matchedPlace: dupCheck.matchedPlace,
        matchReason: dupCheck.matchReason
      };
    });
  }, [gmapsResult, allExistingPlaces]);

  // When processedPlaces change, select only non-duplicates by default
  React.useEffect(() => {
    if (processedPlaces.length > 0) {
      const nonDupIndices = processedPlaces
        .filter(p => !p.isDuplicate)
        .map(p => p.originalIndex);
      setSelectedListIndices(nonDupIndices);
      setActiveCityFilter('all');
      setHideDuplicates(false);
      setLinkGmapsToTrip(true);
    } else {
      setSelectedListIndices([]);
    }
  }, [processedPlaces, gmapsSyncUrl]);

  React.useEffect(() => {
    if (activeAddTab === 'gmaps' && !gmapsUrl && gmapsSyncUrl) {
      setGmapsUrl(gmapsSyncUrl);
    }
  }, [activeAddTab, gmapsSyncUrl]);

  React.useEffect(() => {
    if (activeCity) {
      setOtherTargetCity(activeCity);
    }
  }, [activeCity]);

  // Statistics summary
  const stats = React.useMemo(() => {
    const total = processedPlaces.length;
    const dupCount = processedPlaces.filter(p => p.isDuplicate).length;
    const newCount = total - dupCount;

    const cityCounts = {};
    processedPlaces.forEach(p => {
      cityCounts[p.detectedCity] = (cityCounts[p.detectedCity] || 0) + 1;
    });

    return { total, dupCount, newCount, cityCounts };
  }, [processedPlaces]);

  // Filtered places to display based on active city filter tab and hideDuplicates toggle
  const displayPlaces = React.useMemo(() => {
    return processedPlaces.filter(p => {
      if (activeCityFilter !== 'all' && p.detectedCity !== activeCityFilter) return false;
      if (hideDuplicates && p.isDuplicate) return false;
      return true;
    });
  }, [processedPlaces, activeCityFilter, hideDuplicates]);

  const handleBulkImportFromMaps = async () => {
    if (!processedPlaces || selectedListIndices.length === 0) return;

    const placesToImport = processedPlaces.filter(p => selectedListIndices.includes(p.originalIndex));
    if (placesToImport.length === 0) return;

    setBulkImporting(true);
    try {
      // Group places by their final target city
      const grouped = {};
      const landmarksToInsert = [];
      const placesObjList = [];

      for (let i = 0; i < placesToImport.length; i++) {
        const item = placesToImport[i];
        if (!item.name) continue;

        const targetCity = item.detectedCity === 'other'
          ? (otherTargetCity || activeCity)
          : item.detectedCity;

        if (!grouped[targetCity]) grouped[targetCity] = [];

        const localId = `lm_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`;
        const placeObj = {
          id: localId,
          name: item.name,
          cat: item.category || 'อื่นๆ',
          dur: 90,
          icon: item.icon || '📍',
          desc: item.note || item.address || '',
          addr: item.address || '',
          lat: item.lat ? parseFloat(item.lat) : null,
          lng: item.lng ? parseFloat(item.lng) : null,
          fee: '',
          transport: [],
          cover_image: item.cover_image || (item.photos && item.photos[0]) || null,
          photos: item.photos || (item.cover_image ? [item.cover_image] : []),
          names: {},
          descriptions: {},
          city_id: targetCity,
          google_place_id: item.google_place_id || null,
          _needsPhoto: !hasImportedPhoto(item),
          _custom: true
        };

        grouped[targetCity].push(placeObj);
        placesObjList.push(placeObj);

        landmarksToInsert.push({
          id: String(localId),
          name: placeObj.name,
          cat: placeObj.cat,
          icon: placeObj.icon,
          city_id: placeObj.city_id,
          address: placeObj.addr,
          lat: placeObj.lat,
          lng: placeObj.lng,
          description: placeObj.desc,
          duration_min: placeObj.dur,
          fee: placeObj.fee,
          transport: placeObj.transport,
          status: 'user_custom'
        });
      }

      // Sync with Google Sheets
      if (googleSheets && user && landmarksToInsert.length > 0) {
        try {
          await googleSheets.bulkInsertLandmarks(user.email, landmarksToInsert);
        } catch (err) {
          console.warn('Failed to save to Google Sheets:', err);
        }
      }

      // Update customPlaces state across all target cities
      let updatedCustom = { ...customPlaces };
      Object.entries(grouped).forEach(([cId, list]) => {
        const existing = updatedCustom[cId] || [];
        updatedCustom[cId] = [...existing, ...list];
      });

      setCustomPlaces(updatedCustom);
      localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: updatedCustom }));

      // If linking Google Maps to trip
      if (linkGmapsToTrip && gmapsUrl.trim()) {
        setGmapsSyncUrl(gmapsUrl.trim());
        localStorage.setItem('trip_builder_gmaps_sync_url', gmapsUrl.trim());
      }

      // Refresh landmarks if current active city got new items
      if (grouped[activeCity] && Array.isArray(grouped[activeCity])) {
        setLandmarks(prev => {
          const sheetIds = new Set(placesObjList.map(d => String(d.id)));
          const filteredPrev = prev.filter(p => !sheetIds.has(String(p.id)));
          return [...filteredPrev, ...grouped[activeCity].map(item => ({
            ...item,
            dur: item.dur || 90,
            icon: item.icon || '📍',
            _custom: true
          }))];
        });
      }

      const citySummary = Object.entries(grouped)
        .map(([cId, list]) => `${cityInfoMap[cId] ? cityInfoMap[cId].emoji : '📍'} ${list.length}`)
        .join(', ');

      toast(activeLang === 'th'
        ? `นำเข้าสำเร็จ ${placesToImport.length} สถานที่! (${citySummary})`
        : `Successfully imported ${placesToImport.length} places! (${citySummary})`);

      setAddModalOpen(false);
    } catch (err) {
      toast(activeLang === 'th' ? 'เกิดข้อผิดพลาด: ' + err.message : 'Error importing places: ' + err.message);
    } finally {
      setBulkImporting(false);
    }
  };
  if (!addModalOpen) return null;

  return (
    <div className="overlay show" onClick={() => setAddModalOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{t('addNew')}</div>
          <button className="modal-close" onClick={() => setAddModalOpen(false)}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="tab-row">
            <button className={`tab-btn ${activeAddTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveAddTab('manual')}>{t('tabManual')}</button>
            <button className={`tab-btn ${activeAddTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveAddTab('ai')}>{t('tabAI')}</button>
            <button className={`tab-btn ${activeAddTab === 'gmaps' ? 'active' : ''}`} onClick={() => setActiveAddTab('gmaps')}>{t('tabGmaps')}</button>
            <button className={`tab-btn ${activeAddTab === 'json' ? 'active' : ''}`} onClick={() => setActiveAddTab('json')}>{t('tabJson')}</button>
          </div>

          {/* MANUAL TAB */}
          {activeAddTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group">
                <div className="form-label">{t('osmSearch')}</div>
                <div className="input-row">
                  <input
                    className="form-input"
                    placeholder={t('osmPh')}
                    value={osmQuery}
                    onChange={(e) => setOsmQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchOSM()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={searchOSM}>{t('osmBtn')}</button>
                </div>
                
                {osmResults.length > 0 && (
                  <div style={{ marginTop: '6px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px' }}>
                    {osmResults[0].loading ? (
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>{activeLang === 'th' ? 'กำลังค้นหา...' : 'Searching...'}</div>
                    ) : osmResults[0].empty ? (
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>{activeLang === 'th' ? 'ไม่พบผลลัพธ์' : 'No results found'}</div>
                    ) : osmResults[0].error ? (
                      <div style={{ fontSize: '11px', color: 'var(--red)', textAlign: 'center' }}>{activeLang === 'th' ? 'เกิดข้อผิดพลาด' : 'An error occurred'}</div>
                    ) : (
                      osmResults.map((res, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>{res.display_name}</div>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => fillFromOSM(res)}>{activeLang === 'th' ? 'ใช้' : 'Use'}</button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <div className="form-label">{t('fName')}</div>
                <input className="form-input" value={fName} onChange={(e) => setFName(e.target.value)} />
              </div>
              <div className="form-group">
                <div className="form-label">{t('fDesc')}</div>
                <textarea className="form-input" value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <div className="form-label">{t('fCat')}</div>
                  <select className="form-input" value={fCat} onChange={(e) => setFCat(e.target.value)}>
                    <option value="วัด">{activeLang === 'th' ? 'วัด' : 'Temple'}</option>
                    <option value="พระราชวัง">{activeLang === 'th' ? 'พระราชวัง' : 'Palace'}</option>
                    <option value="ตลาด">{activeLang === 'th' ? 'ตลาด' : 'Market'}</option>
                    <option value="ย่าน">{activeLang === 'th' ? 'ย่าน' : 'District'}</option>
                    <option value="พิพิธภัณฑ์">{activeLang === 'th' ? 'พิพิธภัณฑ์' : 'Museum'}</option>
                    <option value="ธรรมชาติ">{activeLang === 'th' ? 'ธรรมชาติ' : 'Nature'}</option>
                    <option value="ช้อปปิ้ง">{activeLang === 'th' ? 'ช้อปปิ้ง' : 'Shopping'}</option>
                    <option value="ห้างสรรพสินค้า">{activeLang === 'th' ? 'ห้างสรรพสินค้า' : 'Department Store'}</option>
                    <option value="ร้านอาหาร">{activeLang === 'th' ? 'ร้านอาหาร' : 'Restaurant'}</option>
                    <option value="คาเฟ่">{activeLang === 'th' ? 'คาเฟ่' : 'Café'}</option>
                    <option value="โรงแรม / ที่พัก">{activeLang === 'th' ? 'โรงแรม / ที่พัก' : 'Hotel / Base'}</option>
                    <option value="วิวทิวทัศน์">{activeLang === 'th' ? 'วิวทิวทัศน์' : 'Scenic View'}</option>
                    <option value="อื่นๆ">{activeLang === 'th' ? 'อื่นๆ' : 'Others'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <div className="form-label">{t('fDur')}</div>
                  <input className="form-input" type="number" value={fDur} onChange={(e) => setFDur(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">{t('fAddr')}</div>
                <input className="form-input" value={fAddr} onChange={(e) => setFAddr(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <div className="form-label">Latitude</div>
                  <input className="form-input" type="number" step="any" value={fLat} onChange={(e) => setFLat(e.target.value)} />
                </div>
                <div className="form-group">
                  <div className="form-label">Longitude</div>
                  <input className="form-input" type="number" step="any" value={fLng} onChange={(e) => setFLng(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <div className="form-label">{t('fFee')}</div>
                <input className="form-input" value={fFee} onChange={(e) => setFFee(e.target.value)} />
              </div>
              <div className="form-group">
                <div className="form-label">{t('fTransport')}</div>
                <input className="form-input" value={fTransport} onChange={(e) => setFTransport(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <div className="form-label">{t('fIcon')}</div>
                  <input className="form-input" value={fIcon} onChange={(e) => setFIcon(e.target.value)} maxLength={2} />
                </div>
                <div className="form-group">
                  <div className="form-label">{activeLang === 'th' ? 'คะแนนรีวิว (0 - 5)' : 'Rating (0 - 5)'}</div>
                  <input className="form-input" type="number" min="0" max="5" step="0.1" value={fRating} onChange={(e) => setFRating(e.target.value)} placeholder="เช่น 4.5" />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '10px' }}>
                <div className="form-label">{t('fCity')}</div>
                <select className="form-input" value={fCity} onChange={(e) => setFCity(e.target.value)}>
                  {COUNTRIES.flatMap(co => co.cities).map(ci => (
                    <option key={ci.id} value={ci.id}>{ci.emoji} {getCityName(ci, activeLang)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* AI TAB */}
          {activeAddTab === 'ai' && (
            <div className="ai-box">
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>พิมพ์หาสถานที่ท่องเที่ยวที่ต้องการให้ AI แนะนำพิกัดให้ เช่น &quot;คาเฟ่วิวแม่น้ำเจ้าพระยา&quot;</div>
              <div className="input-row">
                <input
                  className="form-input"
                  placeholder="เช่น วัดสวยๆ ถ่ายรูปสวยในกรุงเทพ..."
                  value={aiSuggestQuery}
                  onChange={(e) => setAiSuggestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISuggest()}
                />
                <button className="btn btn-primary btn-sm" disabled={aiSuggestLoading} onClick={handleAISuggest}>
                  {aiSuggestLoading ? '...' : 'ค้นหา'}
                </button>
              </div>
              
              {aiSuggestResult && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {aiSuggestResult.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>ไม่พบผลลัพธ์</div>
                  ) : (
                    aiSuggestResult.map((place, idx) => (
                      <div key={idx} className="ai-place-row">
                        <div>
                          <div className="ai-place-name">{place.icon} {place.name}</div>
                          <div className="ai-place-sub">{translateCategory(place.cat, activeLang)} · {place.dur}{activeLang === 'th' ? 'น.' : 'm'}</div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => addAIPlace(place)}>+ เพิ่ม</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* GOOGLE MAPS TAB */}
          {activeAddTab === 'gmaps' && (
            <div className="gmaps-box">
              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '8px' }}>
                <strong>{t('gmapsHow')}</strong><br />
                1. {t('gmaps1')}<br />
                2. {t('gmaps2')}<br />
                3. {t('gmaps3')}
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '11px',
                color: 'var(--text)',
                marginBottom: '10px',
                lineHeight: '1.4'
              }}>
                {t('gmapsSavedListHint')}
              </div>

              {/* Currently Linked Google Maps URL Banner */}
              {gmapsSyncUrl && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🔗</span>
                      <span>{activeLang === 'th' ? 'ลิงก์ Google Maps ที่ผูกไว้กับทริปนี้' : 'Linked Google Maps URL'}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={gmapsSyncUrl}>
                      {gmapsSyncUrl}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setGmapsUrl(gmapsSyncUrl)}
                      style={{ fontSize: '10px', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', height: '22px' }}
                      title={activeLang === 'th' ? 'นำลิงก์ที่ผูกไว้มาใส่ในช่อง' : 'Use this URL in textarea'}
                    >
                      📋 {activeLang === 'th' ? 'ใส่ในช่อง' : 'Insert'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setGmapsSyncUrl('');
                        try { localStorage.removeItem('trip_builder_gmaps_sync_url'); } catch (_) {}
                        toast(activeLang === 'th' ? 'ยกเลิกการผูกลิงก์ Google Maps แล้ว' : 'Unlinked Google Maps URL');
                      }}
                      style={{ fontSize: '10px', color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.3)', height: '22px' }}
                      title={activeLang === 'th' ? 'ยกเลิกการผูกลิงก์นี้กับทริป' : 'Unlink from trip'}
                    >
                      ✕ {activeLang === 'th' ? 'ยกเลิกผูก' : 'Unlink'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={activeLang === 'th' 
                    ? 'วางลิงก์ Google Maps เช่น https://maps.app.goo.gl/... (รองรับลิงก์เดี่ยว, ลิงก์ Saved list, หรือวางหลายๆ ลิงก์แยกบรรทัด)' 
                    : 'Paste Google Maps link e.g. https://maps.app.goo.gl/... (Supports single place, Saved lists, or multiple links separated by line)'}
                  value={gmapsUrl}
                  onChange={(e) => setGmapsUrl(e.target.value)}
                  style={{ fontSize: '12px', resize: 'vertical' }}
                />
                <button
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', minWidth: '120px' }}
                  onClick={parseGmaps}
                  disabled={gmapsLoading || !gmapsUrl.trim()}
                >
                  {gmapsLoading 
                    ? (activeLang === 'th' ? '⏳ กำลังดึงข้อมูล...' : '⏳ Extracting...') 
                    : (activeLang === 'th' ? '🔍 ดึงข้อมูล' : '🔍 Extract')}
                </button>
              </div>

              {gmapsLoading && (
                <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--muted)' }}>
                  ⏳ {activeLang === 'th' ? 'ระบบกำลังวิเคราะห์ลิงก์และดึงข้อมูลสถานที่จาก Google Maps กรุณารอสักครู่...' : 'Resolving places from Google Maps, please wait...'}
                </div>
              )}

              {!gmapsLoading && gmapsResult && (
                <div style={{ marginTop: '12px' }}>
                  {gmapsResult.error ? (
                    <div style={{ fontSize: '11px', color: 'var(--red)', background: 'var(--red-l)', padding: '8px 10px', borderRadius: '6px' }}>
                      ⚠️ {activeLang === 'th' ? (gmapsResult.message || 'ไม่สามารถดึงข้อมูลพิกัดจากลิงก์นี้ได้ กรุณาตรวจสอบลิงก์หรือใช้ลิงก์ที่แชร์จาก Google Maps') : 'Could not resolve places from this link. Please check the URL.'}
                    </div>
                  ) : gmapsResult.isList ? (
                    <div className="info-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Header and Stats */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{gmapsResult.listIcon}</span>
                          <span>{gmapsResult.listTitle}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', background: 'var(--primary-l)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                            ✨ {activeLang === 'th' ? `ใหม่ ${stats.newCount}` : `${stats.newCount} new`}
                          </span>
                          {stats.dupCount > 0 && (
                            <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                              ⚠️ {activeLang === 'th' ? `มีแล้ว ${stats.dupCount}` : `${stats.dupCount} existing`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* City Filter Tabs */}
                      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${activeCityFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                          onClick={() => setActiveCityFilter('all')}
                        >
                          {t('gmapsCityGroupAll')} ({stats.total})
                        </button>
                        {Object.entries(stats.cityCounts).map(([cId, count]) => {
                          if (cId === 'other') {
                            return (
                              <button
                                key="other"
                                type="button"
                                className={`btn btn-sm ${activeCityFilter === 'other' ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                                onClick={() => setActiveCityFilter('other')}
                              >
                                {t('gmapsCityGroupOther')} ({count})
                              </button>
                            );
                          }
                          const cInfo = cityInfoMap[cId];
                          return (
                            <button
                              key={cId}
                              type="button"
                              className={`btn btn-sm ${activeCityFilter === cId ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                              onClick={() => setActiveCityFilter(cId)}
                            >
                              {cInfo?.emoji || '📍'} {cInfo ? getCityName(cInfo, activeLang) : cId} ({count})
                            </button>
                          );
                        })}
                      </div>

                      {/* If viewing "other" or when "other" places exist, show target city selector for other */}
                      {(activeCityFilter === 'other' || (stats.cityCounts.other > 0 && activeCityFilter === 'all')) && (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '11px'
                        }}>
                          <div style={{ fontWeight: '500', marginBottom: '4px', color: '#b45309' }}>
                            {t('gmapsChooseCityForOther')}
                          </div>
                          <select
                            className="form-input"
                            value={otherTargetCity}
                            onChange={(e) => setOtherTargetCity(e.target.value)}
                            style={{ fontSize: '11px', padding: '3px 6px' }}
                          >
                            {COUNTRIES.flatMap(co => co.cities).map(ci => (
                              <option key={ci.id} value={ci.id}>
                                {ci.emoji} {getCityName(ci, activeLang)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Selection Toolbar and Duplicate Toggle */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderBottom: '1px solid var(--border)', paddingBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={displayPlaces.length > 0 && displayPlaces.every(p => selectedListIndices.includes(p.originalIndex))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const indicesToAdd = displayPlaces.map(p => p.originalIndex);
                                setSelectedListIndices(prev => Array.from(new Set([...prev, ...indicesToAdd])));
                              } else {
                                const indicesToRemove = new Set(displayPlaces.map(p => p.originalIndex));
                                setSelectedListIndices(prev => prev.filter(i => !indicesToRemove.has(i)));
                              }
                            }}
                          />
                          {t('gmapsSelectAll')} ({selectedListIndices.length}/{stats.total})
                        </label>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {stats.dupCount > 0 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '10px', padding: '2px 6px', color: hideDuplicates ? 'var(--primary)' : 'var(--muted)' }}
                              onClick={() => setHideDuplicates(!hideDuplicates)}
                            >
                              {hideDuplicates ? t('gmapsShowAll') : t('gmapsHideDuplicates')}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '10px', padding: '2px 6px' }}
                            onClick={() => setSelectedListIndices(processedPlaces.filter(p => !p.isDuplicate).map(p => p.originalIndex))}
                          >
                            {activeLang === 'th' ? 'เลือกเฉพาะที่ใหม่' : 'Select New Only'}
                          </button>
                        </div>
                      </div>

                      {/* Places Scrollable List */}
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px' }}>
                        {displayPlaces.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '12px', fontSize: '11px', color: 'var(--muted)' }}>
                            {activeLang === 'th' ? 'ไม่พบสถานที่ในตัวกรองนี้' : 'No places in this filter'}
                          </div>
                        ) : (
                          displayPlaces.map((p) => {
                            const isSelected = selectedListIndices.includes(p.originalIndex);
                            const cInfo = cityInfoMap[p.detectedCity];
                            return (
                              <div
                                key={p.originalIndex}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  background: isSelected 
                                    ? (p.isDuplicate ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)') 
                                    : 'transparent',
                                  borderBottom: '1px solid var(--border)',
                                  flexShrink: 0
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedListIndices(prev => [...prev, p.originalIndex]);
                                    } else {
                                      setSelectedListIndices(prev => prev.filter(i => i !== p.originalIndex));
                                    }
                                  }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {p.icon || '📍'} {p.name}
                                    </span>
                                    {p.isDuplicate ? (
                                      <span style={{ fontSize: '9px', background: 'rgba(245, 158, 11, 0.2)', color: '#b45309', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                        {t('gmapsDuplicateBadge')}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                        {t('gmapsNewBadge')}
                                      </span>
                                    )}
                                  </div>
                                  {(p.note || p.address) && (
                                    <div style={{ fontSize: '10px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {p.note ? `💬 ${p.note} · ` : ''}{p.address}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                  <span style={{ fontSize: '9px', background: 'var(--primary-l)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                    {p.detectedCity === 'other' ? '📍 นอกพื้นที่' : `${cInfo?.emoji || '📍'} ${cInfo ? getCityName(cInfo, activeLang) : p.detectedCity}`}
                                  </span>
                                  <span style={{ fontSize: '8px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                    {translateCategory(p.category || 'อื่นๆ', activeLang)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Auto-Sync Checkbox */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer', padding: '4px 0', borderTop: '1px solid var(--border)' }}>
                        <input
                          type="checkbox"
                          checked={linkGmapsToTrip}
                          onChange={(e) => setLinkGmapsToTrip(e.target.checked)}
                        />
                        <span>{t('gmapsSyncLinkTrip')}</span>
                      </label>

                      {/* Bulk Import Action Button */}
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '2px' }}
                        disabled={selectedListIndices.length === 0 || bulkImporting}
                        onClick={handleBulkImportFromMaps}
                      >
                        {bulkImporting 
                          ? (activeLang === 'th' ? '⏳ กำลังบันทึกข้อมูล...' : '⏳ Importing...') 
                          : `✨ ${t('gmapsImportDistributed').replace('{count}', selectedListIndices.length)}`}
                      </button>
                    </div>
                  ) : (
                    /* Single Place Result */
                    <div className="info-box">
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{gmapsResult.icon || '📍'} {gmapsResult.name || 'สถานที่ดึงจาก Maps'}</div>
                      {gmapsResult.address && <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{gmapsResult.address}</div>}
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>GPS: {gmapsResult.lat?.toFixed(5)}, {gmapsResult.lng?.toFixed(5)} · {translateCategory(gmapsResult.category || 'อื่นๆ', activeLang)}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => fillFromMaps(gmapsResult.name, gmapsResult.lat, gmapsResult.lng, gmapsResult.address, gmapsResult.category, gmapsResult.icon, gmapsResult.gmaps_url, gmapsResult.rating, gmapsResult.photos)}
                        >
                          กรอกในฟอร์ม →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* JSON IMPORT TAB */}
          {activeAddTab === 'json' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                {activeLang === 'th' 
                  ? 'วางข้อความ JSON ที่ได้จาก Google Maps Console Script ของคุณ เพื่อนำเข้าข้อมูลทั้งหมดทีเดียว:' 
                  : 'Paste the JSON array extracted from Google Maps Console Script to import all places at once:'}
              </div>
              
              <div className="form-group">
                <div className="form-label">{activeLang === 'th' ? 'เลือกเมืองที่ต้องการนำเข้าสถานที่ *:' : 'Select Target City *:'}</div>
                <select className="form-input" id="bulk-import-city" defaultValue={activeCity}>
                  {COUNTRIES.map(country => 
                    country.cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {country.flag} {city.emoji} {getCityName(city, activeLang)} ({city.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <textarea
                className="form-input"
                rows={6}
                placeholder='[{"name": "APA HOTEL...", "address": "...", "lat": 35.69, "lng": 139.66}, ...]'
                id="bulk-json-input"
                style={{ fontFamily: 'monospace', fontSize: '11px' }}
              />
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  const input = document.getElementById('bulk-json-input');
                  if (!input || !input.value.trim()) return;
                  try {
                    const parsed = JSON.parse(input.value.trim());
                    if (!Array.isArray(parsed)) {
                      toast(activeLang === 'th' ? 'ข้อมูลต้องอยู่ในรูปแบบ Array [ ... ]' : 'Data must be a JSON Array');
                      return;
                    }
                    
                    setAuthLoading(true);
                    let successCount = 0;
                    const targetCity = document.getElementById('bulk-import-city')?.value || activeCity;
                    const customList = [...(customPlaces[targetCity] || [])];
                    
                    const landmarksToInsert = [];
                    const placesObjList = [];
                    
                    for (let i = 0; i < parsed.length; i++) {
                      const item = parsed[i];
                      if (!item.name) continue;
                      
                      const localId = `lm_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`;
                      const placeObj = {
                        id: localId,
                        name: item.name,
                        cat: 'อื่นๆ',
                        dur: 90,
                        icon: '📍',
                        desc: item.description || item.address || '',
                        addr: item.address || '',
                        lat: item.lat ? parseFloat(item.lat) : null,
                        lng: item.lng ? parseFloat(item.lng) : null,
                        fee: '',
                        transport: [],
                        cover_image: item.cover_image || (item.photos && item.photos[0]) || null,
                        photos: item.photos || (item.cover_image ? [item.cover_image] : []),
                        names: {},
                        descriptions: {},
                        city_id: targetCity,
                        _needsPhoto: !hasImportedPhoto(item),
                        _custom: true
                      };
                      
                      placesObjList.push(placeObj);
                      
                      landmarksToInsert.push({
                        id: String(localId),
                        name: placeObj.name,
                        cat: placeObj.cat,
                        icon: placeObj.icon,
                        city_id: placeObj.city_id,
                        address: placeObj.addr,
                        lat: placeObj.lat,
                        lng: placeObj.lng,
                        description: placeObj.desc,
                        duration_min: placeObj.dur,
                        fee: placeObj.fee,
                        transport: placeObj.transport,
                        status: 'user_custom'
                      });
                    }

                    if (googleSheets && user && landmarksToInsert.length > 0) {
                      try {
                        const res = await googleSheets.bulkInsertLandmarks(user.email, landmarksToInsert);
                        if (res.success) {
                          successCount = landmarksToInsert.length;
                        }
                      } catch (err) {
                        console.warn('Failed to save to Google Sheets:', err);
                      }
                    } else {
                      successCount = landmarksToInsert.length;
                    }

                    if (successCount > 0) {
                      const finalCustomList = [...customList, ...placesObjList];
                      const updatedCustom = { ...customPlaces, [targetCity]: finalCustomList };
                      setCustomPlaces(updatedCustom);
                      localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: updatedCustom }));
                      
                      // Force refresh landmarks state if current active city matches
                      if (targetCity === activeCity) {
                        setLandmarks(prev => {
                          const sheetIds = new Set(placesObjList.map(d => String(d.id)));
                          const filteredPrev = prev.filter(p => !sheetIds.has(String(p.id)));
                          return [...filteredPrev, ...placesObjList.map(item => ({
                            ...item,
                            dur: item.dur || 90,
                            icon: item.icon || '📍',
                            _custom: true
                          }))];
                        });
                      }
                    }
                    
                    toast(activeLang === 'th' ? `นำเข้าสำเร็จ ${successCount} รายการ! กรุณารอสักครู่ขณะระบบดึงข้อมูลใหม่...` : `Imported ${successCount} places! Refreshing...`);
                    setAddModalOpen(false);
                    
                    if (googleSheets && user) {
                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    }
                  } catch (e) {
                    toast(activeLang === 'th' ? 'JSON ไม่ถูกต้อง: ' + e.message : 'Invalid JSON: ' + e.message);
                  } finally {
                    setAuthLoading(false);
                  }
                }}
              >
                {activeLang === 'th' ? 'นำเข้าสถานที่ทั้งหมด' : 'Import All Places'}
              </button>
            </div>
          )}
        </div>
        
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setAddModalOpen(false)}>{t('cancel')}</button>
          {activeAddTab === 'manual' && <button className="btn btn-primary" onClick={saveNewPlace}>{t('save')}</button>}
        </div>
      </div>
    </div>
  );
}
