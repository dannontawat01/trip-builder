'use client';

import React from 'react';
import useDialogFocus from './useDialogFocus';

export default function GroupCollabModal({
  groupModalOpen,
  setGroupModalOpen,
  groupModalTab,
  setGroupModalTab,
  inputNickname,
  setInputNickname,
  inputRoomName,
  setInputRoomName,
  inputRoomCode,
  setInputRoomCode,
  isRoomSyncing,
  inputRoomInvite,
  setInputRoomInvite,
  roomError,
  roomMode,
  includePrivateBookings,
  setIncludePrivateBookings,
  handleCreateRoom,
  handleJoinRoom,
  t,
  activeLang
}) {
  const dialogRef = useDialogFocus(groupModalOpen, () => setGroupModalOpen(false));
  if (!groupModalOpen) return null;

  return (
    <div className="overlay show" onClick={() => setGroupModalOpen(false)}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="group-title" tabIndex={-1} className="modal modal-sm group-collab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div id="group-title" className="modal-title">{t('groupModalTitle')}</div>
          <button className="modal-close" aria-label={t('close')} onClick={() => setGroupModalOpen(false)}>✕</button>
        </div>
        
        {/* Modal Tabs */}
        <div className="group-modal-tabs">
          <button 
            type="button"
            className={`group-tab-btn ${groupModalTab === 'create' ? 'active' : ''}`}
            onClick={() => setGroupModalTab('create')}
          >
            {t('tabCreateRoom')}
          </button>
          <button 
            type="button"
            className={`group-tab-btn ${groupModalTab === 'join' ? 'active' : ''}`}
            onClick={() => setGroupModalTab('join')}
          >
            {t('tabJoinRoom')}
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          <p role="status" style={{ fontSize: '12px', marginBottom: '12px' }}>{t(roomMode === 'setup-required' ? 'roomAuthSetup' : roomMode === 'local-mock' ? 'roomMock' : 'roomSecure')}</p>
          <details style={{ marginBottom: '12px', fontSize: '12px' }}><summary>{t('roomSetupTitle')}</summary><p>{t('roomSetup')}</p><p>{t('roomLegacy')}</p></details>
          {roomError && <p role="alert" style={{ marginBottom: '12px' }}>{t(roomError)}</p>}
          <div className="form-group">
            <label className="form-label" htmlFor="group-nickname">{t('nickname')} *</label>
            <input 
              id="group-nickname"
              type="text" 
              className="form-input" 
              placeholder={t('nicknamePh')} 
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              data-dialog-initial-focus
            />
          </div>

          {groupModalTab === 'create' ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="group-room-name">{t('roomName')}</label>
                <input 
                  id="group-room-name"
                  type="text" 
                  className="form-input" 
                  placeholder={t('roomNamePh')} 
                  value={inputRoomName}
                  onChange={(e) => setInputRoomName(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', gap: '8px' }}><input type="checkbox" checked={includePrivateBookings} onChange={event => setIncludePrivateBookings(event.target.checked)} />{t('privateBookingsOptIn')}</label>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', lineHeight: '1.4' }}>
                {activeLang === 'th'
                  ? '💡 ระบบจะสร้างห้องกลุ่มจากทริปปัจจุบันของคุณ และสร้างรหัสห้องสำหรับส่งให้เพื่อนเข้าร่วมได้ทันที'
                  : '💡 A new group room will be created from your active trip, and a room code will be generated for friends.'}
              </p>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="group-join-code">{t('roomCode')} *</label>
                <input 
                  id="group-join-code"
                  type="text" 
                  className="form-input" 
                  placeholder={t('roomCodePh')} 
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  maxLength={13}
                  style={{ letterSpacing: 0, textTransform: 'uppercase', fontWeight: 600 }}
                />
              </div>
              <div className="form-group"><label className="form-label" htmlFor="group-invite">{t('roomInvite')}</label><input id="group-invite" type="password" autoComplete="off" className="form-input" value={inputRoomInvite} maxLength={64} onChange={event => setInputRoomInvite(event.target.value.trim())} /></div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', lineHeight: '1.4' }}>
                {activeLang === 'th'
                  ? '💡 ใส่รหัสห้องที่ได้รับจากเพื่อน เพื่อโหลดแผนทริปและจัดตารางร่วมกัน'
                  : '💡 Enter the room code shared by your friend to load the trip and collaborate.'}
              </p>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setGroupModalOpen(false)}>
            {t('cancel')}
          </button>
          {groupModalTab === 'create' ? (
            <button 
              className="btn btn-primary" 
              disabled={isRoomSyncing}
              onClick={handleCreateRoom}
            >
              {isRoomSyncing ? (activeLang === 'th' ? 'กำลังสร้าง...' : 'Creating...') : t('createRoomBtn')}
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              disabled={isRoomSyncing}
              onClick={() => handleJoinRoom(inputRoomCode, inputNickname)}
            >
              {isRoomSyncing ? (activeLang === 'th' ? 'กำลังเข้าร่วม...' : 'Joining...') : t('joinRoomBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
