import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import SetPassword from './pages/auth/SetPassword';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ClientDashboard from './pages/dashboard/ClientDashboard';
import ClientManagement from './pages/admin/ClientManagement';
import AgreementViewer from './pages/agreements/AgreementViewer';
import InvoiceModule from './pages/invoices/InvoiceModule';
import PaymentModule from './pages/payments/PaymentModule';
import ProjectDashboard from './pages/projects/ProjectDashboard';
import MilestoneModule from './pages/milestones/MilestoneModule';
import ReviewModule from './pages/reviews/ReviewModule';
import ActivityTimeline from './pages/dashboard/ActivityTimeline';
import NotificationCenter from './pages/notifications/NotificationCenter';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Root → redirect to login if not logged in, else dashboard */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected Dashboard Routes — token nahi to /login pe redirect */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="clients" element={<ClientManagement />} />
          <Route path="agreements" element={<AgreementViewer />} />
          <Route path="invoices" element={<InvoiceModule />} />
          <Route path="payments" element={<PaymentModule />} />
          <Route path="projects" element={<ProjectDashboard />} />
          <Route path="milestones" element={<MilestoneModule />} />
          <Route path="reviews" element={<ReviewModule />} />
          <Route path="timeline" element={<ActivityTimeline />} />
          <Route path="notifications" element={<NotificationCenter />} />
          <Route path="client/dashboard" element={<ClientDashboard />} />
        </Route>

        {/* Any unknown route → login page */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

