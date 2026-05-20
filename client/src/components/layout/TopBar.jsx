import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();

  const ROLE_LABELS = {
    super_admin: "Super Admin",
    exam_officer: "Exam Officer",
    candidate: "Candidate",
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin': 
        return 'bg-gradient-to-r from-am to-amb text-oldd border border-am/20 shadow-sm shadow-am/5';
      case 'exam_officer': 
        return 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/40';
      case 'candidate': 
        return 'bg-blue-950/40 text-blue-400 border border-blue-900/40';
      default: 
        return 'bg-sf2 text-txd border border-br/40';
    }
  };

  return (
    <div className="bg-sf/90 backdrop-blur-md border-b border-br/60 px-6 h-[76px] flex items-center justify-between sticky top-0 z-50 shadow-lg shadow-black/10">
      <div className="flex items-center gap-4 group">
        <div 
          className="w-12 h-12 bg-gradient-to-br from-am to-amb flex items-center justify-center font-hd text-[16px] text-oldd font-extrabold shrink-0 transition-transform duration-300 group-hover:scale-105 cursor-pointer shadow-lg shadow-am/10" 
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        >
          BEG
        </div>
        <div className="flex flex-col justify-center">
          <div className="font-hd text-[28px] tracking-[4px] bg-gradient-to-r from-kh via-khl to-kh bg-clip-text text-transparent leading-none select-none font-bold">
            ONTEST
          </div>
          <div className="font-mn text-[9px] text-txd mt-1 tracking-[1.5px] uppercase leading-none select-none opacity-80">
            BEG & CENTRE ROORKEE · HQ UB AREA
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3.5 bg-sf/40 border border-br/40 rounded-lg px-4 py-2 font-mn text-[12px] text-kh shadow-inner backdrop-blur-sm">
          <span className={`px-2.5 py-0.5 rounded text-[9.5px] font-bold tracking-[1px] uppercase border ${getRoleBadgeClass(user?.role)}`}>
            {ROLE_LABELS[user?.role] || user?.role}
          </span>
          <span className="font-semibold text-khl">{user?.rank} {user?.name}</span>
          {user?.unit && (
            <span className="text-txm text-[10.5px] font-medium border-l border-br/60 pl-2.5">
              {user.unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
