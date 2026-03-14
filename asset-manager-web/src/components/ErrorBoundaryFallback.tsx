/**
 * Error Boundary Fallback UI
 *
 * CIAMS-styled error screen shown when an Error Boundary catches a render error.
 * Uses design system colors, typography, and touch targets.
 */

import { Icon } from './shared/Icon';

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorBoundaryFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Icon - Danger/critical semantic color */}
          <div className="mb-6 rounded-full bg-red-600/15 p-4">
            <Icon
              name="exclamation-triangle"
              className="w-16 h-16 text-red-600"
              aria-hidden
            />
          </div>

          {/* Title - Screen title typography */}
          <h1 className="text-[22px] font-semibold text-slate-900 text-center mb-2">
            Something went wrong
          </h1>

          {/* Description - Body/caption */}
          <p className="text-[15px] text-slate-500 text-center mb-4">
            An unexpected error occurred. Please try again.
          </p>

          {/* Error details - Collapsible for dev/debug */}
          <div className="w-full max-h-32 mb-6 overflow-y-auto">
            <div className="bg-white rounded-[10px] p-4 border border-slate-200">
              <p className="text-[13px] text-slate-500 font-medium mb-1.5">
                Error details
              </p>
              <p className="text-[13px] text-slate-900 break-words select-text">
                {error?.message ?? 'Unknown error'}
              </p>
            </div>
          </div>

          {/* Primary action - Try again */}
          <button
            type="button"
            onClick={resetError}
            className="bg-blue-800 hover:bg-blue-900 rounded-[10px] min-h-[50px] min-w-[48px] px-8 flex items-center justify-center transition-colors"
            aria-label="Try again"
          >
            <span className="text-[15px] font-semibold text-white">
              Try Again
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
