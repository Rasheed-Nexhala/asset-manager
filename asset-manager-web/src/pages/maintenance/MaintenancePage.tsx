import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { MaintenanceCard, MaintenanceStatusBadge } from '../../components/maintenance';
import { subscribeToMaintenance } from '../../services/firebase/maintenanceService';
import { setMaintenanceRecords, setLoading } from '../../store/slices/maintenanceSlice';
import {
  selectActiveMaintenanceRecords,
  selectMaintenanceHistory,
  selectMaintenanceLoading,
  selectMaintenanceStats,
  selectWrittenOffRegisterRecords,
} from '../../store/selectors/maintenanceSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { saveCsvAndShare } from '../../utils/csvExport';
import { buildWrittenOffRegisterCsv } from '../../utils/writtenOffRegisterCsv';
import { getDisplayWrittenOffUnits } from '../../utils/maintenanceWriteOffDisplay';
import type { Maintenance, WriteOffReason } from '../../types/maintenance';

type TabType = 'active' | 'history' | 'writtenOff';

const writeOffReasonLabels: Record<WriteOffReason, string> = {
  beyond_repair: 'Beyond Repair',
  high_repair_cost: 'High Repair Cost',
  obsolete: 'Obsolete',
  lost_stolen: 'Lost/Stolen',
  other: 'Other',
};

function initialTabFromPath(): TabType {
  if (typeof window === 'undefined') return 'active';
  return window.location.pathname === '/maintenance/written-off' ? 'writtenOff' : 'active';
}

export function MaintenancePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(initialTabFromPath);
  const [exportError, setExportError] = useState<string | null>(null);

  const activeRecords = useAppSelector(selectActiveMaintenanceRecords);
  const historyRecords = useAppSelector(selectMaintenanceHistory);
  const writtenOffRegisterRecords = useAppSelector(selectWrittenOffRegisterRecords);
  const loading = useAppSelector(selectMaintenanceLoading);
  const stats = useAppSelector(selectMaintenanceStats);

  const displayedRecords =
    activeTab === 'active'
      ? activeRecords
      : activeTab === 'history'
        ? historyRecords
        : writtenOffRegisterRecords;

  const hasNoData =
    activeRecords.length === 0 && historyRecords.length === 0 && writtenOffRegisterRecords.length === 0;

  useEffect(() => {
    if (location.pathname === '/maintenance/written-off') {
      setActiveTab('writtenOff');
    }
  }, [location.pathname]);

  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = subscribeToMaintenance((records) => {
      dispatch(setMaintenanceRecords(records));
    });
    return () => unsubscribe();
  }, [dispatch]);

  const goToTab = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      setExportError(null);
      if (tab === 'writtenOff') {
        navigate('/maintenance/written-off', { replace: true });
      } else {
        navigate('/maintenance', { replace: true });
      }
    },
    [navigate]
  );

  const handleExportCsv = useCallback(async () => {
    setExportError(null);
    try {
      const csv = buildWrittenOffRegisterCsv(writtenOffRegisterRecords);
      await saveCsvAndShare(csv, 'written-off-register');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to export CSV';
      setExportError(msg);
    }
  }, [writtenOffRegisterRecords]);

  if (loading && hasNoData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold text-slate-900">Maintenance</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <LoadingSpinner className="h-10 w-10 text-blue-800" />
          <p className="mt-4 text-[15px] text-slate-500">Loading maintenance records…</p>
        </div>
      </div>
    );
  }

  const issueLabels: Record<string, string> = {
    motor_electrical: 'Motor/Electrical',
    physical_damage: 'Physical Damage',
    wear_and_tear: 'Wear and Tear',
    missing_parts: 'Missing Parts',
    other: 'Other',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[22px] font-semibold text-slate-900">Maintenance</h1>
        <Link
          to="/maintenance/add"
          className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
        >
          <Icon name="plus" className="h-5 w-5" />
          Add to Maintenance
        </Link>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5">
        <p className="text-center text-[13px] text-sky-800">
          Only non-consumable items can be added to maintenance.
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] text-slate-500">Active</p>
          <p className="mt-1 text-[24px] font-bold text-slate-900">{stats.active}</p>
        </div>
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] text-slate-500">Pending</p>
          <p className="mt-1 text-[24px] font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] text-slate-500">Returned</p>
          <p className="mt-1 text-[24px] font-bold text-green-600">
            {historyRecords.filter((r) => r.status === 'returned').length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => goToTab('writtenOff')}
          className="rounded-[10px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-red-200 hover:bg-red-50/30"
          aria-label="View written-off register"
        >
          <p className="text-[13px] text-slate-500">Written Off</p>
          <p className="mt-1 text-[24px] font-bold text-red-600">{stats.writtenOff}</p>
          <p className="mt-1 text-[12px] font-medium text-red-700">Tap to open register</p>
        </button>
      </div>

      {/* Tab Bar — min ~48px touch targets */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => goToTab('active')}
          className={`min-h-12 flex-1 border-b-2 py-3 text-center text-[15px] font-semibold ${
            activeTab === 'active'
              ? 'border-blue-800 text-blue-800'
              : 'border-transparent text-slate-500'
          }`}
          aria-pressed={activeTab === 'active'}
        >
          Active ({activeRecords.length})
        </button>
        <button
          type="button"
          onClick={() => goToTab('history')}
          className={`min-h-12 flex-1 border-b-2 py-3 text-center text-[15px] font-semibold ${
            activeTab === 'history'
              ? 'border-blue-800 text-blue-800'
              : 'border-transparent text-slate-500'
          }`}
          aria-pressed={activeTab === 'history'}
        >
          History ({historyRecords.length})
        </button>
        <button
          type="button"
          onClick={() => goToTab('writtenOff')}
          className={`min-h-12 flex-1 border-b-2 py-3 text-center text-[15px] font-semibold ${
            activeTab === 'writtenOff'
              ? 'border-blue-800 text-blue-800'
              : 'border-transparent text-slate-500'
          }`}
          aria-pressed={activeTab === 'writtenOff'}
        >
          Written off ({writtenOffRegisterRecords.length})
        </button>
      </div>

      {activeTab === 'writtenOff' && writtenOffRegisterRecords.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-[50px] min-h-[48px] items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-blue-800 px-6 text-[15px] font-semibold text-blue-800 transition-colors hover:bg-blue-50"
          >
            <Icon name="arrow-down-tray" className="h-5 w-5" />
            Export register as CSV
          </button>
          {exportError ? (
            <p className="text-[13px] text-red-600" role="alert">
              {exportError}
            </p>
          ) : null}
        </div>
      )}

      {/* Content */}
      {displayedRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          {activeTab === 'active' ? (
            <>
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Icon name="wrench-screwdriver" className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-[22px] font-semibold text-slate-900">No Active Maintenance</h2>
              <p className="mt-2 text-center text-[15px] text-slate-500">
                Items sent for repair or maintenance will appear here
              </p>
              <Link
                to="/maintenance/add"
                className="mt-6 inline-flex h-[50px] items-center justify-center rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white hover:bg-blue-900"
              >
                Add to Maintenance
              </Link>
            </>
          ) : activeTab === 'history' ? (
            <>
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Icon name="archive-box" className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-[22px] font-semibold text-slate-900">No Maintenance History</h2>
              <p className="mt-2 text-center text-[15px] text-slate-500">
                Completed maintenance records will appear here
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Icon name="document-text" className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-[22px] font-semibold text-slate-900">No Written-Off Records</h2>
              <p className="mt-2 max-w-md text-center text-[15px] text-slate-500">
                Items permanently written off from maintenance appear here for your disposal register.
                Use the Write off action on a maintenance record when equipment cannot return to stock.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                    {activeTab === 'writtenOff' ? 'Units written off' : 'Qty'}
                  </th>
                  {activeTab === 'writtenOff' ? (
                    <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                      Returned
                    </th>
                  ) : null}
                  {activeTab === 'writtenOff' ? (
                    <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                      Write-off date
                    </th>
                  ) : null}
                  {activeTab === 'writtenOff' ? (
                    <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                      Reason
                    </th>
                  ) : null}
                  {activeTab !== 'writtenOff' ? (
                    <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                      Issue Type
                    </th>
                  ) : null}
                  <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRecords.map((record: Maintenance) => {
                  const addedStr = new Date(record.addedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const writtenOffStr = record.writtenOffAt
                    ? new Date(record.writtenOffAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';
                  const reasonLabel = record.writeOffReason
                    ? writeOffReasonLabels[record.writeOffReason] ?? record.writeOffReason
                    : '—';
                  const unitsWrittenOff = getDisplayWrittenOffUnits(record);
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/maintenance/${record.id}`}
                          className="text-[15px] font-semibold text-blue-800 hover:text-blue-900 transition-colors"
                        >
                          {record.itemName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{record.itemSku}</td>
                      <td className="px-6 py-4 text-[15px] text-slate-700">
                        {activeTab === 'writtenOff' ? (
                          <>
                            {unitsWrittenOff != null ? unitsWrittenOff : '—'}{' '}
                            <span className="text-[13px] text-slate-500">
                              {record.unit || 'Pcs'}
                            </span>
                          </>
                        ) : (
                          <>
                            {record.quantity} {record.unit || 'Pcs'}
                          </>
                        )}
                      </td>
                      {activeTab === 'writtenOff' ? (
                        <td className="px-6 py-4 text-[15px] text-slate-700">
                          {record.returnedQuantity != null ? record.returnedQuantity : '—'}
                        </td>
                      ) : null}
                      {activeTab === 'writtenOff' ? (
                        <td className="px-6 py-4 text-[13px] text-slate-600">{writtenOffStr}</td>
                      ) : null}
                      {activeTab === 'writtenOff' ? (
                        <td className="max-w-[200px] truncate px-6 py-4 text-[13px] text-slate-700" title={reasonLabel}>
                          {reasonLabel}
                        </td>
                      ) : null}
                      {activeTab !== 'writtenOff' ? (
                        <td className="px-6 py-4 text-[15px] text-slate-700">
                          {issueLabels[record.issueType] || 'Unknown'}
                        </td>
                      ) : null}
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <MaintenanceStatusBadge status={record.status} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-500">{addedStr}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/maintenance/${record.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-800 px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-blue-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {displayedRecords.map((record: Maintenance) => (
              <MaintenanceCard key={record.id} maintenance={record} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
