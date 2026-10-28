'use client';

import useDialogFocus from './useDialogFocus';

export default function RouteOptimizationModal({
  isOpen,
  optData,
  onClose,
  onApply,
  activeLang = 'th',
  t
}) {
  const dialogRef = useDialogFocus(Boolean(isOpen && optData), onClose);
  if (!isOpen || !optData) return null;

  return (
    <div className="overlay show" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="route-opt-title" tabIndex={-1} className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', width: '92%' }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <div id="route-opt-title" className="modal-title" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {t('optimizeModalTitle')} — {t('dayLabel')} {optData.day}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {t('optComparisonSubtitle')}
              </div>
            </div>
          </div>
          <button className="modal-close" aria-label={t('close')} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Metric summary badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'var(--surface-alt, #f9fafb)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #e5e7eb)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{t('distanceSaved')}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--teal, #0F6E56)', marginTop: '2px' }}>
                -{optData.savedDistKm} km
                <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '4px', color: 'var(--teal, #0F6E56)' }}>
                  ({optData.savedDistPercent}%)
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--surface-alt, #f9fafb)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #e5e7eb)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{t('timeSaved')}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--teal, #0F6E56)', marginTop: '2px' }}>
                -{optData.savedTimeMins} {activeLang === 'th' ? 'นาที' : 'mins'}
              </div>
            </div>

            <div style={{
              background: 'var(--surface-alt, #f9fafb)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #e5e7eb)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{t('optTotalDist')}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
                <span style={{ textDecoration: 'line-through', color: 'var(--muted)', marginRight: '6px' }}>
                  {optData.originalMetrics.totalDistKm} km
                </span>
                ➔ {optData.optimizedMetrics.totalDistKm} km
              </div>
            </div>
          </div>

          {/* Side-by-side or stacked route comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {/* Current order */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              background: 'rgba(0,0,0,0.01)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '8px' }}>
                {t('beforeOptimize')} ({optData.originalMetrics.totalDistKm} km)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {optData.originalItems.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--border, #e5e7eb)',
                      color: 'var(--muted, #666)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(it.names && it.names[activeLang]) || it.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended order */}
            <div style={{
              border: '1px solid var(--teal, #1D9E75)',
              borderRadius: '8px',
              padding: '12px',
              background: 'var(--teal-light, #E1F5EE)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--teal, #0F6E56)', marginBottom: '8px' }}>
                {t('afterOptimize')} ({optData.optimizedMetrics.totalDistKm} km) ✨
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {optData.optimizedItems.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--teal, #1D9E75)',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>
                      {(it.names && it.names[activeLang]) || it.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-foot" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            {t('keepOriginalRoute')}
          </button>
          <button className="btn btn-primary" onClick={onApply} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{t('applyOptimizedRoute')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
