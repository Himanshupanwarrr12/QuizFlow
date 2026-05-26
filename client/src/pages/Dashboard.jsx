import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService, candidateService, superAdminService } from '../services/api';
import MyExams from './MyExams';

const G = 'var(--gold)';
const Gdim = 'var(--tx-mute)';

export default function Dashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [stats, setStats]           = useState({ candidates: 0, activeExams: 0, questions: 0, results: 0 });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);

  // Active form tab for Super Admins ('candidate' or 'officer')
  const [activeFormTab, setActiveFormTab] = useState('candidate');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await dashboardService.getStats();
        if (res.data) {
          setStats(res.data.stats    || { candidates: 0, activeExams: 0, questions: 0, results: 0 });
          setActivities(res.data.activities || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatActivityTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* ── Candidate view ── */
  if (user?.role === 'candidate') {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <div className="page-title">My Assessments</div>
          <div className="page-subtitle">Available examinations for your unit</div>
        </div>
        <MyExams hideHeader={true} />
      </div>
    );
  }

  /* ── Admin quick-add forms ── */
  const [candidateForm, setCandidateForm] = useState({
    armyNumber: '', name: '', rank: 'Sapper', unit: '21 Engr Regt',
    trade: 'Field Engineer', password: 'Password@123'
  });
  const [formError,   setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const [officerForm, setOfficerForm] = useState({
    armyNumber: '', name: '', rank: 'Captain', unit: 'HQ BEG',
    trade: 'General Duties', role: 'exam_officer', password: 'Password@123', confirmPassword: 'Password@123'
  });
  const [officerError, setOfficerError] = useState('');
  const [officerSuccess, setOfficerSuccess] = useState('');
  const [officerSubmitting, setOfficerSubmitting] = useState(false);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    if (!candidateForm.armyNumber || !candidateForm.name) {
      setFormError('Service Number and Full Name are required.'); return;
    }
    try {
      setSubmitting(true);
      await candidateService.createCandidate(candidateForm);
      setFormSuccess(`${candidateForm.name} added to roster!`);
      setCandidateForm({ armyNumber: '', name: '', rank: 'Sapper', unit: '21 Engr Regt', trade: 'Field Engineer', password: 'Password@123' });
      const res = await dashboardService.getStats();
      if (res.data) { setStats(res.data.stats || {}); setActivities(res.data.activities || []); }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register candidate.');
    } finally { setSubmitting(false); }
  };

  const handleQuickAddOfficer = async (e) => {
    e.preventDefault();
    setOfficerError(''); setOfficerSuccess('');
    if (!officerForm.armyNumber || !officerForm.name) {
      setOfficerError('Service Number and Full Name are required.'); return;
    }
    try {
      setOfficerSubmitting(true);
      await superAdminService.createUser(officerForm);
      setOfficerSuccess(`${officerForm.name} registered as Exam Officer!`);
      setOfficerForm({
        armyNumber: '', name: '', rank: 'Captain', unit: 'HQ BEG',
        trade: 'General Duties', role: 'exam_officer', password: 'Password@123', confirmPassword: 'Password@123'
      });
      const res = await dashboardService.getStats();
      if (res.data) { setStats(res.data.stats || {}); setActivities(res.data.activities || []); }
    } catch (err) {
      setOfficerError(err.response?.data?.message || 'Failed to register exam officer.');
    } finally { setOfficerSubmitting(false); }
  };

  const statCards = [
    { value: stats.candidates,  label: 'Total Candidates',      sub: 'Enrolled roster users',     color: '#818cf8', link: '/candidates' },
    { value: stats.activeExams, label: 'Active Exams',          sub: 'Live scheduled exams',      color: '#f43f5e', link: '/exams' },
    { 
      value: user?.role === 'super_admin' ? stats.officers : stats.questions,   
      label: user?.role === 'super_admin' ? 'Total Officers' : 'Question Pool',         
      sub: user?.role === 'super_admin' ? 'Command administrators' : 'Active bank questions',     
      color: 'var(--gold)', 
      link: user?.role === 'super_admin' ? '/user-accounts' : '/questions' 
    },
    { value: stats.results,     label: 'Evaluations Completed', sub: 'Submitted result sheets',   color: '#22c55e', link: '/results' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div>
        <div className="page-title">Control Dashboard</div>
        <div className="page-subtitle">Command overview · {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <button key={i} onClick={() => navigate(s.link)}
            className="card text-left relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 cursor-pointer w-full focus:outline-none border-t-2"
            style={{ borderTopColor: s.color }}>
            <div className="text-[40px] font-black leading-none mb-1" style={{ color: s.color }}>
              {loading ? '—' : s.value}
            </div>
            <div className="text-[13px] font-bold" style={{ color: 'var(--tx)' }}>{s.label}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: Gdim }}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* Two-column bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tabbed Quick Enrollment Panel */}
        <div className="card">
          {user?.role === 'super_admin' ? (
            <div className="flex border-b mb-4" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => { setActiveFormTab('candidate'); setFormError(''); setFormSuccess(''); }}
                className={`flex-1 pb-3 text-[14px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 focus:outline-none ${
                  activeFormTab === 'candidate' ? 'text-[var(--gold)] border-[var(--gold)]' : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                Candidate Enrollment
              </button>
              <button
                onClick={() => { setActiveFormTab('officer'); setOfficerError(''); setOfficerSuccess(''); }}
                className={`flex-1 pb-3 text-[14px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 focus:outline-none ${
                  activeFormTab === 'officer' ? 'text-[var(--gold)] border-[var(--gold)]' : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                Register Officer
              </button>
            </div>
          ) : (
            <div className="text-[15px] font-bold uppercase tracking-wide mb-4 pb-3 border-b" style={{ color: G, borderColor: 'var(--border)' }}>
              Quick Candidate Enrollment
            </div>
          )}

          {activeFormTab === 'candidate' || user?.role !== 'super_admin' ? (
            <>
              {formError   && <div className="alert-error">{formError}</div>}
              {formSuccess  && <div className="alert-success">✓ {formSuccess}</div>}
              <form onSubmit={handleQuickAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Service / Army No *</label>
                    <input type="text" required value={candidateForm.armyNumber}
                      onChange={e => setCandidateForm({ ...candidateForm, armyNumber: e.target.value })}
                      placeholder="e.g. 1559822W" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input type="text" required value={candidateForm.name}
                      onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })}
                      placeholder="e.g. Amit Kumar" className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Rank</label>
                    <select value={candidateForm.rank}
                      onChange={e => setCandidateForm({ ...candidateForm, rank: e.target.value })}
                      className="form-input">
                      {['Sapper','Lance Naik','Naik','Havildar','Naib Subedar','Subedar'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Unit</label>
                    <select value={candidateForm.unit}
                      onChange={e => setCandidateForm({ ...candidateForm, unit: e.target.value })}
                      className="form-input">
                      {['21 Engr Regt','22 Engr Regt','HQ BEG','A Coy','B Coy'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Trade</label>
                    <input type="text" value={candidateForm.trade}
                      onChange={e => setCandidateForm({ ...candidateForm, trade: e.target.value })}
                      className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Default Password</label>
                    <input type="text" required value={candidateForm.password}
                      onChange={e => setCandidateForm({ ...candidateForm, password: e.target.value })}
                      className="form-input" />
                  </div>
                </div>
                <button type="submit" disabled={submitting}
                  className="btn btn-primary w-full justify-center py-2.5 mt-2 uppercase tracking-widest text-[12px]">
                  {submitting ? 'Processing...' : '+ Add to Roster'}
                </button>
              </form>
            </>
          ) : (
            <>
              {officerError   && <div className="alert-error">{officerError}</div>}
              {officerSuccess  && <div className="alert-success">✓ {officerSuccess}</div>}
              <form onSubmit={handleQuickAddOfficer} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Service / Army No *</label>
                    <input type="text" required value={officerForm.armyNumber}
                      onChange={e => setOfficerForm({ ...officerForm, armyNumber: e.target.value })}
                      placeholder="e.g. IC-12345A" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input type="text" required value={officerForm.name}
                      onChange={e => setOfficerForm({ ...officerForm, name: e.target.value })}
                      placeholder="e.g. Capt Arjun Kumar" className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Rank</label>
                    <select value={officerForm.rank}
                      onChange={e => setOfficerForm({ ...officerForm, rank: e.target.value })}
                      className="form-input">
                      {['Brigadier','Colonel','Lt Colonel','Major','Captain','Lieutenant','Subedar Major','Subedar'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Unit</label>
                    <select value={officerForm.unit}
                      onChange={e => setOfficerForm({ ...officerForm, unit: e.target.value })}
                      className="form-input">
                      {['HQ BEG','21 Engr Regt','22 Engr Regt','A Coy','B Coy'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Trade Specialist</label>
                    <input type="text" value={officerForm.trade}
                      onChange={e => setOfficerForm({ ...officerForm, trade: e.target.value })}
                      className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Default Password</label>
                    <input type="text" required value={officerForm.password}
                      onChange={e => setOfficerForm({ ...officerForm, password: e.target.value })}
                      className="form-input" />
                  </div>
                </div>
                <button type="submit" disabled={officerSubmitting}
                  className="btn btn-primary w-full justify-center py-2.5 mt-2 uppercase tracking-widest text-[12px]">
                  {officerSubmitting ? 'Processing...' : '+ Register Officer'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Live activity */}
        <div className="card flex flex-col">
          <div className="text-[15px] font-bold uppercase tracking-wide mb-4 pb-3 border-b flex items-center justify-between" style={{ color: G, borderColor: 'var(--border)' }}>
            Live Activity Log
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center py-10 text-[13px]" style={{ color: Gdim }}>Fetching logs...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-10 text-[13px]" style={{ color: Gdim }}>No recent activity recorded.</div>
            ) : (
              activities.slice(0, 6).map((act, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border-l)' }}>
                  <div className="px-2 py-1 rounded text-[10px] font-bold font-mono flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(201,162,39,0.1)', color: G, border: '1px solid rgba(201,162,39,0.2)' }}>
                    {formatActivityTime(act.time)}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: 'var(--tx)' }}>{act.message}</div>
                    <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: Gdim }}>
                      {act.type === 'submission' ? 'Evaluation response' : 'Control log'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-3 border-t text-center text-[10px] font-semibold uppercase tracking-widest" style={{ borderColor: 'var(--border)', color: Gdim }}>
            🛡️ All systems secured · Offline mode active
          </div>
        </div>
      </div>
    </div>
  );
}
