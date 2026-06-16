"use client";

export default function LoadMoreButton({ onClick, label = 'Load More' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
      <button
        onClick={onClick}
        style={{
          background: 'linear-gradient(135deg, #e50914, #b20710)',
          color: 'white', border: 'none', padding: '14px 40px',
          borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.3s ease',
          boxShadow: '0 4px 20px rgba(229,9,20,0.3)',
        }}
      >
        {label}
      </button>
    </div>
  );
}
