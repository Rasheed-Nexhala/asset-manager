import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { MaintenanceStatusBadge } from '../../components/maintenance';
import {
  setSelectedMaintenance,
  updateMaintenanceInState,
  clearError,
} from '../../store/slices/maintenanceSlice';
import { selectMaintenanceById, selectMaintenanceError } from '../../store/selectors/maintenanceSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectIsAdminOrSuperAdmin,
  selectIsStoreIncharge,
} from '../../store/selectors/authSelectors';
import { selectCanStoreInchargeMaintenanceWriteOff } from '../../store/selectors/inventoryUpdateRequestSelectors';
import { subscribeToMaintenanceById } from '../../services/firebase/maintenanceService';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { getDisplayWrittenOffUnits } from '../../utils/maintenanceWriteOffDisplay';
import type {
  MaintenanceStatus,
  IssueType,
  WriteOffReason,
  MaintenancePhoto,
} from '../../types/maintenance';

const issueTypeLabels: Record<IssueType, string> = {
  motor_electrical: 'Motor/Electrical',
  physical_damage: 'Physical Damage',
  wear_and_tear: 'Wear and Tear',
  missing_parts: 'Missing Parts',
  other: 'Other',
};

const writeOffReasonLabels: Record<WriteOffReason, string> = {
  beyond_repair: 'Beyond Repair',
  high_repair_cost: 'High Repair Cost',
  obsolete: 'Obsolete',
  lost_stolen: 'Lost/Stolen',
  other: 'Other',
};

const statusConfig: Record<
  MaintenanceStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: 'bg-amber-600/15', text: 'text-amber-600', label: 'Pending' },
  partial_return: {
    bg: 'bg-purple-600/15',
    text: 'text-purple-600',
    label: 'Partial Return',
  },
  returned: { bg: 'bg-green-600/15', text: 'text-green-600', label: 'Returned' },
  written_off: { bg: 'bg-red-600/15', text: 'text-red-600', label: 'Written Off' },
  partially_returned_and_written_off: {
    bg: 'bg-slate-600/15',
    text: 'text-slate-600',
    label: 'Partial Return & Written Off',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PhotoThumbnail({
  photo,
  onPress,
}: {
  photo: MaintenancePhoto;
  onPress?: (url: string) => void;
}) {
  const [error, setError] = useState(false);
  const uri = photo?.url?.trim();

  if (!uri) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-slate-100">
        <Icon name="photo" className="h-8 w-8 text-slate-400" />
        <p className="mt-1 text-[11px] text-slate-500">No image</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-32 w-32 flex-col items-center justify-center rounded-lg bg-slate-100">
        <Icon name="exclamation-circle" className="h-8 w-8 text-slate-400" />
        <p className="mt-1 text-[11px] text-slate-500">Failed to load</p>
      </div>
    );
  }

  const content = (
    <img
      src={uri}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setError(true)}
    />
  );

  return (
    <div className="h-32 w-32 overflow-hidden rounded-lg bg-slate-100">
      {onPress ? (
        <button
          type="button"
          onClick={() => onPress(uri)}
          className="h-full w-full"
          aria-label="View full size photo"
        >
          {content}
        </button>
      ) : (
        content
      )}
    </div>
  );
}

export function MaintenanceDetailPage() {
  const { maintenanceId } = useParams<{ maintenanceId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const canWriteOffAccess = useAppSelector(selectCanStoreInchargeMaintenanceWriteOff);
  const showWriteOffAction =
    isAdminOrSuperAdmin || (isStoreIncharge && canWriteOffAccess);

  const maintenance = useAppSelector((state) =>
    maintenanceId ? selectMaintenanceById(maintenanceId)(state) : null
  );
  const error = useAppSelector(selectMaintenanceError);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!maintenanceId) return;
    const unsubscribe = subscribeToMaintenanceById(maintenanceId, (record) => {
      if (record) {
        dispatch(setSelectedMaintenance(record));
        dispatch(updateMaintenanceInState(record));
      } else {
        dispatch(setSelectedMaintenance(null));
      }
    });
    return () => {
      unsubscribe();
      dispatch(setSelectedMaintenance(null));
    };
  }, [dispatch, maintenanceId]);

  useAutoClearError(error, () => dispatch(clearError()));

  const handleReturn = useCallback(() => {
    if (maintenanceId) navigate(`/maintenance/${maintenanceId}/return`);
  }, [maintenanceId, navigate]);

  const handleWriteOff = useCallback(() => {
    if (maintenanceId) navigate(`/maintenance/${maintenanceId}/write-off`);
  }, [maintenanceId, navigate]);

  const actionButtons = useMemo(() => {
    if (!maintenance) return null;
    const { status } = maintenance;
    if (status === 'returned' || status === 'written_off' || status === 'partially_returned_and_written_off') return null;
    return (
      <div className="mt-2 mb-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleReturn}
          className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-green-600 text-[15px] font-semibold text-white hover:bg-green-700"
        >
          <Icon name="arrow-uturn-left" className="h-5 w-5" />
          Return to Inventory
        </button>
        {showWriteOffAction && (
          <button
            type="button"
            onClick={handleWriteOff}
            className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-red-600 text-[15px] font-semibold text-white hover:bg-red-700"
          >
            <Icon name="trash" className="h-5 w-5" />
            Write Off
          </button>
        )}
      </div>
    );
  }, [maintenance, handleReturn, handleWriteOff, showWriteOffAction]);

  if (maintenanceId && !maintenance && !error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Maintenance Details</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <LoadingSpinner className="h-10 w-10 text-blue-800" />
          <p className="mt-4 text-[15px] text-slate-500">Loading maintenance record…</p>
        </div>
      </div>
    );
  }

  if (error && !maintenance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Maintenance Details</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Icon name="exclamation-circle" className="h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-[17px] font-semibold text-slate-900">Error Loading Record</h2>
          <p className="mt-2 text-[15px] text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 flex h-[50px] items-center justify-center rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white hover:bg-blue-900"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">Maintenance Details</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Icon name="wrench-screwdriver" className="h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-[17px] font-semibold text-slate-900">Record Not Found</h2>
          <p className="mt-2 text-[15px] text-slate-500">
            This maintenance record doesn&apos;t exist or has been removed.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 flex h-[50px] items-center justify-center rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white hover:bg-blue-900"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusInfo =
    statusConfig[maintenance.status] ?? {
      bg: 'bg-slate-600/15',
      text: 'text-slate-600',
      label: 'Unknown',
    };
  const displayUnit = maintenance.unit || 'Pcs';
  const unitsWrittenOffDisplay = getDisplayWrittenOffUnits(maintenance);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900">Maintenance Details</h1>
      </div>

      <div className="space-y-4 overflow-y-auto">
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-slate-900">Item Information</h2>
            <span className={`rounded-full px-2 py-1 text-[12px] font-medium ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="mt-1 text-[15px] font-semibold text-slate-900">{maintenance.itemName}</p>
          <p className="text-[13px] text-slate-500">SKU: {maintenance.itemSku}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] text-slate-500">
              {unitsWrittenOffDisplay != null ? 'Remaining on line' : 'Quantity in Maintenance'}
            </span>
            <span className="text-[15px] font-semibold text-slate-900">
              {maintenance.quantity} {displayUnit}
            </span>
          </div>
          {unitsWrittenOffDisplay != null ? (
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-[13px] text-slate-500">Units written off</span>
              <span className="text-[15px] font-semibold text-red-700">
                {unitsWrittenOffDisplay} {displayUnit}
              </span>
            </div>
          ) : null}
        </div>

        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-[17px] font-semibold text-slate-900">Issue Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-[13px] text-slate-500">Issue Type</p>
              <p className="text-[15px] text-slate-900">
                {issueTypeLabels[maintenance.issueType]}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-slate-500">Description</p>
              <p className="text-[15px] text-slate-900">
                {maintenance.issueDescription?.trim() || 'No description'}
              </p>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-slate-500">Reported By</span>
              <span className="text-[15px] text-slate-900">{maintenance.reportedByName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px] text-slate-500">Reported On</span>
              <span className="text-[15px] text-slate-900">{formatDate(maintenance.addedAt)}</span>
            </div>
          </div>
        </div>

        {maintenance.photos && maintenance.photos.length > 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[17px] font-semibold text-slate-900">Photos</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {maintenance.photos.map((photo, i) => (
                <PhotoThumbnail
                  key={`${photo.fileName}-${i}`}
                  photo={photo}
                  onPress={(url) => setExpandedPhotoUrl(url)}
                />
              ))}
            </div>
          </div>
        )}

        {expandedPhotoUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setExpandedPhotoUrl(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Escape' && setExpandedPhotoUrl(null)}
          >
            <img
              src={expandedPhotoUrl}
              alt=""
              className="max-h-[80vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setExpandedPhotoUrl(null)}
              className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white"
              aria-label="Close"
            >
              <Icon name="x-mark" className="h-7 w-7" />
            </button>
          </div>
        )}

        {(maintenance.status === 'returned' || maintenance.status === 'partially_returned_and_written_off') && (
          <div className="rounded-[10px] border border-green-600/30 bg-green-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="arrow-uturn-left" className="h-5 w-5 text-green-600" />
              <h2 className="text-[17px] font-semibold text-slate-900">Return Information</h2>
            </div>
            <div className="space-y-3">
              {maintenance.returnedQuantity && (
                <div className="flex justify-between">
                  <span className="text-[13px] text-slate-500">Returned Quantity</span>
                  <span className="text-[15px] text-slate-900">
                    {maintenance.returnedQuantity} {displayUnit}
                  </span>
                </div>
              )}
              {maintenance.repairSummary && (
                <div>
                  <p className="text-[13px] text-slate-500">Repair Summary</p>
                  <p className="text-[15px] text-slate-900">{maintenance.repairSummary}</p>
                </div>
              )}
              {maintenance.repairCost != null && (
                <div className="flex justify-between">
                  <span className="text-[13px] text-slate-500">Repair Cost</span>
                  <span className="text-[15px] text-slate-900">
                    ₹{maintenance.repairCost.toLocaleString()}
                  </span>
                </div>
              )}
              {maintenance.repairedBy && (
                <div className="flex justify-between">
                  <span className="text-[13px] text-slate-500">Repaired By</span>
                  <span className="text-[15px] text-slate-900">{maintenance.repairedBy}</span>
                </div>
              )}
              {maintenance.returnedAt && (
                <div className="flex justify-between">
                  <span className="text-[13px] text-slate-500">Returned On</span>
                  <span className="text-[15px] text-slate-900">
                    {formatDate(maintenance.returnedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {(maintenance.status === 'written_off' || maintenance.status === 'partially_returned_and_written_off') && (
          <div className="rounded-[10px] border border-red-600/30 bg-red-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="x-circle" className="h-5 w-5 text-red-600" />
              <h2 className="text-[17px] font-semibold text-slate-900">Write-Off Information</h2>
            </div>
            <div className="space-y-3">
              {maintenance.writeOffReason && (
                <div>
                  <p className="text-[13px] text-slate-500">Reason</p>
                  <p className="text-[15px] text-slate-900">
                    {writeOffReasonLabels[maintenance.writeOffReason]}
                  </p>
                </div>
              )}
              {maintenance.writeOffExplanation && (
                <div>
                  <p className="text-[13px] text-slate-500">Explanation</p>
                  <p className="text-[15px] text-slate-900">{maintenance.writeOffExplanation}</p>
                </div>
              )}
              {maintenance.writtenOffAt && (
                <div className="flex justify-between">
                  <span className="text-[13px] text-slate-500">Written Off On</span>
                  <span className="text-[15px] text-slate-900">
                    {formatDate(maintenance.writtenOffAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {maintenance.updates && maintenance.updates.length > 0 && (
          <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[17px] font-semibold text-slate-900">Status Updates</h2>
            <div className="space-y-3">
              {maintenance.updates.map((update, i) => (
                <div
                  key={i}
                  className={`pb-3 ${
                    i < maintenance.updates!.length - 1 ? 'border-b border-slate-200' : ''
                  }`}
                >
                  <div className="mb-1 flex justify-between">
                    <span className="text-[15px] font-medium text-slate-900">
                      {update.addedByName}
                    </span>
                    <span className="text-[13px] text-slate-500">
                      {formatDate(
                        typeof update.addedAt === 'string'
                          ? update.addedAt
                          : new Date().toISOString()
                      )}
                    </span>
                  </div>
                  <p className="text-[15px] text-slate-900">{update.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {actionButtons}
      </div>
    </div>
  );
}
