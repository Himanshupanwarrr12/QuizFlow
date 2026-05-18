import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { id: "dashboard", path: "/", icon: "📊", label: "Dashboard", roles: ["super_admin", "exam_officer", "candidate"] },
  { id: "user-accounts", path: "/user-accounts", icon: "👥", label: "User Accounts", roles: ["super_admin"] },
  { id: "candidates", path: "/candidates", icon: "🎖️", label: "Candidates", roles: ["super_admin", "exam_officer"] },
  { id: "questions", path: "/questions", icon: "📝", label: "Question Bank", roles: ["super_admin", "exam_officer"] },
  { id: "exams", path: "/exams", icon: "📋", label: "Examinations", roles: ["super_admin", "exam_officer"] },
  { id: "monitor", path: "/monitor", icon: "👁️", label: "Live Monitor", roles: ["super_admin", "exam_officer"] },
  { id: "results", path: "/results", icon: "📈", label: "Results", roles: ["super_admin", "exam_officer"] },
  { id: "myexams", path: "/my-exams", icon: "✏️", label: "My Exams", roles: [] },
];

export default function SideBar() {
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div className="w-[220px] bg-sf border-r border-br py-4 shrink-0 overflow-y-auto">
      <div className="font-mn text-[9px] text-txm px-[18px] pt-1.5 pb-1 tracking-[2px] uppercase mb-1">
        Navigation
      </div>
      <div className="flex flex-col">
        {visibleItems.map(item => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-2 px-[18px] py-[9px] cursor-pointer text-[13.5px] font-medium transition-colors border-l-4
              ${isActive 
                ? 'bg-sf2 text-amb border-am' 
                : 'text-txd border-transparent hover:bg-sf2 hover:text-tx'}
            `}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
