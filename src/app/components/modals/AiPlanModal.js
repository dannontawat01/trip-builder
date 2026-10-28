'use client';

import React from 'react';
import useDialogFocus from './useDialogFocus';

export default function AiPlanModal({
  aiPlanModalOpen,
  setAiPlanModalOpen,
  t,
  activeLang,
  aiHotel,
  setAiHotel,
  aiStart,
  setAiStart,
  aiEnd,
  setAiEnd,
  selectedInterests,
  setSelectedInterests,
  aiPlanStatus,
  aiPlanLoading,
  aiPlanResult,
  handleAIPlan,
  applyAIPlan
}) {
  const dialogRef = useDialogFocus(aiPlanModalOpen, () => setAiPlanModalOpen(false));
  if (!aiPlanModalOpen) return null;

  return (
    <div className="overlay show" onClick={() => setAiPlanModalOpen(false)}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="ai-plan-title" tabIndex={-1} className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div id="ai-plan-title" className="modal-title">{t('aiModalTitle')}</div>
          <button className="modal-close" aria-label={t('close')} onClick={() => setAiPlanModalOpen(false)}>✕</button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="ai-modal-info">{t('aiInfo')}</div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="ai-hotel">{t('aiHotel')} <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}>{t('aiHotelSub')}</span></label>
            <input id="ai-hotel" className="form-input" placeholder={t('aiHotelPh')} value={aiHotel} onChange={(e) => setAiHotel(e.target.value)} />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="ai-start">{t('startDate')}</label>
              <input id="ai-start" type="date" className="form-input" value={aiStart} onChange={(e) => setAiStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ai-end">{t('endDate')}</label>
              <input id="ai-end" type="date" className="form-input" value={aiEnd} onChange={(e) => setAiEnd(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('aiInterests')} <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}>{t('aiInterestsSub')}</span></label>
            <div className="interests-wrap">
              {['iFood', 'iShop', 'iTemple', 'iNature', 'iArt', 'iPhoto', 'iCafe', 'iBeach'].map(interestKey => {
                const isActive = selectedInterests.includes(interestKey);
                const interestLabel = t(interestKey);
                return (
                  <button
                    key={interestKey}
                    className={`interest-chip ${isActive ? 'active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => {
                      if (isActive) {
                        setSelectedInterests(selectedInterests.filter(i => i !== interestKey));
                      } else {
                        setSelectedInterests([...selectedInterests, interestKey]);
                      }
                    }}
                  >
                    {interestLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan results display */}
          {aiPlanStatus && (
            <div style={{ marginTop: '12px' }}>
              {aiPlanStatus === 'generating' && (
                <div className="ai-generating">
                  <div className="ai-gen-icon" style={{ fontSize: '24px', textAlign: 'center' }}>✦</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>{activeLang === 'th' ? 'AI กำลังคำนวณและวางเส้นทางให้คุณอยู่...' : 'AI is calculating and planning your route...'}</div>
                </div>
              )}
              {aiPlanStatus === 'error' && (
                <div style={{ fontSize: '11px', color: 'var(--red)', background: 'var(--red-l)', padding: '8px', borderRadius: '8px' }}>
                  {activeLang === 'th' ? 'เกิดข้อผิดพลาดในการสร้างแผน กรุณาลองอีกครั้ง' : 'Failed to generate itinerary. Please try again.'}
                </div>
              )}
              {aiPlanStatus === 'done' && aiPlanResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{activeLang === 'th' ? 'แผนการเดินทางของคุณเสร็จเรียบร้อย!' : 'Your itinerary is ready!'}</div>
                  <div className="ai-result-preview" style={{ fontSize: '11px', background: 'var(--bg)', padding: '10px', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {Object.entries(aiPlanResult).map(([d, items]) => (
                      <div key={d} style={{ marginBottom: '8px' }}>
                        <b>{activeLang === 'th' ? `วันที่ ${d}:` : `Day ${d}:`}</b> {items.map(it => it.name).join(' → ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setAiPlanModalOpen(false)}>{t('close')}</button>
          {aiPlanStatus !== 'done' ? (
            <button className="btn btn-primary" disabled={aiPlanLoading} onClick={handleAIPlan}>
              {aiPlanLoading ? (activeLang === 'th' ? 'กำลังสร้าง...' : 'Generating...') : t('aiGenerate')}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={applyAIPlan}>{activeLang === 'th' ? 'ใช้แผนการเดินทางนี้' : 'Apply Itinerary'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
