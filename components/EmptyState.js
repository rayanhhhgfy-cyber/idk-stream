"use client";

export default function EmptyState({ icon: Icon, title, subtitle, iconColor = '#333', iconBg = 'rgba(255,255,255,0.04)' }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#555' }}>
      {Icon && (
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: iconBg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Icon style={{ width: 36, height: 36, color: iconColor }} />
        </div>
      )}
      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</p>
      {subtitle && <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>{subtitle}</p>}
    </div>
  );
}
