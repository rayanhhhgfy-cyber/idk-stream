"use client";

export default function PageContainer({ children, maxWidth = '1200px' }) {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '0 24px' }}>
        {children}
      </div>
    </div>
  );
}
