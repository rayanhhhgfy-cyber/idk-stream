"use client";
import { SlidersHorizontal } from 'lucide-react';

const SELECT_STYLE = {
  background: 'rgba(255,255,255,0.06)', color: 'white',
  border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px',
  borderRadius: '10px', fontSize: '0.85rem', outline: 'none',
  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%23888\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11L3 6h10z\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  paddingRight: '36px', minWidth: '140px', transition: 'all 0.25s',
};

export function getActiveSelectStyle(isActive) {
  return {
    ...SELECT_STYLE,
    ...(isActive ? {
      borderColor: 'rgba(229,9,20,0.5)',
      background: 'rgba(229,9,20,0.08)',
    } : {}),
  };
}

export default function FilterBar({ children }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px',
      padding: '16px 20px', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(10px)', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.85rem', fontWeight: 600, marginRight: '8px' }}>
        <SlidersHorizontal style={{ width: 16, height: 16, color: '#e50914' }} /> Filters
      </div>
      {children}
    </div>
  );
}

export function ClearFiltersButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)',
        color: '#e50914', padding: '10px 16px', borderRadius: '10px',
        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s',
      }}
    >
      Clear All
    </button>
  );
}
