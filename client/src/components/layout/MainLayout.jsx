import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import SideBar from './SideBar';

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 68px)' }}>
        <SideBar />
        <main className="flex-1 p-6 overflow-y-auto" style={{ background: 'var(--bg-2)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
