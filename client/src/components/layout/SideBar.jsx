import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { id: "dashboard", path: "/", icon: "⊞", label: "Dashboard", roles: ["super_admin", "exam_officer", "candidate"] },
  { id: "user-accounts", path: "/user-accounts", icon: "◈", label: "User Accounts", roles: ["super_admin"] },
  { id: "candidates", path: "/candidates", icon: "◉", label: "Candidates", roles: ["super_admin", "exam_officer"] },
  { id: "questions", path: "/questions", icon: "◧", label: "Question Bank", roles: ["super_admin", "exam_officer"] },
  { id: "exams", path: "/exams", icon: "◫", label: "Examinations", roles: ["super_admin", "exam_officer"] },
  { id: "results", path: "/results", icon: "◻", label: "Results", roles: ["super_admin", "exam_officer"] },
  { id: "myexams", path: "/my-exams", icon: "◈", label: "My Exams", roles: ["candidate"] },
];

export default function SideBar() {
  const { user, logout } = useAuth();
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div className="w-[220px] flex flex-col shrink-0 border-r select-none"
      style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', height: 'calc(100vh - 68px)' }}>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-3 pt-4">
        <p className="text-[9px] font-bold uppercase tracking-[2.5px] px-3 mb-3"
          style={{ color: 'var(--tx-mute)' }}>Navigation</p>
        <div className="flex flex-col gap-0.5">
          {visibleItems.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[13px] font-semibold tracking-wide transition-all duration-200 border ${isActive
                  ? 'border-[rgba(201,162,39,0.4)] text-[#c9a227]'
                  : 'border-transparent hover:border-[rgba(201,162,39,0.15)] hover:text-[#c9a227]'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(201,162,39,0.1)' : 'transparent',
                color: isActive ? 'var(--gold)' : 'var(--tx-dim)',
              })}
            >
              <span className="text-[16px] leading-none w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t mt-auto" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-widest border transition-all duration-200 cursor-pointer"
          style={{ color: 'var(--tx-mute)', borderColor: 'var(--border)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244,63,94,0.5)'; e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244,63,94,0.07)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--tx-mute)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <span>⏻</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
