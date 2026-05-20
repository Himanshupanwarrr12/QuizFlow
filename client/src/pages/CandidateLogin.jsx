import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function CandidateLogin() {
  const [armyNumber, setArmyNumber] = useState('CAND0001');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, logout } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const loggedInUser = await login(armyNumber, password);
      
      // Enforce candidate-only restriction
      if (loggedInUser.role !== 'candidate') {
        await logout();
        setError('Access denied. Authorized candidates only.');
      } else {
        setSuccess('Authentication successful. Accessing exam env...');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 font-sans antialiased">
      <div className="w-full max-w-[420px] mx-auto">
        
        {/* Typographic Header */}
        <h1 className="text-[28px] font-semibold text-[#0a192f] text-center mb-8 font-sans">
          Welcome
        </h1>

        {error && (
          <div className="p-3 mb-5 rounded bg-red-50 border border-red-100 text-red-600 text-[12.5px] font-sans text-center font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-5 rounded bg-green-50 border border-green-100 text-green-600 text-[12.5px] font-sans text-center font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-[13px] font-normal text-slate-500 font-sans">
              User ID
            </label>
            <input 
              type="text" 
              className="block w-full border border-slate-200 rounded-lg px-4 py-3 text-[14px] text-slate-800 placeholder-slate-300 focus:outline-none focus:border-slate-300 bg-white"
              value={armyNumber} 
              onChange={(e) => setArmyNumber(e.target.value)} 
              placeholder="enter your user ID"
              required 
            />
          </div>
          
          <div>
            <label className="block mb-1.5 text-[13px] font-normal text-slate-500 font-sans">
              Password
            </label>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white focus-within:border-slate-300">
              <input 
                type={showPassword ? 'text' : 'password'}
                className="flex-1 px-4 py-3 text-[14px] text-slate-800 placeholder-slate-300 focus:outline-none bg-transparent"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="enter your password"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 border-l border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full py-3 mt-6 bg-[#0c1240] hover:bg-[#121b54] active:bg-[#070b2b] text-white rounded-lg font-semibold text-[14px] transition-colors duration-200 shadow-sm cursor-pointer"
          >
            Sign me In
          </button>
        </form>

        <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-lg">
          <div className="mb-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Fast Login (Demo)</div>
          <div 
            className="cursor-pointer p-3 rounded-md bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-center flex flex-col gap-0.5"
            onClick={() => { setArmyNumber('CAND0001'); setPassword('Password@123'); }}
          >
            <span className="text-[#0a192f] font-semibold text-[13px]">Candidate Demo Account</span>
            <span className="text-[11px] text-slate-500 font-mono">CAND0001</span>
          </div>
        </div>

      </div>
    </div>
  );
}
