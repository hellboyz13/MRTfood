'use client';

interface ModeToggleProps {
  mode: 'curated' | 'popular';
  onModeChange: (mode: 'curated' | 'popular') => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div
      className="relative flex bg-[#F5F3F0]"
      style={{
        gap: 'clamp(4px, 1vw, 8px)',
        padding: 'clamp(3px, 0.5vw, 4px)',
        borderRadius: 'clamp(6px, 2vw, 10px)',
      }}
    >
      {/* Sliding background indicator */}
      <div
        className="absolute bg-white shadow-sm transition-all duration-300 ease-out"
        style={{
          top: 'clamp(3px, 0.5vw, 4px)',
          bottom: 'clamp(3px, 0.5vw, 4px)',
          left: mode === 'popular'
            ? 'clamp(3px, 0.5vw, 4px)'
            : 'calc(50% + clamp(2px, 0.25vw, 4px))',
          width: 'calc(50% - clamp(5px, 0.75vw, 8px))',
          borderRadius: 'clamp(5px, 1.5vw, 8px)',
        }}
      />

      <button
        onClick={() => onModeChange('popular')}
        className={`relative z-10 flex-1 font-medium min-h-[44px] flex items-center justify-center transition-colors duration-200 ${
          mode === 'popular'
            ? 'text-[#2D2D2D]'
            : 'text-[#757575] hover:text-[#2D2D2D]'
        }`}
        style={{
          paddingLeft: 'clamp(10px, 3vw, 14px)',
          paddingRight: 'clamp(10px, 3vw, 14px)',
          paddingTop: 'clamp(8px, 2vw, 10px)',
          paddingBottom: 'clamp(8px, 2vw, 10px)',
          fontSize: 'clamp(13px, 3.5vw, 14px)',
          borderRadius: 'clamp(5px, 1.5vw, 8px)',
        }}
      >
        🧭 Explore
      </button>
      <button
        onClick={() => onModeChange('curated')}
        className={`relative z-10 flex-1 font-medium min-h-[44px] flex items-center justify-center transition-colors duration-200 ${
          mode === 'curated'
            ? 'text-[#2D2D2D]'
            : 'text-[#757575] hover:text-[#2D2D2D]'
        }`}
        style={{
          paddingLeft: 'clamp(10px, 3vw, 14px)',
          paddingRight: 'clamp(10px, 3vw, 14px)',
          paddingTop: 'clamp(8px, 2vw, 10px)',
          paddingBottom: 'clamp(8px, 2vw, 10px)',
          fontSize: 'clamp(13px, 3.5vw, 14px)',
          borderRadius: 'clamp(5px, 1.5vw, 8px)',
        }}
      >
        ⭐ Featured
      </button>
    </div>
  );
}
