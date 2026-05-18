import { useState, useEffect } from 'react';
import { candidateService } from '../services/api';

const AVAILABLE_UNITS = [
  'HQ BEG', '21 Engr Regt', '22 Engr Regt', 'A Coy', 'B Coy', 'C Coy', 
  'HQ Coy', 'Support Coy', 'Field Coy', 'Workshop', 'Signals Platoon'
];

const RANKS = ['Spr', 'L/Nk', 'Nk', 'Hav', 'Sub', 'Maj', 'Capt'];

const defaultForm = {
  armyNumber: '',
  rank: 'Spr',
  name: '',
  unit: '21 Engr Regt',
  trade: 'Field Engineer',
  password: 'Password@123'
};

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await candidateService.getCandidates({ search: searchQuery });
      setCandidates(res.data?.candidates || []);
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [searchQuery]); // Reload instantly as user types in search box

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await candidateService.toggleCandidateStatus(id, !currentStatus);
      fetchCandidates();
    } catch (err) {
      alert("Failed to update candidate status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.armyNumber || !formData.name) {
      return alert("Army number and name are required.");
    }

    try {
      setSubmitting(true);
      await candidateService.createCandidate(formData);
      setShowModal(false);
      setFormData(defaultForm);
      fetchCandidates();
    } catch (err) {
      alert("Failed to create candidate: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="font-hd text-[34px] tracking-[3px] text-kh leading-none">CANDIDATES ROSTER</div>
          <div className="font-mn text-[10px] text-txd mt-1 tracking-[1px] uppercase">
            REGISTRATION · ENROLLMENT · UNIT ROSTERS · LOGINS
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 px-5 rounded font-mn text-[11px] tracking-[1px] uppercase flex items-center"
        >
          <span className="mr-2">+</span> ADD CANDIDATE
        </button>
      </div>

      {/* Sleek status bar */}
      <div className="flex flex-wrap gap-6 mb-6 font-mn text-[11px] text-txm bg-sf border border-br rounded-md py-3.5 px-5 items-center justify-between">
        <div className="flex gap-x-6 gap-y-2 flex-wrap">
          <div>TOTAL ENROLLED: <span className="text-kh font-semibold">{candidates.length}</span></div>
          <div className="border-l border-br pl-6">ACTIVE ACCOUNTS: <span className="text-green-500 font-semibold">{candidates.filter(c => c.isActive).length}</span></div>
          <div className="border-l border-br pl-6">LOCKED / RESTRICTED: <span className="text-rose-500 font-semibold">{candidates.filter(c => !c.isActive).length}</span></div>
        </div>
        <div className="text-[9px] text-txd uppercase tracking-[0.5px] hidden sm:block">🛡️ secure offline database</div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-sf border border-br rounded-md p-4 mb-6">
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Candidate name or Army number..."
          className="form-input bg-sf text-[12px] h-[38px] w-full"
        />
      </div>

      {/* Loading state */}
      {loading && <div className="text-center py-12 font-mn text-txm">Fetching candidate profiles...</div>}

      {/* Consolidated Roster Table */}
      {!loading && (
        <div className="bg-sf border border-br rounded-md overflow-x-auto">
          {candidates.length === 0 ? (
            <div className="p-8 text-center font-mn text-txm">
              No candidates currently registered. Click "ADD CANDIDATE" to enroll.
            </div>
          ) : (
            <table className="w-full border-collapse text-left font-mn">
              <thead>
                <tr className="border-b border-br bg-sf2 text-kh text-[10px] tracking-[1px] uppercase">
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Deployment</th>
                  <th className="p-4 text-right">Account Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-br text-[12px] text-txm">
                {candidates.map((row) => (
                  <tr key={row.id} className="hover:bg-am/5 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <span className="px-2 py-0.5 rounded font-mn text-[9px] uppercase tracking-[0.5px] bg-am/15 text-kh border border-am/25">
                          {row.rank}
                        </span>
                        <div>
                          <div className="font-semibold text-kh text-[13.5px]">{row.name}</div>
                          <div className="font-mn text-[9.5px] text-txd tracking-[0.5px] uppercase mt-0.5">{row.armyNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-semibold text-tx">{row.unit}</div>
                      <div className="font-mn text-[10px] text-txd mt-0.5">{row.trade}</div>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-4">
                        <span className={`px-2 py-0.5 rounded font-mn text-[9px] uppercase tracking-[1px] ${
                          row.isActive 
                            ? 'bg-green-950 text-green-400 border border-green-800' 
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}>
                          {row.isActive ? 'ACTIVE' : 'LOCKED'}
                        </span>
                        
                        <div className="inline-flex items-center space-x-2">
                          <span className="font-mn text-[10px] text-txd uppercase">
                            {row.isActive ? 'Deactivate' : 'Activate'}
                          </span>
                          <button 
                            onClick={() => handleToggleStatus(row.id, row.isActive)}
                            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none ${
                              row.isActive ? 'bg-green-600' : 'bg-neutral-700'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                              row.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}></div>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ENROLL CANDIDATE POPUP MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-sf border border-br rounded-lg w-full max-w-lg shadow-2xl p-8 relative animate-fade-in">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-txd hover:text-kh text-xl font-mn transition-colors"
            >
              ✕
            </button>
            <div className="font-hd text-[24px] text-kh tracking-[2px] mb-6">ENROLL CANDIDATE</div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="form-label">Army Number</label>
                <input 
                  type="text" 
                  value={formData.armyNumber}
                  onChange={(e) => setFormData({ ...formData, armyNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. 1554902M" 
                  className="form-input bg-sf" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Rank</label>
                  <select 
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="form-input bg-sf text-white"
                  >
                    {RANKS.map(rk => (
                      <option key={rk} value={rk}>{rk}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="form-input bg-sf text-white"
                  >
                    {AVAILABLE_UNITS.map(ut => (
                      <option key={ut} value={ut}>{ut}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Spr Amit Kumar" 
                  className="form-input bg-sf" 
                  required
                />
              </div>

              <div>
                <label className="form-label">Trade Specialist</label>
                <input 
                  type="text" 
                  value={formData.trade}
                  onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                  placeholder="e.g. Field Engineer / Bridge Builder" 
                  className="form-input bg-sf" 
                  required
                />
              </div>

              <div>
                <label className="form-label">Default Access Password</label>
                <input 
                  type="text" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="form-input bg-sf" 
                  required
                />
                <span className="text-[10px] text-txd mt-1 block">Default value: `Password@123` for quick candidates login testing.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-br">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setFormData(defaultForm);
                  }}
                  className="btn bg-sf border border-br text-txm hover:border-kh transition-colors py-2.5 px-6 rounded font-mn text-[12px] uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 px-6 rounded font-mn text-[12px] uppercase disabled:opacity-50"
                >
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
