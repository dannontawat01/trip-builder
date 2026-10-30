'use client';

import dynamic from 'next/dynamic';
import OptimizedImage from './OptimizedImage';
import BookingsPanel from './BookingsPanel';
import ToolbarIcon from './ToolbarIcon';
import { getGmapsWalkingRouteUrl } from '@/lib/gmapsRoute';

const SharedMap = dynamic(() => import('./MapComponent'), { ssr: false });
const ROUTE_STYLE = { display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px', color: 'var(--teal-d)', fontSize: '14px' };

export default function SharedPlanView({ itin, nDays, startDate, startTime, hotel, activeCity, activeLang, setActiveLang, bookings, onCopy, t, version, toastMessage }) {
  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 60px', overflowWrap: 'anywhere', color: 'var(--dark)', fontSize: '14px', lineHeight: 1.6 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}><h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>{t('itinerary')}</h1><p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>{t('readOnlyShare')} · {version}</p></div>
        <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: 'var(--muted)' }}>{t('language')} <select value={activeLang} onChange={event => setActiveLang(event.target.value)} style={{ minHeight: '44px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card)', color: 'var(--dark)', fontSize: '14px' }}><option value="th">ไทย</option><option value="en">English</option></select></label>
        <button type="button" className="btn btn-primary" style={{ minHeight: '44px', fontSize: '14px', whiteSpace: 'normal' }} onClick={onCopy}>{t('copyToMyPlan')}</button>
      </header>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px 24px', margin: 0, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {[[t('startDate'), startDate], [t('departTime'), startTime], [t('hotel'), hotel]].map(([label, value]) => <div key={label} style={{ minWidth: 0 }}><dt style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</dt><dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{value}</dd></div>)}
      </dl>
      <div style={{ height: '340px', width: '100%', position: 'relative', margin: '24px 0', isolation: 'isolate' }}><SharedMap itin={itin} nDays={nDays} activeCity={activeCity} activeLang={activeLang} /></div>
      {Array.from({ length: nDays }, (_, index) => {
        const day = index + 1;
        const stops = itin[day] || [];
        const route = getGmapsWalkingRouteUrl(stops, activeLang);
        return <section key={day} aria-labelledby={`shared-day-${day}`} style={{ padding: '24px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px 16px', marginBottom: '16px' }}>
            <h2 id={`shared-day-${day}`} style={{ fontSize: '18px', margin: 0 }}>{t('dayLabel')} {day}</h2>
            {route && <a href={route} target="_blank" rel="noopener noreferrer" style={ROUTE_STYLE}><ToolbarIcon name="map" />{t('openWalkMaps')}</a>}
          </div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {stops.map((stop, stopIndex) => <li key={stop.itinId || `${day}-${stopIndex}`} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: 'var(--teal-l)', color: 'var(--teal-d)', borderRadius: '8px', fontWeight: 700 }}>{stopIndex + 1}</span>
                {stopIndex < stops.length - 1 && <span aria-hidden="true" style={{ width: '1px', flex: 1, background: 'var(--border)', margin: '8px 0' }} />}
              </div>
              <article style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingBottom: '24px', minWidth: 0 }}>
                {(stop.photoUrl || stop.cover_image) && <div style={{ width: '160px', maxWidth: '100%', aspectRatio: '4/3', overflow: 'hidden', borderRadius: '8px', background: 'var(--bg)' }}><OptimizedImage src={stop.photoUrl || stop.cover_image} alt={stop.name} width={320} /></div>}
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <h3 style={{ fontSize: '16px', margin: '0 0 8px' }}>{stop.names?.[activeLang] || stop.name}</h3>
                  <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>{stop.dur} {t('minutes')}{stop.travelTime !== undefined && ` · ${t('travelDuration')}: ${stop.travelTime} ${t('minutes')}`}</p>
                  {stop.desc && <p style={{ margin: '0 0 12px' }}>{stop.descriptions?.[activeLang] || stop.desc}</p>}
                  {stop.addr && <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>{stop.addr}</p>}
                  {stop.fee && <p style={{ margin: '0 0 8px' }}>{t('fFee')}: {stop.fee}</p>}
                  {stop.note && <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 12px' }}>{stop.note}</p>}
                  {Number.isFinite(stop.lat) && Number.isFinite(stop.lng) && <a href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`} target="_blank" rel="noopener noreferrer" style={ROUTE_STYLE}><ToolbarIcon name="link" />{t('openWalkMaps')}</a>}
                </div>
              </article>
            </li>)}
          </ol>
        </section>;
      })}
      {(bookings.flights.length > 0 || bookings.hotels.length > 0) && <BookingsPanel bookings={bookings} t={t} readOnly />}
      <div className={`toast ${toastMessage ? 'show' : ''}`} role="status" aria-live="polite" aria-atomic="true">{toastMessage}</div>
    </main>
  );
}