import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeAssignmentsByRequestId } from '../../services/firebase/vehicleFuelAssignmentService';
import type { VehicleFuelAssignment } from '../../types/vehicleFuelAssignment';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';

type Props = {
  requestId: string;
};

export function VehicleFuelAllocationsSection({ requestId }: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VehicleFuelAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAssignmentsByRequestId(requestId, (list) => {
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, [requestId]);

  if (loading) {
    return (
      <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <div
          className="flex min-h-[120px] flex-col items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white p-8"
          role="status"
          aria-busy="true"
          aria-label="Loading fuel dispensed to vehicles"
        >
          <LoadingSpinner size="md" className="border-slate-200 border-t-[#1E40AF]" />
          <p className="mt-3 text-[13px] text-[#64748B]">Loading fuel dispensed…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#D97706]/15 px-2 py-1 text-[12px] font-medium text-[#D97706]">
            Fleet
          </span>
          <h3 className="text-[17px] font-semibold text-[#0F172A]">Fuel to vehicles</h3>
        </div>

        <div className="mb-4 flex gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <Icon name="exclamation-circle" className="mt-0.5 h-5 w-5 shrink-0 text-[#64748B]" />
          <p className="text-[13px] leading-5 text-[#64748B]">
            Dispensed from this request’s fuel lines only. Liters are logged on each vehicle; stock is not returned to
            the central store.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-2 py-8">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9]">
              <Icon name="truck" className="h-9 w-9 text-[#94A3B8]" />
            </div>
            <p className="mb-2 text-center text-[22px] font-semibold text-[#0F172A]">No fuel dispensed yet</p>
            <p className="mb-6 max-w-md text-center text-[15px] leading-6 text-[#64748B]">
              Add vehicles under Vehicles, then dispense fuel from transferred fuel lines on this request.
            </p>
            <div className="flex w-full max-w-md gap-3">
              <button
                type="button"
                onClick={() => navigate('/inventory/vehicles')}
                className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#B45309] px-2 text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
              >
                Vehicles
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory/divide-fuel-to-vehicles')}
                className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#1E40AF] px-2 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#EFF6FF]"
              >
                Dispense fuel
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-[10px] border border-[#E2E8F0] bg-white p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="flex-1 text-[15px] font-semibold text-[#0F172A]">{row.itemName}</span>
                  <span className="shrink-0 text-[15px] font-bold text-amber-700">{row.quantityLiters} L</span>
                </div>
                <div className="flex gap-6 border-b border-[#E2E8F0] pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-[#64748B]">Vehicle</p>
                    <p className="truncate text-[15px] font-medium text-[#0F172A]">{row.vehicleNumber}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#64748B]">When</p>
                    <p className="text-[15px] text-[#0F172A]">
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-[#64748B]">By {row.assignedByName}</p>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="mt-4 flex gap-3 border-t border-[#E2E8F0] pt-4">
            <button
              type="button"
              onClick={() => navigate('/inventory/vehicles')}
              className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#B45309] px-2 text-[15px] font-semibold text-[#B45309] hover:bg-[#B45309]/10"
            >
              Vehicles
            </button>
            <button
              type="button"
              onClick={() => navigate('/inventory/divide-fuel-to-vehicles')}
              className="min-h-[48px] flex-1 rounded-[10px] border-2 border-[#1E40AF] px-2 text-[15px] font-semibold text-[#1E40AF] hover:bg-[#EFF6FF]"
            >
              Dispense more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
