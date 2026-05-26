import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/CandidateLogin';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import Exams from './pages/Exams';
import ExamPortal from './pages/ExamPortal';
import MyExams from './pages/MyExams';
import Questions from './pages/Questions';
import Results from './pages/Results';
import UserAccounts from './pages/UserAccounts';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function LoginRoute({ defaultRole = 'candidate' }) {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.role === 'candidate' ? '/my-exams' : '/'} replace />;
  }

  return <Login defaultRole={defaultRole} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute defaultRole="candidate" />} />
          <Route path="/candidate-login" element={<LoginRoute defaultRole="candidate" />} />
          <Route path="/officer-login" element={<LoginRoute defaultRole="exam_officer" />} />
          <Route path="/admin-login" element={<LoginRoute defaultRole="super_admin" />} />
          <Route
            path="/exam-session/:examId"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <ExamPortal />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="candidates"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
                  <Candidates />
                </ProtectedRoute>
              }
            />
            <Route
              path="exams"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
                  <Exams />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-exams"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <MyExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="questions"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
                  <Questions />
                </ProtectedRoute>
              }
            />
            <Route
              path="results"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'exam_officer']}>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route
              path="user-accounts"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <UserAccounts />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
