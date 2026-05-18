import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [armyNumber, setArmyNumber] = useState('EO0000001');
  const [password, setPassword] = useState('ChangeMe@123');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await login(armyNumber, password);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-bg">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(74,82,64,0.25)_0%,transparent_60%),radial-gradient(ellipse_at_80%_20%,rgba(212,131,10,0.12)_0%,transparent_50%)]"></div>
      
      <div className="relative z-10 w-full max-w-[420px] bg-sf border border-br border-t-[4px] border-t-am rounded-lg p-11 shadow-2xl backdrop-blur-sm m-4">
        
        <div className="text-center mb-7">
          <div className="w-[66px] h-[66px] mx-auto mb-3.5 bg-am flex items-center justify-center font-hd text-[25px] text-oldd" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            BEG
          </div>
          <div className="font-hd text-[30px] tracking-[4px] text-kh leading-none">ONTEST</div>
          <div className="font-mn text-[10px] text-txd mt-1">BEG & CENTRE ROORKEE · SECURE EXAMINATION PORTAL</div>
        </div>
        
        <div className="relative border-t border-br my-6">
          <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 bg-sf px-2 font-mn text-[8px] text-txm tracking-[2px]">SECURE ACCESS</span>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="form-label">Army Number</label>
            <input 
              type="text" 
              className="form-input"
              value={armyNumber} 
              onChange={(e) => setArmyNumber(e.target.value)} 
              placeholder="e.g. SA0000001"
              required 
            />
          </div>
          
          <div>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary w-full justify-center py-2.5 mt-2">
            AUTHENTICATE & ENTER
          </button>
        </form>

        <div className="mt-5 p-3 bg-sf2 border border-br rounded font-mn text-[10px] text-txm">
          <div className="mb-2"><strong className="text-kh">Quick Demo Logic (Click to Pre-fill):</strong></div>
          <div className="grid grid-cols-3 gap-1.5">
            <div 
              className="cursor-pointer p-1.5 rounded bg-sf border border-br hover:border-am transition-colors text-center"
              onClick={() => { setArmyNumber('IC-12345A'); setPassword('ChangeMe@123'); }}
            >
              <span className="text-kh font-semibold block text-[10.5px]">Super Admin</span>
              <span className="text-[9px] opacity-80">IC-12345A</span>
            </div>
            <div 
              className="cursor-pointer p-1.5 rounded bg-sf border border-br hover:border-am transition-colors text-center"
              onClick={() => { setArmyNumber('EO0000001'); setPassword('ChangeMe@123'); }}
            >
              <span className="text-kh font-semibold block text-[10.5px]">Exam Officer</span>
              <span className="text-[9px] opacity-80">EO0000001</span>
            </div>
            <div 
              className="cursor-pointer p-1.5 rounded bg-sf border border-br hover:border-am transition-colors text-center"
              onClick={() => { setArmyNumber('CAND0001'); setPassword('Password@123'); }}
            >
              <span className="text-kh font-semibold block text-[10.5px] truncate">Candidate (Himanshu)</span>
              <span className="text-[9px] opacity-80">CAND0001</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
