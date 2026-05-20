import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { id: "dashboard", path: "/", icon: "📊", label: "Dashboard", roles: ["super_admin", "exam_officer", "candidate"] },
  { id: "user-accounts", path: "/user-accounts", icon: "👥", label: "User Accounts", roles: ["super_admin"] },
  { id: "candidates", path: "/candidates", icon: "🎖️", label: "Candidates", roles: ["super_admin", "exam_officer"] },
  { id: "questions", path: "/questions", icon: "📝", label: "Question Bank", roles: ["super_admin", "exam_officer"] },
  { id: "exams", path: "/exams", icon: "📋", label: "Examinations", roles: ["super_admin", "exam_officer"] },
  { id: "results", path: "/results", icon: "📈", label: "Results", roles: ["super_admin", "exam_officer"] },
  { id: "myexams", path: "/my-exams", icon: "✏️", label: "My Exams", roles: [] },
];

export default function SideBar() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div className="w-[230px] bg-sf/60 backdrop-blur-md border-r border-br/50 py-6 shrink-0 overflow-y-auto flex flex-col justify-between shadow-lg shadow-black/10 select-none">
      <div>
        <div className="flex flex-col gap-1 px-2 pt-2">
          {visibleItems.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer text-[13px] font-mn tracking-[0.5px] uppercase transition-all duration-300 ease-out border-l-2
                ${isActive 
                  ? 'bg-gradient-to-r from-am/15 via-am/5 to-transparent text-kh border-am shadow-md shadow-am/5 translate-x-[2px]' 
                  : 'text-txd border-transparent hover:bg-sf/40 hover:text-khl hover:translate-x-[2px]'}
              `}
            >
              <span className="w-6 h-6 rounded bg-sf/80 border border-br/40 flex items-center justify-center text-[12px] shadow-sm">
                {item.icon}
              </span>
              <span className="font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 border-t border-br/40 mt-auto">
        <button 
          onClick={logout}
          className="w-full bg-sf border border-br/60 text-txd cursor-pointer py-3 rounded-lg font-mn text-[11px] tracking-[1.5px] uppercase transition-all duration-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 hover:shadow-lg hover:shadow-rose-500/5 flex items-center justify-center gap-2 group font-semibold"
        >
          <span className="text-[12px] group-hover:rotate-90 transition-transform duration-300">⏻</span> 
          <span>LOGOUT SYSTEM</span>
        </button>
      </div>
    </div>
  );
}
