import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import SignUp from "./components/pages/SignUp";
import Login from "./components/pages/Login";
import Home from "./components/pages/Home";
import Dashboard from "./components/pages/Dashboard";
import Inbox from "./components/pages/Inbox";
import AdminDashboard from "./components/pages/AdminDashboard";

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignUp />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <Inbox />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
