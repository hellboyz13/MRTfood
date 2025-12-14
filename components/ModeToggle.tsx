'use client';

interface ModeToggleProps {
  mode: 'curated' | 'popular';
  onModeChange: (mode: 'curated' | 'popular') => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div
      className="flex bg-[#F5F3F0]"
      style={{
        gap: 'clamp(4px, 1vw, 8px)',
        padding: 'clamp(3px, 0.5vw, 4px)',
        borderRadius: 'clamp(6px, 2vw, 10px)',
      }}
    >
      <button
        onClick={() => onModeChange('popular')}
        className={`flex-1 font-medium transition-colors min-h-[44px] flex items-center justify-center ${
          mode === 'popular'
            ? 'bg-white text-[#2D2D2D] shadow-sm'
            : 'text-[#757575] hover:text-[#2D2D2D] active:bg-[#FFF0ED]'
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
        className={`flex-1 font-medium transition-colors min-h-[44px] flex items-center justify-center ${
          mode === 'curated'
            ? 'bg-white text-[#2D2D2D] shadow-sm'
            : 'text-[#757575] hover:text-[#2D2D2D] active:bg-[#FFF0ED]'
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
