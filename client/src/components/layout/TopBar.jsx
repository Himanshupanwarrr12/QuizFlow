import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();

  const ROLE_LABELS = {
    super_admin: "Super Admin",
    exam_officer: "Exam Officer",
    candidate: "Candidate",
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-am text-oldd';
      case 'exam_officer': return 'bg-[#0891b2] text-white';
      case 'candidate': return 'bg-[#2563eb] text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-oldd border-b-2 border-am px-6 h-[72px] flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-am flex items-center justify-center font-hd text-[15px] text-oldd font-bold shrink-0" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
          BEG
        </div>
        <div className="flex flex-col justify-center">
          <div className="font-hd text-[28px] tracking-[4px] text-kh leading-none">ONTEST</div>
          <div className="font-mn text-[10px] text-txd mt-1 tracking-[1.5px] uppercase leading-none">BEG & CENTRE ROORKEE · HQ UB AREA</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-sf2 border border-br rounded px-4 py-2 font-mn text-[12.5px] text-kh">
          <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold tracking-[1px] uppercase ${getRoleBadgeColor(user?.role)}`}>
            {ROLE_LABELS[user?.role] || user?.role}
          </span>
          <span className="font-semibold">{user?.rank} {user?.name}</span>
          {user?.unit && <span className="text-txm text-[11px] opacity-80">· {user.unit}</span>}
        </div>
        <button 
          onClick={logout}
          className="bg-transparent border border-br text-txd cursor-pointer px-4 py-2 rounded font-mn text-[11.5px] tracking-[0.5px] transition-colors hover:border-red-500 hover:text-red-500 flex items-center gap-2"
        >
          <span className="text-[13px]">⏻</span> LOGOUT
        </button>
      </div>
    </div>
  );
}
