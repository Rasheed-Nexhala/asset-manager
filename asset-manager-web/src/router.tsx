import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { MyActivityPage } from './pages/MyActivityPage';
import { NotificationCenterPage } from './pages/NotificationCenterPage';
import { InventoryLandingPage } from './pages/inventory/InventoryLandingPage';
import { CentralStoreInventoryPage } from './pages/inventory/CentralStoreInventoryPage';
import { OtherSitesListPage } from './pages/inventory/OtherSitesListPage';
import { OtherSiteInventoryPage } from './pages/inventory/OtherSiteInventoryPage';
import { SiteSupervisorsPage } from './pages/inventory/SiteSupervisorsPage';
import { AllocateItemsToSupervisorsPage } from './pages/inventory/AllocateItemsToSupervisorsPage';
import { SteelMasterPage } from './pages/inventory/SteelMasterPage';
import { ItemDetailPage } from './pages/inventory/ItemDetailPage';
import { ItemActivityHistoryPage } from './pages/inventory/ItemActivityHistoryPage';
import { AddEditItemPage } from './pages/inventory/AddEditItemPage';
import { AddEditCustomItemPage } from './pages/inventory/AddEditCustomItemPage';
import { CategoryManagementPage } from './pages/inventory/CategoryManagementPage';
import { InventoryUpdateRequestsPage } from './pages/inventory/InventoryUpdateRequestsPage';
import { PurchaseOrderListPage } from './pages/purchaseOrder/PurchaseOrderListPage';
import { PurchaseOrderDetailPage } from './pages/purchaseOrder/PurchaseOrderDetailPage';
import { CreatePOPage } from './pages/purchaseOrder/CreatePOPage';
import { ApprovePOPage } from './pages/purchaseOrder/ApprovePOPage';
import { ReceivePOPage } from './pages/purchaseOrder/ReceivePOPage';
import { VendorManagementPage } from './pages/vendor/VendorManagementPage';
import { VendorLedgerPage } from './pages/vendor/VendorLedgerPage';
import {
  RequestQueuePage,
  CreateRequestPage,
  EditRequestPage,
  MyRequestsPage,
  ProcessRequestPage,
  RejectRequestPage,
  ReturnItemsPage,
  CreateSiteTransferPage,
  ConfirmTransferPage,
} from './pages/requests';
import {
  MaintenancePage,
  AddToMaintenancePage,
  MaintenanceDetailPage,
  ReturnFromMaintenancePage,
  WriteOffPage,
} from './pages/maintenance';
import { SitesPage } from './pages/SitesPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { AdminGuard } from './components/auth/AdminGuard';
import { AdminOrStoreInchargeGuard } from './components/auth/AdminOrStoreInchargeGuard';
import { RequestQueueViewGuard } from './components/auth/RequestQueueViewGuard';
import { RequestQueueStaffGuard } from './components/auth/RequestQueueStaffGuard';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'activity',
            element: <AdminGuard />,
            children: [{ index: true, element: <ActivityLogPage /> }],
          },
          {
            path: 'activity/my-activity',
            element: <MyActivityPage />,
          },
          {
            path: 'inventory',
            element: <InventoryLandingPage />,
          },
          {
            path: 'inventory/other-sites',
            element: <OtherSitesListPage />,
          },
          {
            path: 'inventory/other-sites/:siteId',
            element: <OtherSiteInventoryPage />,
          },
          {
            path: 'inventory/site-supervisors',
            element: <SiteSupervisorsPage />,
          },
          {
            path: 'inventory/divide-to-supervisors',
            element: <AllocateItemsToSupervisorsPage />,
          },
          {
            element: <AdminOrStoreInchargeGuard />,
            children: [
              { path: 'inventory/central', element: <CentralStoreInventoryPage /> },
              { path: 'inventory/steel-master', element: <SteelMasterPage /> },
              { path: 'inventory/categories', element: <CategoryManagementPage /> },
              { path: 'inventory/update-requests', element: <InventoryUpdateRequestsPage /> },
              { path: 'inventory/add', element: <AddEditItemPage /> },
              { path: 'inventory/custom/add', element: <AddEditCustomItemPage /> },
              { path: 'inventory/custom/:customItemId/edit', element: <AddEditCustomItemPage /> },
              { path: 'inventory/:itemId/edit', element: <AddEditItemPage /> },
              { path: 'vendors/:vendorId/ledger', element: <VendorLedgerPage /> },
              { path: 'vendors', element: <VendorManagementPage /> },
              { path: 'purchase-orders', element: <PurchaseOrderListPage /> },
              { path: 'purchase-orders/new', element: <CreatePOPage /> },
              { path: 'purchase-orders/:poId', element: <PurchaseOrderDetailPage /> },
              { path: 'purchase-orders/:poId/approve', element: <ApprovePOPage /> },
              { path: 'purchase-orders/:poId/receive', element: <ReceivePOPage /> },
              {
                element: <RequestQueueViewGuard />,
                children: [
                  { path: 'requests/queue', element: <RequestQueuePage /> },
                  {
                    element: <RequestQueueStaffGuard />,
                    children: [
                      { path: 'requests/:requestId/reject', element: <RejectRequestPage /> },
                      {
                        path: 'requests/:requestId/confirm-transfer',
                        element: <ConfirmTransferPage />,
                      },
                    ],
                  },
                ],
              },
              { path: 'maintenance', element: <MaintenancePage /> },
              { path: 'maintenance/add', element: <AddToMaintenancePage /> },
              { path: 'maintenance/written-off', element: <MaintenancePage /> },
              { path: 'maintenance/:maintenanceId', element: <MaintenanceDetailPage /> },
              { path: 'maintenance/:maintenanceId/return', element: <ReturnFromMaintenancePage /> },
              { path: 'maintenance/:maintenanceId/write-off', element: <WriteOffPage /> },
            ],
          },
          {
            path: 'inventory/:itemId/history',
            element: <ItemActivityHistoryPage />,
          },
          {
            path: 'inventory/:itemId',
            element: <ItemDetailPage />,
          },
          {
            path: 'requests/new',
            element: <CreateRequestPage />,
          },
          {
            path: 'requests/:requestId/edit',
            element: <EditRequestPage />,
          },
          {
            path: 'requests/my-requests',
            element: <MyRequestsPage />,
          },
          {
            path: 'requests/transfer/new',
            element: <CreateSiteTransferPage />,
          },
          {
            path: 'requests/:requestId/process',
            element: <ProcessRequestPage />,
          },
          {
            path: 'requests/:requestId/return',
            element: <ReturnItemsPage />,
          },
          {
            element: <AdminGuard />,
            children: [
              { path: 'sites', element: <SitesPage /> },
              { path: 'admin/users', element: <UsersPage /> },
            ],
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'profile/update-password',
            element: <UpdatePasswordPage />,
          },
          {
            path: 'profile/delete-account',
            element: <DeleteAccountPage />,
          },
          {
            path: 'notifications',
            element: <NotificationCenterPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
