import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login({ defaultRole = 'candidate' }) {

  const [armyNumber, setArmyNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [role, setRole] = useState(defaultRole);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const roleConfig = {
    candidate: {
      title: 'Candidate Login',
      subtitle: 'Serve with courage. Access your exam portal account.',
      button: 'Login to Exam Portal',
      success: 'Authentication successful. Accessing exam environment...',
      demoId: 'CAND0001',
      demoPass: 'Password@123',
    },
    exam_officer: {
      title: 'Officer Login',
      subtitle: 'Secure access to examination control console.',
      button: 'Login to Officer Panel',
      success: 'Authentication successful. Loading officer console...',
      demoId: 'EO0000001',
      demoPass: 'ChangeMe@123',
    },
    super_admin: {
      title: 'Admin Login',
      subtitle: 'Administrative secure system access.',
      button: 'Login to Admin Center',
      success: 'Authentication successful. Loading admin console...',
      demoId: 'IC-12345A',
      demoPass: 'ChangeMe@123',
    }
  };

  const currentRole = roleConfig[role];

  useEffect(() => {
    setRole(defaultRole);
    setArmyNumber('');
    setPassword('');
    setError('');
    setSuccess('');
  }, [defaultRole]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const loggedInUser = await login(armyNumber, password);
      if (loggedInUser.role !== role) {
        await logout();
        setError(`Access denied. This account is not authorized for ${role.replace('_', ' ')} access.`);
        return;
      }
      setSuccess(currentRole.success);
      setTimeout(() => {
        if (loggedInUser.role === 'candidate') {
          navigate('/my-exams');
          return;
        }
        navigate('/');
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center md:justify-end px-6 sm:px-16 md:px-24 lg:px-[15%] bg-black">

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{ backgroundImage: `url("/bg3.png")`, backgroundSize: '100% 100%', backgroundPosition: 'center' }}
      />

      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Top Navbar Simulation */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#2c3e50]/90 flex items-center justify-between px-6 border-b border-gray-600/50 backdrop-blur-md">
        <div className="text-white font-bold tracking-wider text-sm">CENTER EXAM PORTAL</div>
        <div className="flex items-center gap-3">
          {/* Role Selectors inside Navbar styling */}
          <div className="flex bg-[#1a252f]/80 p-1 rounded">
            {[
              { label: 'Candidate', value: 'candidate' },
              { label: 'Officer', value: 'exam_officer' },
              { label: 'Admin', value: 'super_admin' }
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setRole(item.value);
                  setArmyNumber('');
                  setPassword('');
                  setError('');
                  setSuccess('');
                }}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${role === item.value ? 'bg-[#f1c40f] text-black' : 'text-gray-300 hover:bg-gray-700'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container for Card & Footer */}
      <div className="relative z-10 w-full max-w-[400px] mt-12 flex flex-col items-center gap-6">

        {/* Login Card */}
        <div className="w-full relative border-[2px] border-[#f1c40f] rounded-lg pt-16 pb-8 px-8 shadow-2xl"
          style={{ background: 'var(--surface)' }}> {/* Lighter military green matching theme */}

          {/* Top Logo Badge (Circular intersecting the top border) */}
          <div className="absolute -top-[45px] left-1/2 -translate-x-1/2 w-[90px] h-[90px] rounded-full border-[2px] border-[#f1c40f] flex items-center justify-center p-2 shadow-lg"
            style={{ background: 'var(--surface)' }}>
            <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[60px] h-[60px]">
              {/* Shield base */}
              <path d="M256 46C131 46 44 94 44 144v146c0 148 108 238 212 244 104-6 212-96 212-244V144c0-50-87-98-212-98z" fill="var(--bg)" stroke="#f1c40f" strokeWidth="24" />
              {/* Inner shield lines */}
              <path d="M256 70l-160 50v120c0 110 80 180 160 190 80-10 160-80 160-190V120l-160-50z" fill="url(#goldGradient)" />
              {/* Laurels/details approximation */}
              <path d="M256 120v220" stroke="var(--bg)" strokeWidth="8" />
              <path d="M150 200h212" stroke="var(--bg)" strokeWidth="8" />
              <path d="M170 250h172" stroke="var(--bg)" strokeWidth="8" />
              <path d="M190 300h132" stroke="var(--bg)" strokeWidth="8" />
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f1c40f" />
                  <stop offset="100%" stopColor="#d4af37" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h2 className="text-[20px] font-bold" style={{ color: '#f1c40f' }}>{currentRole.title}</h2>
            <p className="text-[12px] font-semibold mt-1" style={{ color: '#ffffff' }}>{currentRole.subtitle}</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-2 rounded bg-red-900/50 border border-red-500 text-red-200 text-xs text-center font-semibold shadow-inner">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-2 rounded bg-green-900/50 border border-green-500 text-green-200 text-xs text-center font-semibold shadow-inner">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={armyNumber}
                onChange={(e) => setArmyNumber(e.target.value)}
                placeholder="Army Number"
                required
                className="w-full h-11 px-4 rounded text-[13px] text-white focus:outline-none transition-colors placeholder-[#8c9c93]"
                style={{
                  background: 'var(--bg-2)', // Dark input field
                  border: '1px solid #f1c40f' // Yellow border
                }}
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full h-11 px-4 pr-12 rounded text-[13px] text-white focus:outline-none transition-colors placeholder-[#8c9c93]"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid #f1c40f'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition cursor-pointer text-[#8c9c93] hover:text-[#f1c40f]"
              >
                👁
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-10 rounded font-semibold text-[14px] transition-transform hover:-translate-y-[1px] active:translate-y-0"
                style={{ background: '#f1c40f', color: 'var(--bg)' }}
              >
                {currentRole.button}
              </button>
            </div>
          </form>

          {/* Fast Demo login for the active role */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setArmyNumber(currentRole.demoId);
                setPassword(currentRole.demoPass);
              }}
              className="text-[11px] font-semibold opacity-70 hover:opacity-100 transition-opacity underline underline-offset-2"
              style={{ color: '#f1c40f' }}
            >
              Use Demo Credentials
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
