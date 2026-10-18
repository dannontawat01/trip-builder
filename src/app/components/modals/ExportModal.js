'use client';

import React from 'react';
import { DAY_COLORS } from '@/app/constants/translations';

export default function ExportModal({
  exportModalOpen,
  setExportModalOpen,
  t,
  activeLang,
  selectedStyle,
  setSelectedStyle,
  buildShareLink,
  shareGmapsRoute,
  toast,
  nDays,
  itin,
  getGmapsWalkingRouteUrl,
  getFormattedItinerary,
  handleDownloadPDF,
  handleExportBackup,
  handleImportBackup
}) {
  if (!exportModalOpen) return null;

  return (
    <div className="overlay show" onClick={() => setExportModalOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{t('exportTitle')}</div>
          <button className="modal-close" onClick={() => setExportModalOpen(false)}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <div className="form-label">{t('exportFmt')}</div>
            <div className="style-grid">
              <div className={`style-card ${selectedStyle === 'A' ? 'active' : ''}`} onClick={() => setSelectedStyle('A')}>
                <div className="style-icon">🎨</div>
                <div className="style-name">Beautiful</div>
                <div className="style-desc">{t('pdfBeautiful')}</div>
              </div>
              <div className={`style-card ${selectedStyle === 'B' ? 'active' : ''}`} onClick={() => setSelectedStyle('B')}>
                <div className="style-icon">📄</div>
                <div className="style-name">Clean</div>
                <div className="style-desc">{t('pdfClean')}</div>
              </div>
              <div className={`style-card ${selectedStyle === 'C' ? 'active' : ''}`} onClick={() => setSelectedStyle('C')}>
                <div className="style-icon">📈</div>
                <div className="style-name">Timeline</div>
                <div className="style-desc">{t('pdfTimeline')}</div>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <div className="form-label">{t('exportShare')}</div>
            <div className="share-box">
              <input
                type="text"
                readOnly
                className="share-url notranslate"
                translate="no"
                value={buildShareLink()}
                onClick={(e) => e.target.select()}
              />
              <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(buildShareLink()); toast(t('shareLinkCopied')); }}>{t('copyLink')}</button>
            </div>
            <div className="share-note">{t('exportShareNote')}</div>
          </div>

          {/* Google Maps Walking Routes By Day */}
          <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
            <div className="form-label">{t('exportWalkTitle')}</div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
              {activeLang === 'th'
                ? 'เปิดหรือแชร์เส้นทางนำทางเดินเท้าจริงผ่าน Google Maps สำหรับการเที่ยวแต่ละวัน'
                : 'Open or share turn-by-turn walking directions via Google Maps for each day.'}
            </p>
            <div className="export-walk-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array(nDays).fill(0).map((_, i) => {
                const day = i + 1;
                const dayItems = itin[day] || [];
                const walkUrl = getGmapsWalkingRouteUrl(dayItems, activeLang);
                const hasPlaces = dayItems.length > 0;
                const dayColor = DAY_COLORS[i % DAY_COLORS.length];
                const routeSummary = dayItems.map(p => (p.names && p.names[activeLang]) || p.name).join(' ➔ ');

                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--surface-alt, rgba(0,0,0,0.02))',
                      border: '1px solid var(--border, #e5e7eb)',
                      fontSize: '12px',
                      gap: '8px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: dayColor.t, background: dayColor.bg, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', border: `1px solid ${dayColor.b}` }}>
                          {t('dayLabel')} {day}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'normal' }}>
                          ({dayItems.length} {t('stopsCount')})
                        </span>
                      </div>
                      {hasPlaces ? (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '3px' }} title={routeSummary}>
                          {routeSummary}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '3px' }}>
                          {t('noPlacesForRoute')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={!hasPlaces}
                        onClick={() => {
                          if (walkUrl) window.open(walkUrl, '_blank', 'noopener,noreferrer');
                        }}
                        style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid var(--border)' }}
                      >
                        {t('openWalkMaps')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        disabled={!hasPlaces}
                        onClick={async () => {
                          if (!walkUrl) return;
                          await shareGmapsRoute({
                            url: walkUrl,
                            title: `${t('dayLabel')} ${day} - ${t('walkMaps')}`,
                            text: `${t('dayLabel')} ${day}: ${routeSummary}`,
                            onToast: toast,
                            copiedMsg: t('walkRouteCopied')
                          });
                        }}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        {t('copyWalkLink')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <div className="form-label">{t('exportPreview')}</div>
            <pre className="out-box">{getFormattedItinerary()}</pre>
          </div>

          {/* Backup & Restore (JSON) Section */}
          <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
            <div className="form-label">
              💾 {activeLang === 'th' ? 'สำรองและกู้คืนข้อมูล (Backup & Restore)' : 'Backup & Restore (JSON)'}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>
              {activeLang === 'th' 
                ? 'ดาวน์โหลดไฟล์สำรองข้อมูล (รวมทุกแผนและสถานที่ที่เพิ่มเอง) เพื่อนำไปเปิดในเครื่องอื่น หรือกู้คืนข้อมูลกลับมาได้ทุกเมื่อ'
                : 'Download a backup file (includes all plans and custom places) to transfer to another device or restore anytime.'}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="btn btn-ghost btn-sm" 
                onClick={handleExportBackup}
                style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>📥</span>
                <span>{activeLang === 'th' ? 'ดาวน์โหลดไฟล์สำรอง (Export JSON)' : 'Export Backup (JSON)'}</span>
              </button>
              <label 
                className="btn btn-ghost btn-sm" 
                style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}
              >
                <span>📤</span>
                <span>{activeLang === 'th' ? 'นำเข้าไฟล์สำรอง (Import JSON)' : 'Import Backup (JSON)'}</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportBackup} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          </div>
        </div>
        
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setExportModalOpen(false)}>{t('close')}</button>
          <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(getFormattedItinerary()); toast(t('itineraryCopied')); }}>{t('copyText')}</button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>{t('downloadPDF')}</button>
        </div>
      </div>
    </div>
  );
}
