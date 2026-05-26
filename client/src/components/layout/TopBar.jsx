import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  super_admin:  'Super Admin',
  exam_officer: 'Exam Officer',
  candidate:    'Candidate',
};

export default function TopBar() {
  const { user } = useAuth();

  const roleBadgeStyle = {
    super_admin:  { background: 'rgba(201,162,39,0.15)', color: '#c9a227', border: '1px solid rgba(201,162,39,0.4)' },
    exam_officer: { background: 'rgba(34,197,94,0.1)',   color: '#22c55e',  border: '1px solid rgba(34,197,94,0.3)' },
    candidate:    { background: 'rgba(99,102,241,0.1)',  color: '#818cf8',  border: '1px solid rgba(99,102,241,0.3)' },
  };

  return (
    <header className="h-[68px] flex items-center justify-between px-6 shrink-0 border-b"
      style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', zIndex: 50 }}>

      {/* Left — Branding */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-[13px] flex-shrink-0"
          style={{ background: 'var(--gold)', color: '#0a1a10' }}>
          BEG
        </div>
        <div>
          <div className="text-[14px] font-black uppercase tracking-[2px] leading-none"
            style={{ color: 'var(--gold)' }}>
            ONTEST
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[1.5px] mt-0.5"
            style={{ color: 'var(--tx-mute)' }}>
            BEG & CENTRE ROORKEE
          </div>
        </div>
      </div>

      {/* Right — User Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border"
          style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border)' }}>
          <span className="text-[10px] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded"
            style={roleBadgeStyle[user?.role] || {}}>
            {ROLE_LABELS[user?.role] || user?.role}
          </span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--tx)' }}>
            {user?.rank} {user?.name}
          </span>
          {user?.unit && (
            <span className="text-[11px] border-l pl-3 font-medium"
              style={{ color: 'var(--tx-mute)', borderColor: 'var(--border)' }}>
              {user.unit}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
