import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
} from '../../store/selectors/maintenanceSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Maintenance } from '../../types/maintenance';

type TabType = 'active' | 'history';

export function MaintenancePage() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);

  const activeRecords = useAppSelector(selectActiveMaintenanceRecords);
  const historyRecords = useAppSelector(selectMaintenanceHistory);
  const loading = useAppSelector(selectMaintenanceLoading);
  const stats = useAppSelector(selectMaintenanceStats);

  const displayedRecords = activeTab === 'active' ? activeRecords : historyRecords;
  const hasNoData = activeRecords.length === 0 && historyRecords.length === 0;

  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = subscribeToMaintenance((records) => {
      dispatch(setMaintenanceRecords(records));
    });
    return () => unsubscribe();
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

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
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] text-slate-500">Written Off</p>
          <p className="mt-1 text-[24px] font-bold text-red-600">{stats.writtenOff}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex-1 border-b-2 py-3 text-center text-[15px] font-semibold ${
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
          onClick={() => setActiveTab('history')}
          className={`flex-1 border-b-2 py-3 text-center text-[15px] font-semibold ${
            activeTab === 'history'
              ? 'border-blue-800 text-blue-800'
              : 'border-transparent text-slate-500'
          }`}
          aria-pressed={activeTab === 'history'}
        >
          History ({historyRecords.length})
        </button>
      </div>

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
          ) : (
            <>
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Icon name="archive-box" className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-[22px] font-semibold text-slate-900">No Maintenance History</h2>
              <p className="mt-2 text-center text-[15px] text-slate-500">
                Completed maintenance records will appear here
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
                    Qty
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                    Issue Type
                  </th>
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
                  const issueLabels: Record<string, string> = {
                    motor_electrical: 'Motor/Electrical',
                    physical_damage: 'Physical Damage',
                    wear_and_tear: 'Wear and Tear',
                    missing_parts: 'Missing Parts',
                    other: 'Other',
                  };
                  const addedStr = new Date(record.addedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
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
                      <td className="px-6 py-4 text-[15px] text-slate-600 font-mono text-xs">{record.itemSku}</td>
                      <td className="px-6 py-4 text-[15px] text-slate-700">
                        {record.quantity} {record.unit || 'Pcs'}
                      </td>
                      <td className="px-6 py-4 text-[15px] text-slate-700">
                        {issueLabels[record.issueType] || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <MaintenanceStatusBadge status={record.status} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-500">{addedStr}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/maintenance/${record.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-800 px-4 py-2 text-[14px] font-semibold text-white hover:bg-blue-900 shadow-sm transition-all"
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
