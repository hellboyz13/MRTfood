/**
 * Unified Icon Components
 *
 * All icons use consistent:
 * - viewBox: "0 0 24 24" (standard)
 * - Colors: currentColor (inherits from parent)
 * - Sizing: w-5 h-5 by default, customizable via className
 * - strokeWidth: 2 (for stroke-based icons)
 */

import { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const defaultProps: SVGProps<SVGSVGElement> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

// X / Close icon
export function IconClose({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Chevron Left (for back/collapse)
export function IconChevronLeft({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// Chevron Down (for expand/scroll indicator)
export function IconChevronDown({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      fill="currentColor"
      stroke="none"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Search / Magnifier icon
export function IconSearch({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

// Info circle icon
export function IconInfo({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// Back arrow (left arrow)
export function IconBack({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// Reset / Refresh icon
export function IconReset({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// Location pin icon
export function IconLocation({ className = 'w-5 h-5', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Loading spinner
export function IconSpinner({ className = 'w-5 h-5 animate-spin', size, ...props }: IconProps) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Star icon (for ratings)
export function IconStar({ className = 'w-4 h-4', size, filled = true, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? 0 : 1.5}
      {...props}
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

// Image placeholder icon
export function IconImage({ className = 'w-8 h-8', size, ...props }: IconProps) {
  return (
    <svg
      {...defaultProps}
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// Instagram icon
export function IconInstagram({ className = 'w-4 h-4', size, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
