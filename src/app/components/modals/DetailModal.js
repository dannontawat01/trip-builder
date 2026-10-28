'use client';

import React from 'react';
import OptimizedImage from '@/app/components/OptimizedImage';
import useDialogFocus from './useDialogFocus';
import {
  DAY_COLORS,
  CITY_KEYWORDS,
  CITY_COVER_IMAGES,
  CATEGORY_COVER_IMAGES,
  getSmartCategoryCover,
  getBrandPlacePhotos,
  translateCategory,
  getCityName
} from '@/app/constants/translations';

export default function DetailModal({
  selectedPlace,
  setSelectedPlace,
  isEditing,
  setIsEditing,
  activeLang,
  activeCity,
  getCityObj,
  t,
  editName,
  setEditName,
  editDesc,
  setEditDesc,
  editCat,
  setEditCat,
  editDur,
  setEditDur,
  editAddr,
  setEditAddr,
  editLat,
  setEditLat,
  editLng,
  setEditLng,
  editFee,
  setEditFee,
  editTransport,
  setEditTransport,
  editIcon,
  setEditIcon,
  editKeywords,
  setEditKeywords,
  searchingPhotos,
  searchedPhotos,
  editSelectedImage,
  setEditSelectedImage,
  getCoverImage,
  getCityFallbackImage,
  toast,
  nDays,
  itin,
  addToDay,
  handleSaveEdit,
  handleStartEditing
}) {
  const dialogRef = useDialogFocus(Boolean(selectedPlace), () => { setSelectedPlace(null); setIsEditing(false); });
  if (!selectedPlace) return null;

  return (
    <div className="overlay show" onClick={() => { setSelectedPlace(null); setIsEditing(false); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="place-detail-title" tabIndex={-1} className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div id="place-detail-title" className="modal-title">
              {isEditing ? (activeLang === 'th' ? '✏️ แก้ไขข้อมูลสถานที่' : '✏️ Edit Place Info') : `${selectedPlace.icon} ${(selectedPlace.names && selectedPlace.names[activeLang]) || selectedPlace.name}`}
            </div>
            {!isEditing && (
              <div className="chip-row">
                <span className="chip">{getCityObj(selectedPlace.city_id || activeCity)?.emoji} {getCityName(getCityObj(selectedPlace.city_id || activeCity), activeLang)}</span>
                <span className="chip">{translateCategory(selectedPlace.cat, activeLang)}</span>
                <span className="chip">⏱ {selectedPlace.dur}m</span>
              </div>
            )}
          </div>
          <button className="modal-close" aria-label={t('close')} onClick={() => { setSelectedPlace(null); setIsEditing(false); }}>✕</button>
        </div>
        
        <div className="modal-body">
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-place-name">{t('fName')}</label>
                <input id="edit-place-name" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-place-description">{t('fDesc')}</label>
                <textarea id="edit-place-description" className="form-input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-place-category">{t('fCat')}</label>
                  <select id="edit-place-category" className="form-input" value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                    <option value="วัด">{activeLang === 'th' ? 'วัด' : 'Temple'}</option>
                    <option value="พระราชวัง">{activeLang === 'th' ? 'พระราชวัง' : 'Palace'}</option>
                    <option value="ตลาด">{activeLang === 'th' ? 'ตลาด' : 'Market'}</option>
                    <option value="ย่าน">{activeLang === 'th' ? 'ย่าน' : 'District'}</option>
                    <option value="พิพิธภัณฑ์">{activeLang === 'th' ? 'พิพิธภัณฑ์' : 'Museum'}</option>
                    <option value="ธรรมชาติ">{activeLang === 'th' ? 'ธรรมชาติ' : 'Nature'}</option>
                    <option value="ช้อปปิ้ง">{activeLang === 'th' ? 'ช้อปปิ้ง' : 'Shopping'}</option>
                    <option value="ร้านอาหาร">{activeLang === 'th' ? 'ร้านอาหาร' : 'Restaurant'}</option>
                    <option value="คาเฟ่">{activeLang === 'th' ? 'คาเฟ่' : 'Café'}</option>
                    <option value="วิวทิวทัศน์">{activeLang === 'th' ? 'วิวทิวทัศน์' : 'Scenic View'}</option>
                    <option value="อื่นๆ">{activeLang === 'th' ? 'อื่นๆ' : 'Others'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-place-duration">{t('fDur')}</label>
                  <input id="edit-place-duration" className="form-input" type="number" value={editDur} onChange={(e) => setEditDur(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-place-address">{t('fAddr')}</label>
                <input id="edit-place-address" className="form-input" value={editAddr} onChange={(e) => setEditAddr(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-place-latitude">Latitude</label>
                  <input id="edit-place-latitude" className="form-input" type="number" step="any" value={editLat} onChange={(e) => setEditLat(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-place-longitude">Longitude</label>
                  <input id="edit-place-longitude" className="form-input" type="number" step="any" value={editLng} onChange={(e) => setEditLng(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-place-fee">{t('fFee')}</label>
                <input id="edit-place-fee" className="form-input" value={editFee} onChange={(e) => setEditFee(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-place-transport">{t('fTransport')}</label>
                <input id="edit-place-transport" className="form-input" value={editTransport} onChange={(e) => setEditTransport(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-place-icon">{t('fIcon')}</label>
                  <input id="edit-place-icon" className="form-input" value={editIcon} onChange={(e) => setEditIcon(e.target.value)} maxLength={2} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-place-keywords">{activeLang === 'th' ? 'คำค้นหารูปภาพ (Image Keywords)' : 'Image Keywords'}</label>
                  <input id="edit-place-keywords" className="form-input" value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} />
                </div>
              </div>

              {/* IMAGE SELECTOR GRID */}
              <div className="form-group">
                <label className="form-label">{activeLang === 'th' ? 'เลือกรูปภาพที่ต้องการแสดง (คลิกเพื่อเลือก):' : 'Select image to display (click to select):'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {searchingPhotos ? (
                    <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '15px 0', fontSize: '12px', color: 'var(--muted)' }}>
                      {activeLang === 'th' ? '🔄 กำลังค้นหาภาพจริงของสถานที่...' : '🔄 Searching for real photos...'}
                    </div>
                  ) : (() => {
                    const activeCover = getCoverImage(selectedPlace);
                    const brandPhotos = getBrandPlacePhotos(selectedPlace) || [];
                    const placePhotos = (selectedPlace.photos && selectedPlace.photos.length > 0)
                      ? selectedPlace.photos
                      : (searchedPhotos && searchedPhotos.length > 0 ? searchedPhotos : []);
                    
                    const pool = [];
                    if (activeCover) pool.push(activeCover);
                    pool.push(...brandPhotos);
                    pool.push(...placePhotos);

                    if (pool.length === 0) {
                      const cat = (selectedPlace.cat || '').toLowerCase();
                      let key = 'general';
                      if (cat.includes('โรงแรม') || cat.includes('hotel')) key = 'hotel';
                      else if (cat.includes('อาหาร') || cat.includes('restaurant')) key = 'restaurant';
                      else if (cat.includes('คาเฟ่') || cat.includes('cafe')) key = 'cafe';
                      else if (cat.includes('ช้อปปิ้ง') || cat.includes('ห้าง') || cat.includes('shop')) key = 'shopping';
                      else if (cat.includes('ตลาด') || cat.includes('market')) key = 'market';
                      else if (cat.includes('วัด') || cat.includes('temple')) key = 'temple';
                      else if (cat.includes('วัง') || cat.includes('palace')) key = 'palace';
                      else if (cat.includes('พิพิธภัณฑ์') || cat.includes('museum')) key = 'museum';
                      else if (cat.includes('ธรรมชาติ') || cat.includes('nature') || cat.includes('park')) key = 'nature';
                      pool.push(...((CATEGORY_COVER_IMAGES && CATEGORY_COVER_IMAGES[key]) || [CITY_COVER_IMAGES.travel]));
                    }

                    const displayUrls = Array.from(new Set(pool.filter(u => typeof u === 'string' && u.startsWith('http')))).slice(0, 6);

                    return displayUrls.map((url, idx) => {
                      const isSelected = editSelectedImage === url || (!editSelectedImage && (url === activeCover || idx === 0));

                      return (
                        <button
                          key={idx}
                          type="button"
                          aria-label={activeLang === 'th' ? `รูปภาพ ${idx + 1}` : `Image ${idx + 1}`}
                          aria-pressed={isSelected}
                          onClick={() => setEditSelectedImage(url)}
                          style={{
                            padding: 0,
                            background: 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: isSelected ? '3px solid var(--teal)' : '2px solid var(--border)',
                            transform: isSelected ? 'scale(0.98)' : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          <OptimizedImage
                            src={url}
                            alt=""
                            width={200}
                            containerStyle={{ width: '100%', height: '80px' }}
                            fallbackSrc={CITY_COVER_IMAGES.travel}
                          />
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'var(--teal)',
                              color: 'white',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              zIndex: 2
                            }}>
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-place-image-url">{activeLang === 'th' ? 'หรือใส่ลิงก์รูปภาพอื่นๆ (Custom Image URL)' : 'Or paste a custom image URL:'}</label>
                <input
                  id="edit-place-image-url"
                  className="form-input"
                  placeholder="https://..."
                  value={editSelectedImage}
                  onChange={(e) => setEditSelectedImage(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              {/* Render cover image in detail modal */}
              <div style={{ height: '180px', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '4px' }}>
                <OptimizedImage
                  src={getCoverImage(selectedPlace)}
                  alt={(selectedPlace.names && selectedPlace.names[activeLang]) || selectedPlace.name || ''}
                  width={800}
                  fallbackSrc={getCityFallbackImage(selectedPlace)}
                  containerStyle={{ width: '100%', height: '100%' }}
                />
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', zIndex: 2 }}>
                  {selectedPlace.icon} {(selectedPlace.names && selectedPlace.names[activeLang]) || selectedPlace.name}
                </div>
              </div>
              {((selectedPlace.descriptions && selectedPlace.descriptions[activeLang]) || selectedPlace.desc) && (
                <div className="detail-section">
                  <div className="detail-label">{t('fDesc')}</div>
                  <div className="detail-value">{(selectedPlace.descriptions && selectedPlace.descriptions[activeLang]) || selectedPlace.desc}</div>
                </div>
              )}
              {selectedPlace.addr && (
                <div className="detail-section">
                  <div className="detail-label">{t('detailAddr')}</div>
                  <div className="detail-value">{selectedPlace.addr}</div>
                </div>
              )}
              {selectedPlace.lat && selectedPlace.lng && (
                <div className="detail-section">
                  <div className="detail-label">{t('detailGPS')}</div>
                  <div className="gps-box">
                    <div className="gps-text">{selectedPlace.lat.toFixed(5)}° N, {selectedPlace.lng.toFixed(5)}° E</div>
                    <div className="gps-btns">
                      <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(`${selectedPlace.lat},${selectedPlace.lng}`); toast('คัดลอก GPS แล้ว'); }}>{t('copyGPS')}</button>
                      <a className="maps-link" href={`https://www.google.com/maps?q=${selectedPlace.lat},${selectedPlace.lng}`} target="_blank" rel="noreferrer">{t('openMaps')}</a>
                    </div>
                  </div>
                </div>
              )}
              {selectedPlace.fee && (
                <div className="detail-section">
                  <div className="detail-label">{t('detailFee')}</div>
                  <span className="fee-tag">💰 {selectedPlace.fee}</span>
                </div>
              )}
              {selectedPlace.transport && selectedPlace.transport.length > 0 && (
                <div className="detail-section">
                  <div className="detail-label">{t('detailTransport')}</div>
                  <div className="transport-list">
                    {selectedPlace.transport.map((tr, idx) => (
                      <div className="transport-row" key={idx}>
                        <div className="transport-icon">{tr.i}</div>
                        <div className="transport-text">{tr.t}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="add-day-wrap">
            <div className="add-day-label">{t('addToDay')}</div>
            <div className="day-picker-row">
              {Array(nDays).fill(0).map((_, i) => {
                const day = i + 1;
                const full = (itin[day] || []).length >= 5;
                const dayColor = DAY_COLORS[i % DAY_COLORS.length];
                
                return (
                  <button
                    key={day}
                    className="day-pick-btn"
                    style={!full ? { borderColor: dayColor.b, color: dayColor.t, background: dayColor.bg } : { opacity: 0.4, cursor: 'not-allowed' }}
                    disabled={full}
                    onClick={() => {
                      addToDay(selectedPlace, day);
                      setSelectedPlace(null);
                    }}
                  >
                    <b>{t('dayLabel')} {day}</b> ({ (itin[day] || []).length }{full ? ' · full' : ''})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-foot">
          {isEditing ? (
            <>
              <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>{activeLang === 'th' ? 'บันทึก' : 'Save'}</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => handleStartEditing(selectedPlace)}>{activeLang === 'th' ? '✏️ แก้ไขข้อมูล' : '✏️ Edit Info'}</button>
              <button className="btn btn-ghost" onClick={() => setSelectedPlace(null)}>{t('close')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
