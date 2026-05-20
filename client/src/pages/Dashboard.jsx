import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService, candidateService } from '../services/api';
import MyExams from './MyExams';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    candidates: 0,
    activeExams: 0,
    questions: 0,
    results: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await dashboardService.getStats();
        if (res.data) {
          setStats(res.data.stats || { candidates: 0, activeExams: 0, questions: 0, results: 0 });
          setActivities(res.data.activities || []);
        }
      } catch (err) {
        console.error("Failed to load control dashboard stats:", err);
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

  if (user?.role === 'candidate') {
    return (
      <div className="space-y-6">
        {/* ── Simple and Direct Roster Listing ─────────────────────────────────── */}
        <MyExams hideHeader={true} />
      </div>
    );
  }

  // ── Admin / Officer Control View ───────────────────────────────────────
  const [candidateForm, setCandidateForm] = useState({
    armyNumber: '',
    name: '',
    rank: 'Sapper',
    unit: '21 Engr Regt',
    trade: 'Field Engineer',
    password: 'Password@123'
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleQuickAddCandidate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!candidateForm.armyNumber || !candidateForm.name) {
      setFormError('Service Number and Full Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      await candidateService.createCandidate(candidateForm);
      setFormSuccess(`Sapper ${candidateForm.name} added to roster!`);
      // Reset form
      setCandidateForm({
        armyNumber: '',
        name: '',
        rank: 'Sapper',
        unit: '21 Engr Regt',
        trade: 'Field Engineer',
        password: 'Password@123'
      });
      // Refresh Stats count immediately
      const res = await dashboardService.getStats();
      if (res.data) {
        setStats(res.data.stats || { candidates: 0, activeExams: 0, questions: 0, results: 0 });
        setActivities(res.data.activities || []);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register candidate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Dynamic Statistics Control Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            value: stats.candidates, 
            label: "Total Candidates", 
            color: "#2980b9", 
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-900/30",
            desc: "ENROLLED ROSTER USERS",
            icon: "👥",
            link: "/candidates"
          },
          { 
            value: stats.activeExams, 
            label: "Active Exams", 
            color: "#e74c3c", 
            bgColor: "bg-rose-500/10",
            borderColor: "border-rose-900/30",
            desc: "LIVE SCHEDULED EXAMS",
            icon: "📝",
            link: "/exams"
          },
          { 
            value: stats.questions, 
            label: "Question Pool", 
            color: "#d4830a", 
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-900/30",
            desc: "ACTIVE BANK QUESTIONS",
            icon: "📚",
            link: "/questions"
          },
          { 
            value: stats.results, 
            label: "Evaluations Completed", 
            color: "#7c3aed", 
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-900/30",
            desc: "SUBMITTED RESULT SHEETS",
            icon: "📊",
            link: "/results"
          }
        ].map((stat, i) => (
          <button 
            key={i} 
            onClick={() => navigate(stat.link)}
            className="bg-sf border border-br rounded-md p-5 text-left relative overflow-hidden group hover:border-am/40 transition-all duration-300 w-full focus:outline-none"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: stat.color }}></div>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-hd text-[46px] leading-none mb-1 text-kh font-semibold group-hover:text-kh transition-colors">
                  {loading ? "..." : stat.value}
                </div>
                <div className="font-mn text-[11px] text-kh uppercase tracking-[1.5px] font-semibold">{stat.label}</div>
              </div>
              <div className={`w-9 h-9 rounded ${stat.bgColor} flex items-center justify-center text-lg`}>
                {stat.icon}
              </div>
            </div>
            <div className="font-mn text-[9px] text-txd uppercase tracking-[0.5px] mt-3 block">{stat.desc}</div>
          </button>
        ))}
      </div>

      {/* ── Two-Column Simplified Workspace Grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Roster Actions (Increase Candidate Count Form) */}
        <div className="bg-sf border border-br rounded-md p-5 flex flex-col justify-between">
          <div>
            <div className="font-hd text-[20px] tracking-[1.5px] text-kh uppercase border-b border-br pb-3 mb-4">
              Quick Candidate Enrollment
            </div>
            <p className="font-mn text-[11.5px] text-txm mb-4 leading-relaxed">
              Use this command form to instantly register new service personnel and **increase your candidate pool**.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded text-[11px] font-semibold font-mn">
                ⚠️ {formError}
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-2.5 bg-green-950/40 text-green-400 border border-green-900/40 rounded text-[11px] font-semibold font-mn">
                ✓ {formSuccess}
              </div>
            )}

            <form onSubmit={handleQuickAddCandidate} className="space-y-3 font-mn text-[12px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[9.5px]">Service / Army No *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.armyNumber}
                    onChange={(e) => setCandidateForm({ ...candidateForm, armyNumber: e.target.value })}
                    placeholder="e.g. 1559822W"
                    className="form-input bg-sf w-full h-[38px] py-1 px-2.5 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[9.5px]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    placeholder="e.g. sprinkler name"
                    className="form-input bg-sf w-full h-[38px] py-1 px-2.5 text-[12.5px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[9.5px]">Rank *</label>
                  <select
                    value={candidateForm.rank}
                    onChange={(e) => setCandidateForm({ ...candidateForm, rank: e.target.value })}
                    className="form-input bg-sf w-full h-[38px] py-1 px-2.5 text-[12.5px]"
                  >
                    <option value="Sapper">Sapper</option>
                    <option value="Lance Naik">Lance Naik</option>
                    <option value="Naik">Naik</option>
                    <option value="Havildar">Havildar</option>
                    <option value="Naib Subedar">Naib Subedar</option>
                    <option value="Subedar">Subedar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[9.5px]">Unit *</label>
                  <select
                    value={candidateForm.unit}
                    onChange={(e) => setCandidateForm({ ...candidateForm, unit: e.target.value })}
                    className="form-input bg-sf w-full h-[38px] py-1 px-2.5 text-[12.5px]"
                  >
                    <option value="21 Engr Regt">21 Engr Regt</option>
                    <option value="22 Engr Regt">22 Engr Regt</option>
                    <option value="HQ BEG">HQ BEG</option>
                    <option value="A Coy">A Coy</option>
                    <option value="B Coy">B Coy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[9.5px]">Specialist Trade</label>
                  <input
                    type="text"
                    value={candidateForm.trade}
                    onChange={(e) => setCandidateForm({ ...candidateForm, trade: e.target.value })}
                    className="form-input bg-sf w-full h-[38px] py-1 px-2.5 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[9.5px]">Default Password</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.password}
                    onChange={(e) => setCandidateForm({ ...candidateForm, password: e.target.value })}
                    className="form-input bg-sf w-full h-[38px] py-1 px-2.5 text-[12.5px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 w-full rounded font-mn text-[12px] font-bold tracking-[1.5px] uppercase mt-4"
              >
                {submitting ? 'PROCESSING...' : '✓ INCREASE CANDIDATE ROSTER'}
              </button>
            </form>
          </div>
        </div>

        {/* Command Live Activity log timeline */}
        <div className="bg-sf border border-br rounded-md p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-br">
              <div className="font-hd text-[20px] tracking-[1.5px] text-kh uppercase">Command Live Activity</div>
            </div>
            
            {loading ? (
              <div className="text-center py-12 font-mn text-txm">Gathering active log lines...</div>
            ) : activities.length === 0 ? (
              <div className="text-[13px] text-txm text-center py-12 font-mn">
                No recent logs recorded.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                {activities.slice(0, 6).map((act, i) => (
                  <div key={i} className="flex items-start space-x-3 border-b border-br/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="bg-am/10 text-am border border-am/20 rounded p-1 font-mn text-[9px] uppercase tracking-[0.5px] mt-0.5 whitespace-nowrap">
                      {formatActivityTime(act.time)}
                    </div>
                    <div>
                      <div className="font-mn text-[12px] text-kh font-semibold leading-relaxed">{act.message}</div>
                      <div className="font-mn text-[9px] text-txd uppercase mt-0.5 tracking-[0.5px]">
                        {act.type === 'submission' ? '⚠️ EVALUATION RESPONSE' : 'ℹ️ CONTROL LOG'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-4 p-2 bg-sf2 border border-br rounded text-center text-[9px] font-mn text-txd tracking-[1px] uppercase">
            🛡️ ALL SYSTEMS SECURED AND RUNNING FULLY LOCAL (OFFLINE)
          </div>
        </div>

      </div>
    </div>
  );
}
