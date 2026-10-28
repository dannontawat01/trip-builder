'use client';

import React from 'react';
import useDialogFocus from './useDialogFocus';

export default function QuickEditModals({
  editDurationModalOpen,
  setEditDurationModalOpen,
  editDurationTarget,
  setEditDurationTarget,
  handleSaveDurationQuick,
  editTravelModalOpen,
  setEditTravelModalOpen,
  editTravelTarget,
  setEditTravelTarget,
  handleSaveTravelTimeQuick,
  activeLang,
  formatMinutesToHours
}) {
  const durationRef = useDialogFocus(Boolean(editDurationModalOpen && editDurationTarget), () => setEditDurationModalOpen(false));
  const travelRef = useDialogFocus(Boolean(editTravelModalOpen && editTravelTarget), () => setEditTravelModalOpen(false));
  return (
    <>
      {/* ─── QUICK DURATION EDIT MODAL ───────────────────────────────── */}
      {editDurationModalOpen && editDurationTarget && (
        <div className="overlay show" onClick={() => setEditDurationModalOpen(false)}>
          <div ref={durationRef} role="dialog" aria-modal="true" aria-labelledby="duration-title" tabIndex={-1} className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div id="duration-title" className="modal-title">⏱ {activeLang === 'th' ? 'แก้ไขเวลาเข้าชม' : 'Edit Visit Duration'}</div>
              <button className="modal-close" aria-label={activeLang === 'th' ? 'ปิด' : 'Close'} onClick={() => setEditDurationModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                {activeLang === 'th' 
                  ? `แก้ไขระยะเวลาเข้าชมสำหรับ "${(editDurationTarget.item.names && editDurationTarget.item.names[activeLang]) || editDurationTarget.item.name}"`
                  : `Change visit duration for "${(editDurationTarget.item.names && editDurationTarget.item.names[activeLang]) || editDurationTarget.item.name}"`}
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="quick-duration">{activeLang === 'th' ? 'ระยะเวลา (นาที):' : 'Duration (minutes):'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="quick-duration"
                    type="number"
                    className="form-input"
                    value={editDurationTarget.value}
                    onChange={(e) => setEditDurationTarget({ ...editDurationTarget, value: e.target.value })}
                    style={{ flex: 1, fontSize: '15px', fontWeight: '500', padding: '10px' }}
                    min="1"
                    data-dialog-initial-focus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDurationQuick();
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)' }}>
                    {activeLang === 'th' ? 'นาที' : 'mins'}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditDurationModalOpen(false)}>{activeLang === 'th' ? 'ยกเลิก' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleSaveDurationQuick}>{activeLang === 'th' ? 'บันทึก' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUICK TRAVEL TIME EDIT MODAL ────────────────────────────── */}
      {editTravelModalOpen && editTravelTarget && (
        <div className="overlay show" onClick={() => setEditTravelModalOpen(false)}>
          <div ref={travelRef} role="dialog" aria-modal="true" aria-labelledby="travel-time-title" tabIndex={-1} className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div id="travel-time-title" className="modal-title">🚗 {activeLang === 'th' ? 'แก้ไขเวลาเดินทาง' : 'Edit Travel Time'}</div>
              <button className="modal-close" aria-label={activeLang === 'th' ? 'ปิด' : 'Close'} onClick={() => setEditTravelModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                {activeLang === 'th' 
                  ? `แก้ไขระยะเวลาเดินทางไปยัง "${(editTravelTarget.item.names && editTravelTarget.item.names[activeLang]) || editTravelTarget.item.name}"`
                  : `Change travel time to "${(editTravelTarget.item.names && editTravelTarget.item.names[activeLang]) || editTravelTarget.item.name}"`}
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="quick-travel-time">{activeLang === 'th' ? 'ระยะเวลาเดินทาง (นาที):' : 'Travel Duration (minutes):'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="quick-travel-time"
                    type="number"
                    className="form-input"
                    value={editTravelTarget.value}
                    onChange={(e) => setEditTravelTarget({ ...editTravelTarget, value: e.target.value })}
                    style={{ flex: 1, fontSize: '15px', fontWeight: '500', padding: '10px' }}
                    min="0"
                    data-dialog-initial-focus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTravelTimeQuick();
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)' }}>
                    {activeLang === 'th' ? 'นาที' : 'mins'}
                  </span>
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: 'var(--teal)', 
                  background: 'var(--teal-l)', 
                  padding: '8px 12px', 
                  borderRadius: '8px',
                  display: editTravelTarget.value ? 'block' : 'none'
                }}>
                  {formatMinutesToHours(editTravelTarget.value)}
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditTravelModalOpen(false)}>{activeLang === 'th' ? 'ยกเลิก' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleSaveTravelTimeQuick}>{activeLang === 'th' ? 'บันทึก' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
