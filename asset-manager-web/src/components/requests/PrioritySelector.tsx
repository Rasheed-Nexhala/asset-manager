import type { RequestPriority } from '../../types/request';
import { Icon } from '../shared/Icon';

interface PrioritySelectorProps {
  value: RequestPriority;
  onChange: (priority: RequestPriority) => void;
  error?: string;
}

const priorities: Array<{
  value: RequestPriority;
  label: string;
  color: string;
  icon: 'exclamation-circle' | 'minus-circle' | 'check-circle';
}> = [
  { value: 'high', label: 'High', color: 'text-red-600 border-red-600', icon: 'exclamation-circle' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600 border-amber-600', icon: 'minus-circle' },
  { value: 'low', label: 'Low', color: 'text-green-600 border-green-600', icon: 'check-circle' },
];

export function PrioritySelector({ value, onChange, error }: PrioritySelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[15px] font-medium text-slate-900">
        Priority <span className="text-red-600">*</span>
      </label>
      <div className="flex gap-3">
        {priorities.map((priority) => {
          const isSelected = value === priority.value;
          return (
            <button
              key={priority.value}
              type="button"
              onClick={() => onChange(priority.value)}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-lg border-[1.5px] transition-colors ${
                isSelected
                  ? `${priority.color} bg-white`
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
              aria-pressed={isSelected}
              aria-label={`Priority: ${priority.label}`}
            >
              <Icon name={priority.icon} className="h-5 w-5" />
              <span className="text-[15px] font-semibold">{priority.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
