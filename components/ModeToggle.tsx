'use client';

interface ModeToggleProps {
  mode: 'curated' | 'popular';
  onModeChange: (mode: 'curated' | 'popular') => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => onModeChange('curated')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'curated'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        ⭐ Curated
      </button>
      <button
        onClick={() => onModeChange('popular')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'popular'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        🍜 Popular
      </button>
    </div>
  );
}
