import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import Exams from './pages/Exams';
import Results from './pages/Results';
import Candidates from './pages/Candidates';
import MyExams from './pages/MyExams';
import UserAccounts from './pages/UserAccounts';

// Placeholder components for routes
const Placeholder = ({ title }) => (
  <div>
    <div className="mb-6">
      <div className="font-hd text-[34px] tracking-[3px] text-kh leading-none">{title.toUpperCase()}</div>
      <div className="font-mn text-[10px] text-txd mt-1">MODULE UNDER DEVELOPMENT</div>
    </div>
    <div className="bg-sf border border-br rounded-md p-8 text-center font-mn text-txm">
      This module is currently being implemented.
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Redirect if already logged in
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="user-accounts" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <UserAccounts />
          </ProtectedRoute>
        } />
        <Route path="candidates" element={
          <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
            <Candidates />
          </ProtectedRoute>
        } />
        <Route path="questions" element={
          <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
            <Questions />
          </ProtectedRoute>
        } />
        <Route path="exams" element={
          <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
            <Exams />
          </ProtectedRoute>
        } />

        <Route path="results" element={
          <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
            <Results />
          </ProtectedRoute>
        } />
        <Route path="my-exams" element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <MyExams />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
