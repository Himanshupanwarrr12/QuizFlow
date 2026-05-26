import { useState, useEffect } from 'react';
import { candidateService } from '../services/api';

const UNITS = ['HQ BEG','21 Engr Regt','22 Engr Regt','A Coy','B Coy','C Coy','HQ Coy','Support Coy','Field Coy','Workshop','Signals Platoon'];
const RANKS = ['Spr','L/Nk','Nk','Hav','Sub','Maj','Capt'];
const DEFAULT_FORM = { armyNumber: '', rank: 'Spr', name: '', unit: '21 Engr Regt', trade: 'Field Engineer', password: 'Password@123' };

const G   = 'var(--gold)';
const Dim = 'var(--tx-mute)';

export default function Candidates() {
  const [candidates,   setCandidates]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [formData,     setFormData]     = useState(DEFAULT_FORM);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await candidateService.getCandidates({ search: searchQuery });
      setCandidates(res.data?.candidates || []);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCandidates(); }, [searchQuery]);

  const handleToggleStatus = async (id, current) => {
    try {
      await candidateService.toggleCandidateStatus(id, !current);
      fetchCandidates();
    } catch (err) { alert('Failed to update: ' + (err.response?.data?.message || err.message)); }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.armyNumber || !formData.name) return alert('Army number and name are required.');
    try {
      setSubmitting(true);
      await candidateService.createCandidate(formData);
      setShowModal(false); setFormData(DEFAULT_FORM); fetchCandidates();
    } catch (err) { alert('Failed to create: ' + (err.response?.data?.message || err.message)); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="page-title">Candidates Roster</div>
          <div className="page-subtitle">Registration · Enrollment · Unit Rosters</div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary px-5 py-2.5 uppercase tracking-widest text-[12px]">
          + Add Candidate
        </button>
      </div>

      {/* Stats bar */}
      <div className="card flex flex-wrap gap-6 items-center justify-between py-3 px-5">
        <div className="flex gap-6 text-[12px] font-semibold flex-wrap">
          <span style={{ color: Dim }}>Total: <span style={{ color: 'var(--tx)' }}>{candidates.length}</span></span>
          <span className="border-l pl-6" style={{ borderColor: 'var(--border)', color: Dim }}>Active: <span style={{ color: 'var(--green)' }}>{candidates.filter(c => c.isActive).length}</span></span>
          <span className="border-l pl-6" style={{ borderColor: 'var(--border)', color: Dim }}>Locked: <span style={{ color: 'var(--red)' }}>{candidates.filter(c => !c.isActive).length}</span></span>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: Dim }}>🛡️ Offline Secure DB</span>
      </div>

      {/* Search */}
      <div className="card !p-3">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name or army number..."
          className="form-input" />
      </div>

      {/* Table */}
      {loading && <div className="text-center py-12 text-[13px]" style={{ color: Dim }}>Fetching candidates...</div>}

      {!loading && (
        <div className="card !p-0 overflow-x-auto">
          {candidates.length === 0 ? (
            <div className="p-10 text-center text-[13px]" style={{ color: Dim }}>
              No candidates registered. Click "Add Candidate" to enroll.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Deployment</th>
                  <th className="text-right">Status / Control</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: 'rgba(201,162,39,0.1)', color: G, border: '1px solid rgba(201,162,39,0.25)' }}>
                          {row.rank}
                        </span>
                        <div>
                          <div className="text-[14px] font-semibold" style={{ color: 'var(--tx)' }}>{row.name}</div>
                          <div className="font-mono text-[10px] mt-0.5" style={{ color: Dim }}>{row.armyNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold text-[13px]" style={{ color: 'var(--tx)' }}>{row.unit}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: Dim }}>{row.trade}</div>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          row.isActive
                            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                            : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40'
                        }`}>{row.isActive ? 'Active' : 'Locked'}</span>
                        <button
                          onClick={() => handleToggleStatus(row.id, row.isActive)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 relative focus:outline-none cursor-pointer ${
                            row.isActive ? 'bg-emerald-600' : 'bg-neutral-700'
                          }`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${row.isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,26,16,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-2xl border p-8 animate-fade-in" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-center mb-6">
              <div className="text-[20px] font-black uppercase tracking-wide" style={{ color: G }}>Enroll Candidate</div>
              <button onClick={() => { setShowModal(false); setFormData(DEFAULT_FORM); }}
                className="text-[18px] cursor-pointer transition-colors" style={{ color: Dim }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--tx)'}
                onMouseLeave={e => e.currentTarget.style.color = Dim}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="form-label">Army Number *</label>
                <input type="text" value={formData.armyNumber}
                  onChange={e => setFormData({ ...formData, armyNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. 1554902M" className="form-input" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Rank</label>
                  <select value={formData.rank} onChange={e => setFormData({ ...formData, rank: e.target.value })} className="form-input">
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="form-input">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Full Name *</label>
                <input type="text" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Spr Amit Kumar" className="form-input" required />
              </div>
              <div>
                <label className="form-label">Trade Specialist</label>
                <input type="text" value={formData.trade}
                  onChange={e => setFormData({ ...formData, trade: e.target.value })}
                  placeholder="e.g. Field Engineer" className="form-input" />
              </div>
              <div>
                <label className="form-label">Default Access Password</label>
                <input type="text" value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="form-input" required />
                <p className="text-[10px] mt-1.5" style={{ color: Dim }}>Default: Password@123 — candidate must change after first login.</p>
              </div>
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button type="button" onClick={() => { setShowModal(false); setFormData(DEFAULT_FORM); }}
                  className="btn btn-secondary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="btn btn-primary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">
                  {submitting ? 'Enrolling...' : 'Enroll Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
