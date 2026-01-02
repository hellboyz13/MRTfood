'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#FF6B4A] text-white font-medium rounded-lg hover:bg-[#E55A3A] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
