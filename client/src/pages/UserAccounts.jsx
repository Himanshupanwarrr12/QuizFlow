import { useState, useEffect } from 'react';
import { superAdminService } from '../services/api';

const AVAILABLE_UNITS = [
  'HQ BEG','21 Engr Regt','22 Engr Regt','A Coy','B Coy','C Coy',
  'HQ Coy','Support Coy','Field Coy','Workshop','Signals Platoon'
];
const AVAILABLE_RANKS = [
  'Brigadier','Colonel','Lt Colonel','Major','Captain','Lieutenant',
  'Subedar Major','Subedar','Naib Subedar','Havildar','Naik','Lance Naik','Sapper'
];
const RANK_ABBRS = { Brigadier:'Brig', Colonel:'Col', 'Lt Colonel':'Lt Col', Major:'Maj', Captain:'Capt', Lieutenant:'Lt', 'Subedar Major':'SM', Subedar:'Sub', 'Naib Subedar':'Nb Sub', Havildar:'Hav', Naik:'Nk', 'Lance Naik':'L/Nk', Sapper:'Spr' };

const G   = 'var(--gold)';
const Dim = 'var(--tx-mute)';

const ROLE_BADGE = {
  super_admin:  { label: 'Master Admin',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  exam_officer: { label: 'Exam Officer',  color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)' },
  candidate:    { label: 'Candidate',      color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.3)'  },
};

const BLANK_FORM = { armyNumber:'', rank:'Sapper', name:'', unit:'HQ BEG', trade:'', role:'candidate', password:'', confirmPassword:'' };

export default function UserAccounts() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal,setShowEditModal]= useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData,     setFormData]     = useState(BLANK_FORM);
  const [editFormData, setEditFormData] = useState({ rank:'Sapper', name:'', unit:'HQ BEG', trade:'', role:'candidate' });
  const [formError,    setFormError]    = useState('');
  const [actionLoading,setActionLoading]= useState(false);

  const fetchUsers = async () => {
    try { setLoading(true); const res = await superAdminService.getUsers({ search, role: roleFilter }); setUsers(res.data?.users||[]); }
    catch (err) { console.error('Failed to load users:', err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  const handleOpenAddModal = () => { setFormData(BLANK_FORM); setFormError(''); setShowAddModal(true); };

  const handleCreateUser = async (e) => {
    e.preventDefault(); setFormError('');
    const { armyNumber, name, role, password, confirmPassword } = formData;
    if (!armyNumber || !name || !role || !password) { setFormError('All required fields must be filled.'); return; }
    if (password !== confirmPassword) { setFormError('Passwords do not match.'); return; }
    try { setActionLoading(true); await superAdminService.createUser(formData); setShowAddModal(false); fetchUsers(); }
    catch (err) { setFormError(err.response?.data?.message || 'Failed to create user account.'); }
    finally { setActionLoading(false); }
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({ rank:user.rank, name:user.name, unit:user.unit, trade:user.trade, role:user.role });
    setFormError(''); setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault(); setFormError('');
    try { setActionLoading(true); await superAdminService.updateUser(selectedUser.id, editFormData); setShowEditModal(false); fetchUsers(); }
    catch (err) { setFormError(err.response?.data?.message || 'Failed to update user account.'); }
    finally { setActionLoading(false); }
  };

  const handleToggleStatus = async (user) => {
    if (!window.confirm(`${user.isActive ? 'Deactivate' : 'Activate'} user ${user.name}?`)) return;
    try { await superAdminService.toggleUserStatus(user.id); fetchUsers(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to toggle status.'); }
  };

  const ModalWrapper = ({ children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(10,26,16,0.9)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg rounded-2xl border my-8 p-7" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="page-title">User Accounts</div>
          <div className="page-subtitle">Role-Based Access Control · {users.length} Users Registered</div>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary px-5 py-2.5 uppercase tracking-widest text-[12px]">
          + Add New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, username, service no..." className="form-input flex-1 min-w-[200px]" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="form-input w-[180px]">
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="exam_officer">Exam Officer</option>
          <option value="candidate">Candidate</option>
        </select>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-center w-12">#</th>
              <th>Name &amp; Rank</th>
              <th>Service No.</th>
              <th>Unit</th>
              <th>Role</th>
              <th className="text-center">Status</th>
              <th className="text-center w-44">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="py-12 text-center text-[13px]" style={{ color: Dim }}>Syncing user directory...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" className="py-12 text-center text-[13px]" style={{ color: Dim }}>No matching user accounts registered.</td></tr>
            ) : users.map((user, idx) => {
              const rb = ROLE_BADGE[user.role] || ROLE_BADGE.candidate;
              return (
                <tr key={user.id}>
                  <td className="text-center font-mono text-[11px]" style={{ color: Dim }}>{(idx+1).toString().padStart(2,'0')}</td>
                  <td>
                    <div className="font-bold text-[14px]" style={{ color: G }}>{RANK_ABBRS[user.rank]||user.rank} {user.name}</div>
                    <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: Dim }}>{user.rank}</div>
                  </td>
                  <td className="font-mono font-semibold text-[13px]" style={{ color: 'var(--tx)' }}>{user.armyNumber}</td>
                  <td style={{ color: 'var(--tx-dim)' }}>{user.unit}</td>
                  <td>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                      style={{ background: rb.bg, color: rb.color, border: `1px solid ${rb.border}` }}>{rb.label}</span>
                  </td>
                  <td className="text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      user.isActive ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                                    : 'bg-rose-900/40 text-rose-400 border border-rose-700/40'
                    }`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="text-center">
                    <div className="inline-flex gap-2">
                      <button onClick={() => handleOpenEditModal(user)} className="btn btn-secondary py-1.5 px-3 text-[11px] uppercase">Edit</button>
                      <button onClick={() => handleToggleStatus(user)}
                        className={`btn py-1.5 px-3 text-[11px] uppercase font-bold ${
                          user.isActive ? 'text-rose-400 border border-rose-700/40 bg-rose-900/20 hover:bg-rose-900/40'
                                        : 'text-emerald-400 border border-emerald-700/40 bg-emerald-900/20 hover:bg-emerald-900/40'
                        }`}>{user.isActive ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── ADD USER MODAL ─────────────────────────────────────────────── */}
      {showAddModal && (
        <ModalWrapper onClose={() => setShowAddModal(false)}>
          <div className="flex justify-between items-center mb-5">
            <div className="text-[20px] font-black uppercase tracking-wide" style={{ color: G }}>Add New User Account</div>
            <button onClick={() => setShowAddModal(false)} className="text-[18px] cursor-pointer" style={{ color: Dim }}
              onMouseEnter={e => e.currentTarget.style.color='var(--tx)'} onMouseLeave={e => e.currentTarget.style.color=Dim}>✕</button>
          </div>
          {formError && <div className="alert-error mb-4">⚠️ {formError}</div>}
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Service / Army Number *</label>
                <input type="text" required value={formData.armyNumber} onChange={e => setFormData({...formData, armyNumber:e.target.value})} placeholder="e.g. IC-12345A" className="form-input" /></div>
              <div><label className="form-label">Full Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name:e.target.value})} placeholder="e.g. Spr Arjun Kumar" className="form-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Rank</label>
                <select value={formData.rank} onChange={e => setFormData({...formData, rank:e.target.value})} className="form-input">
                  {AVAILABLE_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="form-label">Unit</label>
                <select value={formData.unit} onChange={e => setFormData({...formData, unit:e.target.value})} className="form-input">
                  {AVAILABLE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Trade</label>
                <input type="text" value={formData.trade} onChange={e => setFormData({...formData, trade:e.target.value})} placeholder="e.g. Field Engineer" className="form-input" /></div>
              <div><label className="form-label">Access Role *</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role:e.target.value})} className="form-input">
                  <option value="super_admin">Super Admin</option>
                  <option value="exam_officer">Exam Officer</option>
                  <option value="candidate">Candidate</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <div><label className="form-label">Password *</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password:e.target.value})} placeholder="••••••••" className="form-input" /></div>
              <div><label className="form-label">Confirm Password *</label>
                <input type="password" required value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword:e.target.value})} placeholder="••••••••" className="form-input" /></div>
            </div>
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">Cancel</button>
              <button type="submit" disabled={actionLoading} className="btn btn-primary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">
                {actionLoading ? 'Saving...' : 'Create Account'}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ── EDIT USER MODAL ────────────────────────────────────────────── */}
      {showEditModal && (
        <ModalWrapper onClose={() => setShowEditModal(false)}>
          <div className="flex justify-between items-center mb-5">
            <div className="text-[20px] font-black uppercase tracking-wide" style={{ color: G }}>Edit User Account</div>
            <button onClick={() => setShowEditModal(false)} className="text-[18px] cursor-pointer" style={{ color: Dim }}
              onMouseEnter={e => e.currentTarget.style.color='var(--tx)'} onMouseLeave={e => e.currentTarget.style.color=Dim}>✕</button>
          </div>
          {formError && <div className="alert-error mb-4">⚠️ {formError}</div>}
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div><label className="form-label">Service Number (Read-Only)</label>
              <input type="text" disabled value={selectedUser?.armyNumber} className="form-input opacity-50 cursor-not-allowed" /></div>
            <div><label className="form-label">Full Name *</label>
              <input type="text" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name:e.target.value})} className="form-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Rank</label>
                <select value={editFormData.rank} onChange={e => setEditFormData({...editFormData, rank:e.target.value})} className="form-input">
                  {AVAILABLE_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="form-label">Unit</label>
                <select value={editFormData.unit} onChange={e => setEditFormData({...editFormData, unit:e.target.value})} className="form-input">
                  {AVAILABLE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Trade</label>
                <input type="text" value={editFormData.trade} onChange={e => setEditFormData({...editFormData, trade:e.target.value})} className="form-input" /></div>
              <div><label className="form-label">Access Role</label>
                <select value={editFormData.role} onChange={e => setEditFormData({...editFormData, role:e.target.value})} className="form-input">
                  <option value="super_admin">Super Admin</option>
                  <option value="exam_officer">Exam Officer</option>
                  <option value="candidate">Candidate</option>
                </select></div>
            </div>
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">Cancel</button>
              <button type="submit" disabled={actionLoading} className="btn btn-primary flex-1 justify-center py-2.5 uppercase tracking-widest text-[12px]">
                {actionLoading ? 'Saving...' : 'Update Account'}
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
}
