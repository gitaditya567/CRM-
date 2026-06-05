import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ThemeProvider from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import "./App.css";

// 🚀 Lazy Load Pages for Speed
const Login = lazy(() => import("./pages/Login"));
const Permissions = lazy(() => import("./pages/Permissions"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SearchProduct = lazy(() => import("./pages/SearchProduct"));
const UploadExcel = lazy(() => import("./pages/UploadExcel"));
const CreateStaff = lazy(() => import("./pages/CreateStaff"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const ProductHistory = lazy(() => import("./pages/ProductHistory"));
const TeamInspire = lazy(() => import("./pages/Leads"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientSupport = lazy(() => import("./pages/ClientSupport"));
const POManagement = lazy(() => import("./pages/POManagement"));

const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));

const GlobalLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
    <p className="mt-4 text-sm font-black uppercase tracking-widest text-gray-400 animate-pulse">Loading TeamInspire...</p>
  </div>
);


import DashboardLayout from "./components/layout/DashboardLayout";
import SecurityAlerts from "./components/common/SecurityAlerts";

// 🔐 Protected Route
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  ) : <Navigate to="/" />;
};

// 👑 Admin Route
const AdminRoute = ({ children }) => {
  const role = localStorage.getItem("role")?.toLowerCase();
  return (role === "admin" || role === "superadmin") ? children : <Navigate to="/dashboard" />;
};

const App = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <SecurityAlerts />
        <Router>
          <Suspense fallback={<GlobalLoader />}>
            <Routes>
              {/* Login */}
              <Route path="/" element={<Login />} />

              {/* Permissions ✅ */}
              <Route
                path="/permissions"
                element={
                  <PrivateRoute>
                    <AdminRoute>
                      <Permissions />
                    </AdminRoute>
                  </PrivateRoute>
                }
              />

              {/* Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />

              {/* Sales Specific Dashboard */}
              <Route
                path="/sales-dashboard"
                element={
                  <PrivateRoute>
                    <SalesDashboard />
                  </PrivateRoute>
                }
              />

              {/* Search Product */}
              <Route
                path="/search"
                element={
                  <PrivateRoute>
                    <SearchProduct />
                  </PrivateRoute>
                }
              />

              {/* Upload Excel (Admin Only) */}
              <Route
                path="/upload"
                element={
                  <PrivateRoute>
                    <AdminRoute>
                      <UploadExcel />
                    </AdminRoute>
                  </PrivateRoute>
                }
              />

              {/* Create Staff (Admin Only) ✅ */}
              <Route
                path="/create-staff"
                element={
                  <PrivateRoute>
                    <AdminRoute>
                      <CreateStaff />
                    </AdminRoute>
                  </PrivateRoute>
                }
              />

              {/* Add Product */}
              <Route
                path="/add-product"
                element={
                  <PrivateRoute>
                    <AddProduct />
                  </PrivateRoute>
                }
              />

              {/* Edit Product */}
              <Route
                path="/edit-product/:id"
                element={
                  <PrivateRoute>
                    <AddProduct />
                  </PrivateRoute>
                }
              />

              {/* Product History / Manage */}
              <Route
                path="/product-history"
                element={
                  <PrivateRoute>
                    <AdminRoute>
                      <ProductHistory />
                    </AdminRoute>
                  </PrivateRoute>
                }
              />

              {/* Clients & Groups */}
              <Route
                path="/clients"
                element={
                  <PrivateRoute>
                    <Clients />
                  </PrivateRoute>
                }
              />

              {/* Lead Generation */}
              <Route
                path="/leads"
                element={
                  <PrivateRoute>
                    <TeamInspire />
                  </PrivateRoute>
                }
              />

              {/* Client Support */}
              <Route
                path="/client-support"
                element={
                  <PrivateRoute>
                    <ClientSupport />
                  </PrivateRoute>
                }
              />

              {/* PO Management */}
              <Route
                path="/po-management"
                element={
                  <PrivateRoute>
                    <POManagement />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;
