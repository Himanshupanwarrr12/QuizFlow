import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import SideBar from './SideBar';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 72px)' }}>
        <SideBar />
        <main className="flex-1 p-6 overflow-y-auto bg-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
