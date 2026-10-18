'use client';

import React from 'react';

export default function AuthModal({
  authModalOpen,
  setAuthModalOpen,
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authLoading,
  handleSignIn,
  handleSignUp,
  activeLang
}) {
  if (!authModalOpen) return null;

  return (
    <div className="overlay show" onClick={() => setAuthModalOpen(false)}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            {authMode === 'login' 
              ? (activeLang === 'th' ? '🔑 เข้าสู่ระบบ' : '🔑 Sign In')
              : (activeLang === 'th' ? '📝 สมัครสมาชิก' : '📝 Register')}
          </div>
          <button className="modal-close" onClick={() => setAuthModalOpen(false)}>✕</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          <div className="form-group">
            <label className="form-label">{activeLang === 'th' ? 'อีเมล' : 'Email Address'}</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
          </div>
          
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">{activeLang === 'th' ? 'รหัสผ่าน' : 'Password'}</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (authMode === 'login') handleSignIn();
                  else handleSignUp();
                }
              }}
            />
          </div>

          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px', textAlign: 'center' }}>
            {authMode === 'login' ? (
              <>
                {activeLang === 'th' ? 'ยังไม่มีบัญชีผู้ใช้?' : "Don't have an account?"}{' '}
                <span 
                  style={{ color: 'var(--teal)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setAuthMode('register')}
                >
                  {activeLang === 'th' ? 'สมัครสมาชิกที่นี่' : 'Register here'}
                </span>
              </>
            ) : (
              <>
                {activeLang === 'th' ? 'มีบัญชีอยู่แล้ว?' : 'Already have an account?'}{' '}
                <span 
                  style={{ color: 'var(--teal)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setAuthMode('login')}
                >
                  {activeLang === 'th' ? 'เข้าสู่ระบบที่นี่' : 'Sign in here'}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => setAuthModalOpen(false)}>
            {activeLang === 'th' ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button 
            className="btn btn-primary" 
            disabled={authLoading}
            onClick={authMode === 'login' ? handleSignIn : handleSignUp}
          >
            {authLoading 
              ? (activeLang === 'th' ? 'กำลังทำงาน...' : 'Loading...')
              : (authMode === 'login' 
                  ? (activeLang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')
                  : (activeLang === 'th' ? 'สมัครสมาชิก' : 'Register'))}
          </button>
        </div>
      </div>
    </div>
  );
}
