"use client";

export default function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(229,9,20,0.05))',
        border: '1px solid rgba(229,9,20,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 24, height: 24, color: '#e50914' }} />
      </div>
      <div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>{title}</h1>
        {subtitle && <p style={{ color: '#666', fontSize: '0.9rem' }}>{subtitle}</p>}
      </div>
    </div>
  );
}
