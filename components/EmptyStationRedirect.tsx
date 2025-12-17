'use client';

import { NearbyStationRedirect } from '@/types/database';

interface EmptyStationRedirectProps {
  currentStationName: string;
  redirect: NearbyStationRedirect;
  onNavigate: (stationId: string) => void;
}

export default function EmptyStationRedirect({
  currentStationName,
  redirect,
  onNavigate,
}: EmptyStationRedirectProps) {
  const { nearbyStationId, nearbyStationName, walkingMinutes, isLRTConnection, mallNames } = redirect;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#E0E0E0] overflow-hidden max-w-sm mx-auto mt-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[#FFF5F2] to-[#FFE8E0] px-6 py-5 text-center border-b border-[#FFD4C4]">
        <div className="text-4xl mb-2">📍</div>
        <h3 className="text-base font-semibold text-[#2D2D2D] leading-tight">
          No food listings at<br />{currentStationName}
        </h3>
      </div>

      {/* Content Section */}
      <div className="px-6 py-5">
        {/* Nearest station */}
        <div className="text-center mb-4">
          <p className="text-sm text-[#757575] mb-1">Nearest food is at</p>
          <p className="text-lg font-bold text-[#FF6B4A]">{nearbyStationName}</p>
        </div>

        {/* Mall names */}
        {mallNames.length > 0 && (
          <div className="bg-[#F5F5F5] rounded-lg px-4 py-3 mb-3">
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0 mt-0.5">🏢</span>
              <div className="text-sm text-[#2D2D2D] leading-relaxed">
                {mallNames.map((mall, index) => (
                  <span key={index}>
                    {mall}
                    {index < mallNames.length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LRT indicator */}
        {isLRTConnection && (
          <div className="flex items-center justify-center gap-2 text-sm text-[#757575] mb-4">
            <span className="text-base">🚇</span>
            <span>LRT connection</span>
          </div>
        )}

        {/* Navigate button */}
        <button
          onClick={() => onNavigate(nearbyStationId)}
          className="w-full bg-[#FF6B4A] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#FF5533] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Go to {nearbyStationName}</span>
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
}
