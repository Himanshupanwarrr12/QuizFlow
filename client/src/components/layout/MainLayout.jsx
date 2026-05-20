import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import SideBar from './SideBar';
import { useAuth } from '../../context/AuthContext';

export default function MainLayout() {
  const { user } = useAuth();
  const isCandidate = user?.role === 'candidate';

  return (
    <div className={`flex flex-col min-h-screen ${isCandidate ? 'bg-[#f8fafc]' : ''}`}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 76px)' }}>
        <SideBar />
        <main className={`flex-1 p-6 overflow-y-auto ${isCandidate ? 'bg-[#f8fafc]' : 'bg-bg'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
