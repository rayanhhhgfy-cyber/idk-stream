"use client";

export default function LoadingSpinner({ size = 36, message }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: `${size}px`, height: `${size}px`,
          border: '3px solid rgba(229,9,20,0.2)',
          borderTopColor: '#e50914',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: message ? '0 auto 12px' : '0 auto',
        }} />
        {message && <p style={{ color: '#666', fontSize: '0.85rem' }}>{message}</p>}
      </div>
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
