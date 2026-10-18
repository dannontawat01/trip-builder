'use client';

import React from 'react';

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
  handleCreateRoom,
  handleJoinRoom,
  t,
  activeLang
}) {
  if (!groupModalOpen) return null;

  return (
    <div className="overlay show" onClick={() => setGroupModalOpen(false)}>
      <div className="modal modal-sm group-collab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{t('groupModalTitle')}</div>
          <button className="modal-close" onClick={() => setGroupModalOpen(false)}>✕</button>
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
          <div className="form-group">
            <label className="form-label">{t('nickname')} *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder={t('nicknamePh')} 
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              autoFocus
            />
          </div>

          {groupModalTab === 'create' ? (
            <>
              <div className="form-group">
                <label className="form-label">{t('roomName')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('roomNamePh')} 
                  value={inputRoomName}
                  onChange={(e) => setInputRoomName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('roomCode')} ({activeLang === 'th' ? 'เว้นว่างเพื่อสุ่มอัตโนมัติ' : 'Optional / Auto-generated'})</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="เช่น TRIP-9922" 
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: '1px', textTransform: 'uppercase' }}
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', lineHeight: '1.4' }}>
                {activeLang === 'th'
                  ? '💡 ระบบจะสร้างห้องกลุ่มจากทริปปัจจุบันของคุณ และสร้างรหัสห้องสำหรับส่งให้เพื่อนเข้าร่วมได้ทันที'
                  : '💡 A new group room will be created from your active trip, and a room code will be generated for friends.'}
              </p>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">{t('roomCode')} *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('roomCodePh')} 
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  style={{ letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}
                />
              </div>
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
