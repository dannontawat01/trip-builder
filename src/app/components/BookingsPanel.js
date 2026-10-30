'use client';

import { useState } from 'react';
import { validateBooking } from '@/lib/planState';

const BOOKING_FIELDS = {
  flights: [['name', 'flightName', 'text'], ['from', 'flightFrom', 'text'], ['to', 'flightTo', 'text'], ['departure', 'departure', 'datetime-local'], ['arrival', 'arrival', 'datetime-local']],
  hotels: [['name', 'hotel', 'text'], ['address', 'fAddr', 'text'], ['checkIn', 'checkIn', 'date'], ['checkOut', 'checkOut', 'date']]
};

const FIELD_STYLE = { display: 'grid', gap: '8px', minWidth: 0, fontSize: '12px', fontWeight: 600, color: 'var(--muted)' };
const INPUT_STYLE = { width: '100%', minWidth: 0, minHeight: '44px', background: 'var(--card)', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' };
const ACTION_STYLE = { minHeight: '44px', fontSize: '14px', whiteSpace: 'normal' };

export default function BookingsPanel({ bookings, onChange, t, readOnly = false }) {
  const [kind, setKind] = useState('flights');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const save = event => {
    event.preventDefault();
    if (readOnly) return;
    try {
      const booking = validateBooking(kind, { ...Object.fromEntries(new FormData(event.currentTarget)), id: editing?.id });
      const entries = bookings[kind] || [];
      if (!editing && entries.length >= 100) throw new Error('BOOKING_LIMIT');
      onChange({ ...bookings, [kind]: editing ? entries.map(entry => entry.id === editing.id ? booking : entry) : [...entries, booking] });
      setEditing(null);
      setError('');
      event.currentTarget.reset();
    } catch { setError(t('bookingInvalid')); }
  };
  return (
    <section aria-label={t('bookings')} style={{ color: 'var(--dark)', fontSize: '14px', lineHeight: 1.6, minWidth: 0 }}>
      <h2 style={{ fontSize: '18px', margin: '0 0 16px', fontWeight: 700 }}>{t('bookings')}</h2>
      <div role="tablist" aria-label={t('bookings')} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {Object.keys(BOOKING_FIELDS).map(tab => <button key={tab} role="tab" type="button" aria-selected={kind === tab} style={ACTION_STYLE} className={`btn btn-sm ${kind === tab ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setKind(tab); setEditing(null); setError(''); }}>{t(tab)}</button>)}
      </div>
      {(bookings[kind] || []).map(booking => (
        <article key={booking.id} style={{ borderBottom: '1px solid var(--border)', padding: '16px 0', overflowWrap: 'anywhere' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 12px' }}>{booking.name}</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px 24px', margin: 0 }}>
            {BOOKING_FIELDS[kind].filter(([field]) => field !== 'name').map(([field, label]) => <div key={field} style={{ minWidth: 0 }}><dt style={{ fontSize: '12px', color: 'var(--muted)' }}>{t(label)}</dt><dd style={{ margin: '4px 0 0' }}>{booking[field]}</dd></div>)}
            {booking.confirmationCode && <div><dt style={{ fontSize: '12px', color: 'var(--muted)' }}>{t('confirmationCode')}</dt><dd style={{ margin: '4px 0 0' }}>{booking.confirmationCode}</dd></div>}
          </dl>
          {!readOnly && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="btn btn-ghost btn-sm" style={ACTION_STYLE} aria-label={`${t('editBooking')} ${booking.name}`} onClick={() => { setEditing(booking); setError(''); }}>{t('editBooking')}</button>
            <button type="button" className="btn btn-ghost btn-sm" style={ACTION_STYLE} aria-label={`${t('deleteBooking')} ${booking.name}`} onClick={() => onChange({ ...bookings, [kind]: bookings[kind].filter(entry => entry.id !== booking.id) })}>{t('deleteBooking')}</button>
          </div>}
        </article>
      ))}
      {!readOnly && <form onSubmit={save} key={`${kind}-${editing?.id || 'new'}`} style={{ display: 'grid', gap: '16px', marginTop: '24px', background: 'var(--card)', padding: '16px', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
          {BOOKING_FIELDS[kind].map(([field, label, type]) => <label key={field} style={FIELD_STYLE}>{t(label)}
            <input className="form-input" name={field} type={type} required={field !== 'address'} maxLength={200} defaultValue={editing?.[field] || ''} style={INPUT_STYLE} />
          </label>)}
          <label style={FIELD_STYLE}>{t('confirmationCode')}<input className="form-input" name="confirmationCode" maxLength={200} defaultValue={editing?.confirmationCode || ''} style={INPUT_STYLE} /></label>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>{t('bookingPrivacy')}</p>
        {error && <p role="alert" style={{ margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button type="submit" className="btn btn-primary btn-sm" style={ACTION_STYLE}>{editing ? t('saveDetails') : t('addBooking')}</button>
          {editing && <button type="button" className="btn btn-ghost btn-sm" style={ACTION_STYLE} onClick={() => setEditing(null)}>{t('cancel')}</button>}
        </div>
      </form>}
    </section>
  );
}