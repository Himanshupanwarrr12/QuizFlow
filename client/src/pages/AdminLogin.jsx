import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const [armyNumber, setArmyNumber] = useState('EO0000001');
  const [password, setPassword] = useState('ChangeMe@123');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, logout } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError(''); setSuccess('');
      const loggedInUser = await login(armyNumber, password);
      if (loggedInUser.role === 'candidate') {
        await logout();
        setError('Access denied. Candidate accounts are not permitted on this portal.');
      } else {
        setSuccess('Authentication successful. Loading officer console...');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden select-none forest-theme"
      style={{ background: 'linear-gradient(145deg, #0c1f0c 0%, #0f2a0f 50%, #0a1a0a 100%)' }}>

      <style>{`
        .forest-theme .form-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 6px;
          color: #bcd0aa;
        }
        .forest-theme .form-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 500;
          background: #142010;
          border: 1px solid #2c4a2a;
          color: #e2f0da;
          transition: all 0.2s;
          outline: none;
        }
        .forest-theme .form-input:focus {
          border-color: #5bcb3a;
          box-shadow: 0 0 0 2px rgba(91, 203, 58, 0.2);
          background: #1a2e16;
        }
        .forest-theme .form-input::placeholder {
          color: #5b7352;
          font-weight: 400;
        }
        .forest-theme .alert-error {
          background: #611a1a;
          border-left: 4px solid #e07a5f;
          color: #ffeae5;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .forest-theme .alert-success {
          background: #1f4722;
          border-left: 4px solid #5bcb3a;
          color: #e6f5df;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
      `}</style>

      {/* Minimal ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(91,203,58,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(32,84,32,0.1) 0%, transparent 55%)' }} />

      <div className="relative z-10 w-full max-w-[420px] m-4">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 font-black text-[18px] rounded-2xl mb-4"
            style={{
              background: '#5bcb3a', color: '#0a1a0a',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}>
            BEG
          </div>
          <div className="text-[28px] font-black uppercase tracking-[4px] leading-none mb-1.5" style={{ color: '#5bcb3a' }}>Exam Portal</div>
          <div className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: '#96b285' }}>
            BEG &amp; Centre Roorkee · Secure Examination Portal
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border p-8" style={{ background: '#11200ce6', borderColor: '#2c4728', backdropFilter: 'blur(2px)' }}>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: '#2c4728' }} />
            <span className="text-[9px] font-black uppercase tracking-[3px]" style={{ color: '#bcd0aa' }}>Secure Officer Access</span>
            <div className="flex-1 h-px" style={{ background: '#2c4728' }} />
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}
          {success && <div className="alert-success mb-4">{success}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Army Number / User ID</label>
              <input type="text" className="form-input" value={armyNumber}
                onChange={e => setArmyNumber(e.target.value)} placeholder="e.g. SA0000001" required />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit"
              className="w-full py-3 mt-2 rounded-lg font-black text-[13px] uppercase tracking-widest transition-all cursor-pointer"
              style={{ background: '#5bcb3a', color: '#0c1a08' }}
              onMouseEnter={e => e.currentTarget.style.background = '#74e250'}
              onMouseLeave={e => e.currentTarget.style.background = '#5bcb3a'}>
              Authenticate &amp; Enter
            </button>
          </form>

          {/* Quick demo pre-fill */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: '#2c4728' }}>
            <p className="text-[9px] font-black uppercase tracking-[2px] mb-3 text-center" style={{ color: '#bcd0aa' }}>
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Super Admin', id: 'IC-12345A', pass: 'ChangeMe@123' },
                { label: 'Exam Officer', id: 'EO0000001', pass: 'ChangeMe@123' },
              ].map(acc => (
                <button key={acc.id} type="button"
                  onClick={() => { setArmyNumber(acc.id); setPassword(acc.pass); }}
                  className="p-2.5 rounded-lg border text-center transition-all cursor-pointer"
                  style={{ background: 'rgba(20, 32, 12, 0.8)', borderColor: '#385e30', color: '#d2e8c4' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#5bcb3a'; e.currentTarget.style.background = 'rgba(91, 203, 58, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#385e30'; e.currentTarget.style.background = 'rgba(20, 32, 12, 0.8)'; }}>
                  <span className="block text-[12px] font-bold" style={{ color: '#7ae35a' }}>{acc.label}</span>
                  <span className="font-mono text-[10px]" style={{ color: '#96b285' }}>{acc.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}