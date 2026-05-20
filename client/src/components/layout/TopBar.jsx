import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
  const { user } = useAuth();
  const isCandidate = user?.role === 'candidate';

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
        return 'bg-blue-50 text-blue-600 border-blue-200';
      default: 
        return 'bg-sf2 text-txd border border-br/40';
    }
  };

  if (isCandidate) {
    return (
      <div className="bg-white border-b border-slate-200/80 px-6 h-[76px] flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4 group">
          {/* Glowing Shield Checkmark Icon */}
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/10 transition-transform duration-300 group-hover:scale-105">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-[13px] font-bold text-[#0a192f] tracking-[1.5px] uppercase leading-none select-none font-sans">
              BEG & CENTRE ROORKEE · CANDIDATE PORTAL
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/80 rounded-lg px-4 py-2 font-sans text-[12px] text-slate-600 shadow-sm">
            <span className={`px-2.5 py-0.5 rounded text-[9.5px] font-bold tracking-[1px] uppercase border ${getRoleBadgeClass(user?.role)}`}>
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
            <span className="font-semibold text-slate-700">{user?.rank} {user?.name}</span>
            {user?.unit && (
              <span className="text-slate-400 text-[10.5px] font-medium border-l border-slate-200 pl-2.5">
                {user.unit}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin and Officer Header
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
