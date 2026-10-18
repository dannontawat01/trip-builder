'use client';

import React from 'react';
import { COUNTRIES, getCountryName, getCityName } from '@/app/constants/translations';

export default function HeaderNav({
  APP_VERSION,
  activeLang,
  setActiveLang,
  theme,
  setTheme,
  setTravelModeOpen,
  showMap,
  setShowMap,
  clearAll,
  setExportModalOpen,
  activeRoom,
  setGroupModalOpen,
  plansDropdownOpen,
  setPlansDropdownOpen,
  plansList,
  activePlanId,
  loadActivePlan,
  renamePlan,
  deletePlan,
  createNewPlan,
  user,
  userDropdownOpen,
  setUserDropdownOpen,
  handleSignOut,
  setAuthMode,
  setAuthModalOpen,
  activeCountry,
  handleCountrySelect,
  activeCity,
  setActiveCity,
  setFilterCat,
  getCityObj,
  gmapsSyncUrl,
  gmapsSyncLoading,
  syncGmaps,
  setAddModalOpen,
  setActiveAddTab,
  setGmapsSyncUrl,
  gmapsLastSyncTime,
  t
}) {
  return (
    <div className="topbar">
      <div className="topbar-main-row">
        <div className="logo">
          <div className="logo-dot"></div>
          <span>Trip Builder</span>
          <span className="app-version-badge">{APP_VERSION}</span>
        </div>
        
        {/* Topbar Actions */}
        <div className="topbar-actions">
          <select
            className="lang-select"
            value={activeLang}
            onChange={(e) => {
              setActiveLang(e.target.value);
              localStorage.setItem('tb_lang', e.target.value);
            }}
            title="Language"
          >
            <option value="th">🇹🇭 ไทย</option>
            <option value="en">🇬🇧 EN</option>
          </select>
          
          <div className="theme-toggle-container" style={{ display: 'flex', gap: '2px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '2px' }}>
            <button className={`theme-mode-btn ${theme === 'clean' ? 'active' : ''}`} onClick={() => setTheme('clean')} title="Clean">☀</button>
            <button className={`theme-mode-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark">🌙</button>
            <button className={`theme-mode-btn ${theme === 'colorful' ? 'active' : ''}`} onClick={() => setTheme('colorful')} title="Colorful">🎨</button>
          </div>

          <div className="topbar-action-group">
            <button 
              className="btn btn-sm topbar-travel-btn" 
              onClick={() => setTravelModeOpen(true)}
              title={t('travelMode')}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
                padding: '5px 10px',
                borderRadius: '8px'
              }}
            >
              <span>✈️</span>
              <span className="travel-btn-text">{activeLang === 'th' ? 'เที่ยวจริง' : 'Travel'}</span>
            </button>
            <button className={`btn btn-sm ${showMap ? 'btn-primary' : 'btn-ghost'} topbar-map-btn`} onClick={() => setShowMap(!showMap)}>
              <span className="map-btn-icon">🗺️</span>
              <span className="map-btn-text"> {activeLang === 'th' ? 'แผนที่' : 'Map'}</span>
            </button>
            <button className="btn btn-ghost btn-sm topbar-clear-btn" onClick={clearAll}>{t('clear')}</button>
            <button className="btn btn-primary btn-sm topbar-export-btn" onClick={() => setExportModalOpen(true)}>{t('export')}</button>
            {/* Google Maps Sync Action (Always visible & interactive) */}
            <div className="topbar-sync-group" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <button 
                className={`btn btn-sm ${gmapsSyncUrl ? 'btn-ghost' : 'btn-ghost'} topbar-sync-btn`}
                onClick={() => {
                  if (gmapsSyncUrl) {
                    syncGmaps();
                  } else {
                    if (setAddModalOpen) setAddModalOpen(true);
                    if (setActiveAddTab) setActiveAddTab('gmaps');
                  }
                }}
                disabled={gmapsSyncLoading}
                title={gmapsSyncUrl 
                  ? (activeLang === 'th' ? `ซิงก์ข้อมูลจาก Google Maps (ซิงก์ล่าสุด: ${gmapsLastSyncTime || 'ยังไม่ได้ซิงก์'})` : `Sync from Google Maps (Last: ${gmapsLastSyncTime || 'Never'})`)
                  : (activeLang === 'th' ? 'เชื่อมต่อ Google Maps เพื่อซิงก์สถานที่อัตโนมัติ' : 'Connect Google Maps to auto-sync places')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: gmapsSyncUrl ? 'var(--teal)' : 'var(--muted)',
                  border: gmapsSyncUrl ? '1px solid var(--teal-m)' : '1px dashed var(--border)',
                  background: gmapsSyncUrl ? 'rgba(29, 158, 117, 0.08)' : 'transparent'
                }}
              >
                <span style={{ display: 'inline-block', animation: gmapsSyncLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
                <span className="sync-btn-text" style={{ fontSize: '11px', fontWeight: '600' }}>
                  {gmapsSyncLoading 
                    ? (activeLang === 'th' ? 'กำลังซิงก์...' : 'Syncing...') 
                    : gmapsSyncUrl 
                      ? (activeLang === 'th' ? 'ซิงก์ Maps' : 'Sync Maps')
                      : (activeLang === 'th' ? 'ซิงก์ Maps (เชื่อมต่อ)' : 'Sync Maps (Connect)')}
                </span>
              </button>
              {gmapsSyncUrl && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    if (setAddModalOpen) setAddModalOpen(true);
                    if (setActiveAddTab) setActiveAddTab('gmaps');
                  }}
                  title={activeLang === 'th' ? 'จัดการ / เปลี่ยนลิงก์ Google Maps' : 'Manage / Change Google Maps Link'}
                  style={{
                    padding: '0 4px',
                    height: '24px',
                    color: 'var(--muted)',
                    fontSize: '11px'
                  }}
                >
                  ⚙️
                </button>
              )}
            </div>
            <button 
              className={`btn btn-sm ${activeRoom ? 'btn-primary' : 'btn-ghost'} topbar-group-btn`} 
              onClick={() => setGroupModalOpen(true)}
              title={t('groupPlan')}
            >
              <span>👥</span>
              <span className="group-btn-text">{activeRoom ? activeRoom.code : t('groupPlan')}</span>
            </button>
          </div>

          {/* Plans Selector Dropdown (Available for ALL users) */}
          <div className="plans-menu-container" style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm topbar-plans-btn"
              onClick={() => setPlansDropdownOpen(!plansDropdownOpen)}
              style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}
              title={activeLang === 'th' ? 'เลือกแผนการเดินทาง' : 'Select Plan'}
            >
              <span>📂</span>
              <span className="plans-btn-title" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plansList.find(p => p.id === activePlanId)?.name || (activeLang === 'th' ? 'แผนการเดินทาง' : 'My Plan')}
              </span>
              <span className="plans-btn-chevron" style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
            </button>

            {plansDropdownOpen && (
              <div className="user-dropdown" onClick={(e) => e.stopPropagation()} style={{ minWidth: '260px', right: 0 }}>
                <div className="plans-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📂 {activeLang === 'th' ? 'แผนเดินทางของฉัน' : 'My Travel Plans'}</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>({plansList.length})</span>
                </div>
                
                <div className="plans-list-container">
                  {plansList.map(plan => {
                    const isActive = activePlanId === plan.id;
                    return (
                      <div 
                        key={plan.id} 
                        className={`plan-item-row ${isActive ? 'active' : ''}`}
                        onClick={() => { loadActivePlan(plan.id); setPlansDropdownOpen(false); }}
                      >
                        <span className="plan-item-info">
                          {getCityObj(plan.city_id)?.emoji || '📍'} {plan.name} ({plan.nDays} {activeLang === 'th' ? 'วัน' : 'd'})
                        </span>
                        <div className="plan-item-actions">
                          <button 
                            className="plan-btn-mini rename" 
                            title={activeLang === 'th' ? 'เปลี่ยนชื่อ' : 'Rename'}
                            onClick={(e) => renamePlan(plan.id, e)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="plan-btn-mini" 
                            title={activeLang === 'th' ? 'ลบ' : 'Delete'}
                            onClick={(e) => deletePlan(plan.id, e)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
                  onClick={() => { createNewPlan(); setPlansDropdownOpen(false); }}
                >
                  ➕ {activeLang === 'th' ? 'สร้างแผนใหม่' : 'New Plan'}
                </button>
              </div>
            )}
          </div>

          {/* User Profile / Cloud Sync Panel */}
          <div className="user-menu-container" style={{ position: 'relative' }}>
            {user ? (
              <>
                <div className="user-badge" onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
                  <div className="user-avatar">
                    {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <span className="user-badge-name">{user.email ? user.email.split('@')[0] : 'Member'}</span>
                  <span className="user-badge-arrow"> ▼</span>
                </div>
                
                {userDropdownOpen && (
                  <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown-email">
                      📧 {user.email}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #888)', margin: '4px 0 10px 0' }}>
                      ☁️ {activeLang === 'th' ? 'เชื่อมต่อ Google Sheets แล้ว' : 'Connected to Cloud'}
                    </div>
                    
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ width: '100%', justifyContent: 'center', background: 'var(--red)', borderColor: 'var(--red)' }}
                      onClick={handleSignOut}
                    >
                      🚪 {activeLang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button 
                className="btn btn-ghost btn-sm topbar-signin-btn" 
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}
                title={activeLang === 'th' ? 'เข้าสู่ระบบเพื่อซิงค์ข้อมูลบน Cloud' : 'Sign In to sync with Cloud'}
              >
                <span>☁️</span>
                <span className="signin-btn-text"> {activeLang === 'th' ? 'เข้าสู่ระบบ (ซิงค์ Cloud)' : 'Sign In (Cloud Sync)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="topbar-sep desktop-sep-1" />

      <div className="topbar-sub-row">
        {/* Country buttons */}
        <div className="country-row">
          {COUNTRIES.map(c => (
            <button
              key={c.id}
              className={`country-btn ${activeCountry === c.id ? 'active' : ''}`}
              style={activeCountry === c.id ? { background: getCityObj(activeCity)?.color || '#1D9E75' } : {}}
              onClick={() => handleCountrySelect(c.id)}
            >
              {c.flag} {getCountryName(c, activeLang)}
            </button>
          ))}
        </div>
        
        <div className="topbar-sep sub-sep" />

        {/* City buttons */}
        <div className="city-row">
          {(COUNTRIES.find(c => c.id === activeCountry)?.cities || []).map(c => (
            <button
              key={c.id}
              className={`city-btn ${activeCity === c.id ? 'active' : ''}`}
              style={activeCity === c.id ? { background: c.color, borderColor: c.color } : {}}
              onClick={() => {
                setActiveCity(c.id);
                setFilterCat('__all__');
              }}
            >
              {c.emoji} {getCityName(c, activeLang)}
            </button>
          ))}
        </div>
      </div>

      <div className="topbar-sep desktop-sep-2" />
    </div>
  );
}
