interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`
        flex-shrink-0
        ${sizeMap[size]}
        rounded-full
        border-slate-200
        border-t-blue-600
        animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}
