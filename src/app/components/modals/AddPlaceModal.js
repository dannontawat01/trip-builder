'use client';

import React from 'react';
import {
  COUNTRIES,
  getCityName,
  translateCategory
} from '@/app/constants/translations';

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
  fillFromMaps,
  toast,
  customPlaces,
  setCustomPlaces,
  googleSheets,
  user,
  setAuthLoading,
  setLandmarks,
  saveNewPlace
}) {
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
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{t('gmapsHow')}<br />1. {t('gmaps1')}<br />2. {t('gmaps2')}<br />3. {t('gmaps3')}</div>
              <div className="input-row">
                <input
                  className="form-input"
                  placeholder="https://maps.app.goo.gl/..."
                  value={gmapsUrl}
                  onChange={(e) => setGmapsUrl(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={parseGmaps}>{t('gmapsPullBtn')}</button>
              </div>
              {gmapsResult && (
                <div style={{ marginTop: '10px' }}>
                  {gmapsResult.error ? (
                    <div style={{ fontSize: '11px', color: 'var(--red)', background: 'var(--red-l)', padding: '6px', borderRadius: '6px' }}>ไม่พบพิกัดในลิงก์นี้ กรุณาใช้ลิงก์แบบยาว (Full link)</div>
                  ) : (
                    <div className="info-box">
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{gmapsResult.name || 'สถานที่ดึงจาก Maps'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>GPS: {gmapsResult.lat.toFixed(5)}, {gmapsResult.lng.toFixed(5)}</div>
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '6px' }} onClick={() => fillFromMaps(gmapsResult.name, gmapsResult.lat, gmapsResult.lng, gmapsResult.address, gmapsResult.category, gmapsResult.icon, gmapsResult.gmaps_url, gmapsResult.rating, gmapsResult.photos)}>กรอกในฟอร์ม →</button>
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
                        cover_image: null,
                        names: {},
                        descriptions: {},
                        city_id: targetCity,
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
