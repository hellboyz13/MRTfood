'use client';

export type PanelMode = 'curated' | 'popular' | 'malls';

interface ModeToggleProps {
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  availableModes: PanelMode[];
}

export default function ModeToggle({ mode, onModeChange, availableModes }: ModeToggleProps) {
  // Calculate indicator position and width based on available modes
  const modeCount = availableModes.length;
  const modeIndex = availableModes.indexOf(mode);

  const getIndicatorLeft = () => {
    if (modeCount === 1) return 'clamp(3px, 0.5vw, 4px)';
    const percentage = (modeIndex / modeCount) * 100;
    return `calc(${percentage}% + clamp(1px, 0.17vw, 2px))`;
  };

  const getIndicatorWidth = () => {
    if (modeCount === 1) return 'calc(100% - clamp(6px, 1vw, 8px))';
    return `calc(${100 / modeCount}% - clamp(4px, 0.67vw, 6px))`;
  };

  return (
    <div
      className="relative flex bg-[#F5F3F0]"
      style={{
        gap: 'clamp(2px, 0.5vw, 4px)',
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
          left: getIndicatorLeft(),
          width: getIndicatorWidth(),
          borderRadius: 'clamp(5px, 1.5vw, 8px)',
        }}
      />

      {availableModes.includes('popular') && (
        <button
          onClick={() => onModeChange('popular')}
          className={`relative z-10 flex-1 font-medium min-h-[44px] flex flex-col items-center justify-center transition-colors duration-200 ${
            mode === 'popular'
              ? 'text-[#2D2D2D]'
              : 'text-[#757575] hover:text-[#2D2D2D]'
          }`}
          style={{
            paddingLeft: 'clamp(4px, 1.5vw, 8px)',
            paddingRight: 'clamp(4px, 1.5vw, 8px)',
            paddingTop: 'clamp(6px, 1.5vw, 8px)',
            paddingBottom: 'clamp(6px, 1.5vw, 8px)',
            borderRadius: 'clamp(5px, 1.5vw, 8px)',
          }}
        >
          <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>⭐ Top Rated</span>
          <span
            className={mode === 'popular' ? 'text-[#757575]' : 'text-[#9CA3AF]'}
            style={{ fontSize: 'clamp(9px, 2.2vw, 10px)', marginTop: '2px' }}
          >
            Popular picks
          </span>
        </button>
      )}
      {availableModes.includes('curated') && (
        <button
          onClick={() => onModeChange('curated')}
          className={`relative z-10 flex-1 font-medium min-h-[44px] flex flex-col items-center justify-center transition-colors duration-200 ${
            mode === 'curated'
              ? 'text-[#2D2D2D]'
              : 'text-[#757575] hover:text-[#2D2D2D]'
          }`}
          style={{
            paddingLeft: 'clamp(4px, 1.5vw, 8px)',
            paddingRight: 'clamp(4px, 1.5vw, 8px)',
            paddingTop: 'clamp(6px, 1.5vw, 8px)',
            paddingBottom: 'clamp(6px, 1.5vw, 8px)',
            borderRadius: 'clamp(5px, 1.5vw, 8px)',
          }}
        >
          <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>📖 Guides</span>
          <span
            className={mode === 'curated' ? 'text-[#757575]' : 'text-[#9CA3AF]'}
            style={{ fontSize: 'clamp(9px, 2.2vw, 10px)', marginTop: '2px' }}
          >
            Michelin & blogs
          </span>
        </button>
      )}
      {availableModes.includes('malls') && (
        <button
          onClick={() => onModeChange('malls')}
          className={`relative z-10 flex-1 font-medium min-h-[44px] flex flex-col items-center justify-center transition-colors duration-200 ${
            mode === 'malls'
              ? 'text-[#2D2D2D]'
              : 'text-[#757575] hover:text-[#2D2D2D]'
          }`}
          style={{
            paddingLeft: 'clamp(4px, 1.5vw, 8px)',
            paddingRight: 'clamp(4px, 1.5vw, 8px)',
            paddingTop: 'clamp(6px, 1.5vw, 8px)',
            paddingBottom: 'clamp(6px, 1.5vw, 8px)',
            borderRadius: 'clamp(5px, 1.5vw, 8px)',
          }}
        >
          <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>🏢 Malls</span>
          <span
            className={mode === 'malls' ? 'text-[#757575]' : 'text-[#9CA3AF]'}
            style={{ fontSize: 'clamp(9px, 2.2vw, 10px)', marginTop: '2px' }}
          >
            Nearby malls
          </span>
        </button>
      )}
    </div>
  );
}
