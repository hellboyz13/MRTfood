'use client';

import { useState, useEffect, useRef, useCallback, ReactNode, forwardRef, useImperativeHandle } from 'react';
import { PinchAnimation } from './PinchAnimation';

interface TourStep {
  target: string;
  content: ReactNode;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface OnboardingRef {
  restart: () => void;
}

const steps: TourStep[] = [
  {
    target: '[data-tour="station"]',
    content: 'Tap on any MRT station to discover curated food recommendations from Eatbook, SethLui, Michelin, and more!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="map"]',
    content: (
      <div className="flex flex-col items-center gap-2">
        <p>Pinch or scroll to zoom in and out of the map</p>
        <PinchAnimation />
      </div>
    ),
    placement: 'center',
  },
  {
    target: '[data-tour="search"]',
    content: 'Search by restaurant name or cuisine — try "pasta", "ramen", or "chicken rice"',
    placement: 'top',
  },
  {
    target: '[data-tour="filter"]',
    content: 'Filter by Desserts or Supper spots!',
    placement: 'top',
  },
  {
    target: '[data-tour="map"]',
    content: (
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-xl">⚠️</span>
        <p><strong>Heads up!</strong> Some shops may have closed or changed their hours. Please check before visiting!</p>
      </div>
    ),
    placement: 'center',
  },
];

const Onboarding = forwardRef<OnboardingRef>(function Onboarding(_, ref) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [spotlightPosition, setSpotlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePositions = useCallback(() => {
    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8;
      const tooltipWidth = 280;
      const tooltipHeight = step.placement === 'center' ? 180 : 140;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 16;

      // Update spotlight position
      setSpotlightPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      let tooltipTop = 0;
      let tooltipLeft = 0;
      let arrowLeft = '50%';
      let arrowTransform = 'translateX(-50%)';

      const targetCenterX = rect.left + rect.width / 2;
      const targetCenterY = rect.top + rect.height / 2;

      switch (step.placement) {
        case 'top':
          tooltipTop = rect.top - tooltipHeight - 16;
          tooltipLeft = targetCenterX - tooltipWidth / 2;
          break;
        case 'bottom':
          tooltipTop = rect.bottom + 16;
          tooltipLeft = targetCenterX - tooltipWidth / 2;
          break;
        case 'left':
          tooltipLeft = rect.left - tooltipWidth - 16;
          tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
        case 'right':
          tooltipLeft = rect.right + 16;
          tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
        case 'center':
          tooltipTop = viewportHeight / 2 - tooltipHeight / 2;
          tooltipLeft = viewportWidth / 2 - tooltipWidth / 2;
          break;
      }

      // Ensure tooltip stays within viewport horizontally
      if (tooltipLeft < margin) {
        tooltipLeft = margin;
        const arrowOffset = targetCenterX - margin;
        arrowLeft = `${Math.max(20, Math.min(tooltipWidth - 20, arrowOffset))}px`;
        arrowTransform = 'translateX(-50%)';
      } else if (tooltipLeft + tooltipWidth > viewportWidth - margin) {
        tooltipLeft = viewportWidth - tooltipWidth - margin;
        const arrowOffset = targetCenterX - tooltipLeft;
        arrowLeft = `${Math.max(20, Math.min(tooltipWidth - 20, arrowOffset))}px`;
        arrowTransform = 'translateX(-50%)';
      }

      // Ensure tooltip stays within viewport vertically
      if (tooltipTop < margin) {
        tooltipTop = margin;
      } else if (tooltipTop + tooltipHeight > viewportHeight - margin) {
        tooltipTop = viewportHeight - tooltipHeight - margin;
      }

      setTooltipStyle({
        top: tooltipTop,
        left: tooltipLeft,
        width: tooltipWidth,
      });

      setArrowStyle({
        left: arrowLeft,
        transform: arrowTransform,
      });
    }
  }, [currentStep]);

  // Expose restart function via ref
  useImperativeHandle(ref, () => ({
    restart: () => {
      setCurrentStep(0);
      setIsVisible(true);
    },
  }));

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mrtfoodie-tour-v2');

    if (!hasSeenTour) {
      setTimeout(() => {
        setIsVisible(true);
      }, 1500);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      updatePositions();
      window.addEventListener('resize', updatePositions);
      window.addEventListener('scroll', updatePositions);
      return () => {
        window.removeEventListener('resize', updatePositions);
        window.removeEventListener('scroll', updatePositions);
      };
    }
  }, [currentStep, isVisible, updatePositions]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('mrtfoodie-tour-v2', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const currentPlacement = steps[currentStep].placement;
  const isCenter = currentPlacement === 'center';

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {/* Dark overlay */}
        {isCenter ? (
          <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" />
        ) : (
          <div
            className="absolute inset-0 bg-black/60 transition-[clip-path] duration-300 ease-out"
            style={{
              clipPath: `polygon(
                0% 0%,
                0% 100%,
                ${spotlightPosition.left}px 100%,
                ${spotlightPosition.left}px ${spotlightPosition.top}px,
                ${spotlightPosition.left + spotlightPosition.width}px ${spotlightPosition.top}px,
                ${spotlightPosition.left + spotlightPosition.width}px ${spotlightPosition.top + spotlightPosition.height}px,
                ${spotlightPosition.left}px ${spotlightPosition.top + spotlightPosition.height}px,
                ${spotlightPosition.left}px 100%,
                100% 100%,
                100% 0%
              )`,
            }}
          />
        )}

        {/* Spotlight border - only show for non-center placements */}
        {!isCenter && (
          <div
            className="absolute border-2 border-[#FF6B4A] rounded-xl transition-all duration-300 ease-out"
            style={{
              top: spotlightPosition.top,
              left: spotlightPosition.left,
              width: spotlightPosition.width,
              height: spotlightPosition.height,
              boxShadow: '0 0 0 4px rgba(255, 107, 74, 0.3)',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] pointer-events-auto transition-all duration-300 ease-out"
        style={tooltipStyle}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-[#E0DCD7] p-4 relative">
          {/* Arrow pointing up (for bottom placement) */}
          {currentPlacement === 'bottom' && (
            <div
              className="absolute -top-3"
              style={{ left: arrowStyle.left, transform: arrowStyle.transform }}
            >
              <svg width="20" height="12" viewBox="0 0 20 12" className="drop-shadow-sm">
                <path d="M10 0L20 12H0L10 0Z" fill="white" stroke="#E0DCD7" strokeWidth="1" />
                <path d="M10 2L17 12H3L10 2Z" fill="white" />
              </svg>
            </div>
          )}
          {/* Arrow pointing down (for top placement) */}
          {currentPlacement === 'top' && (
            <div
              className="absolute -bottom-3"
              style={{ left: arrowStyle.left, transform: arrowStyle.transform }}
            >
              <svg width="20" height="12" viewBox="0 0 20 12" className="drop-shadow-sm">
                <path d="M10 12L0 0H20L10 12Z" fill="white" stroke="#E0DCD7" strokeWidth="1" />
                <path d="M10 10L3 0H17L10 10Z" fill="white" />
              </svg>
            </div>
          )}

          {/* Content */}
          <div className="text-[#2D2D2D] text-sm mb-4 leading-relaxed">
            {steps[currentStep].content}
          </div>

          {/* Progress and buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-[#FF6B4A]' : 'bg-[#E0DCD7]'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 text-sm text-[#757575] hover:text-[#2D2D2D] transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-[#FF6B4A] text-white text-sm font-semibold rounded-lg hover:bg-[#E55A3A] transition-colors"
              >
                {currentStep < steps.length - 1 ? 'Next' : 'Got it!'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Click blocker except for tooltip */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={handleSkip}
      />
    </>
  );
});

export default Onboarding;
