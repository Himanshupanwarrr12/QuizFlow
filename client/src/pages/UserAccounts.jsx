import { useState, useEffect } from 'react';
import { superAdminService } from '../services/api';

const AVAILABLE_UNITS = [
  'HQ BEG', '21 Engr Regt', '22 Engr Regt', 'A Coy', 'B Coy', 'C Coy', 
  'HQ Coy', 'Support Coy', 'Field Coy', 'Workshop', 'Signals Platoon'
];

const AVAILABLE_RANKS = [
  'Brigadier', 'Colonel', 'Lt Colonel', 'Major', 'Captain', 'Lieutenant', 
  'Subedar Major', 'Subedar', 'Naib Subedar', 'Havildar', 'Naik', 'Lance Naik', 'Sapper'
];

const RANK_ABBRS = {
  'Brigadier': 'Brig',
  'Colonel': 'Col',
  'Lt Colonel': 'Lt Col',
  'Major': 'Maj',
  'Captain': 'Capt',
  'Lieutenant': 'Lt',
  'Subedar Major': 'SM',
  'Subedar': 'Sub',
  'Naib Subedar': 'Nb Sub',
  'Havildar': 'Hav',
  'Naik': 'Nk',
  'Lance Naik': 'L/Nk',
  'Sapper': 'Spr'
};

export default function UserAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    armyNumber: '',
    rank: 'Sapper',
    name: '',
    unit: 'HQ BEG',
    trade: '',
    role: 'candidate',
    password: '',
    confirmPassword: ''
  });

  const [editFormData, setEditFormData] = useState({
    rank: 'Sapper',
    name: '',
    unit: 'HQ BEG',
    trade: '',
    role: 'candidate'
  });

  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await superAdminService.getUsers({
        search,
        role: roleFilter
      });
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error("Failed to load user accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleOpenAddModal = () => {
    setFormData({
      armyNumber: '',
      rank: 'Sapper',
      name: '',
      unit: 'HQ BEG',
      trade: '',
      role: 'candidate',
      password: '',
      confirmPassword: ''
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    const { armyNumber, name, role, password, confirmPassword } = formData;

    if (!armyNumber || !name || !role || !password) {
      setFormError("All required fields must be filled.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      setActionLoading(true);
      await superAdminService.createUser(formData);
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create user account.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      rank: user.rank,
      name: user.name,
      unit: user.unit,
      trade: user.trade,
      role: user.role
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      setActionLoading(true);
      await superAdminService.updateUser(selectedUser.id, editFormData);
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update user account.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const confirmed = window.confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} user ${user.name}?`);
      if (!confirmed) return;

      await superAdminService.toggleUserStatus(user.id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle status.");
    }
  };

  // Helper to format row index
  const formatIndex = (idx) => {
    return (idx + 1).toString().padStart(2, '0');
  };

  // Helper to get abbreviated name & rank
  const formatNameWithRank = (name, rank) => {
    const abbr = RANK_ABBRS[rank] || rank;
    return `${abbr} ${name}`;
  };

  // Role Badge Styling Mapper
  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-0.5 rounded-sm text-[9.5px] font-mn uppercase font-bold tracking-[0.5px] bg-[#f39c12]/15 text-[#f39c12] border border-[#f39c12]/20">
            MASTER ADMIN
          </span>
        );
      case 'exam_officer':
        return (
          <span className="px-2.5 py-0.5 rounded-sm text-[9.5px] font-mn uppercase font-bold tracking-[0.5px] bg-[#9b59b6]/15 text-[#b06ab3] border border-[#9b59b6]/20">
            ADMINISTRATOR
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-sm text-[9.5px] font-mn uppercase font-bold tracking-[0.5px] bg-[#2980b9]/15 text-[#3498db] border border-[#2980b9]/20">
            CANDIDATE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="font-hd text-[34px] tracking-[3px] text-kh leading-none">USER ACCOUNTS</div>
          <div className="font-mn text-[10px] text-txd mt-1.5 tracking-[1.5px] uppercase">
            ROLE-BASED ACCESS CONTROL · {users.length} USERS REGISTERED
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 px-5 rounded font-mn text-[12px] font-bold tracking-[0.5px] uppercase"
        >
          + ADD NEW USER
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / username / service no..."
          className="form-input flex-1 bg-sf h-[44px]"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="form-input bg-sf h-[44px] sm:w-[200px]"
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="exam_officer">Exam Officer</option>
          <option value="candidate">Candidate</option>
        </select>
      </div>

      {/* Users table */}
      <div className="bg-sf border border-br rounded-md overflow-x-auto">
        <table className="w-full text-left font-mn border-collapse">
          <thead>
            <tr className="border-b border-br text-[10px] text-txd uppercase tracking-[1px] bg-sf2/40">
              <th className="p-4 w-[60px] text-center">#</th>
              <th className="p-4">NAME & RANK</th>
              <th className="p-4">SERVICE NO.</th>
              <th className="p-4">UNIT</th>
              <th className="p-4">ROLE</th>
              <th className="p-4">USERNAME</th>
              <th className="p-4 text-center">STATUS</th>
              <th className="p-4 text-center w-[180px]">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-br/60 text-[13px]">
            {loading ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-txm">Syncing user directory...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-txm">No matching user accounts registered.</td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr key={user.id} className="hover:bg-am/5 transition-all">
                  <td className="p-4 text-center text-txd opacity-80">{formatIndex(idx)}</td>
                  <td className="p-4">
                    <div className="font-bold text-kh leading-snug">
                      {formatNameWithRank(user.name, user.rank)}
                    </div>
                    <div className="text-[10px] text-txd uppercase tracking-[0.5px] mt-0.5">
                      {user.rank}
                    </div>
                  </td>
                  <td className="p-4 text-kh font-semibold">{user.armyNumber}</td>
                  <td className="p-4 text-txm">{user.unit}</td>
                  <td className="p-4">{getRoleBadge(user.role)}</td>
                  <td className="p-4 text-txd">{user.armyNumber.toLowerCase()}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-[0.5px] uppercase ${
                      user.isActive 
                        ? 'bg-green-950/40 text-green-400 border border-green-900/40' 
                        : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                    }`}>
                      {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="px-3 py-1 rounded bg-sf border border-br text-txm hover:border-kh hover:text-kh transition-colors text-[11px]"
                      >
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-3 py-1 rounded font-bold text-[11px] transition-colors ${
                          user.isActive
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40 hover:bg-rose-900/40'
                            : 'bg-green-950/40 text-green-400 border border-green-900/40 hover:bg-green-900/40'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── ADD NEW USER MODAL ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-sf border border-br rounded-md w-full max-w-lg shadow-2xl p-6 font-mn my-8 relative">
            <div className="flex justify-between items-center border-b border-br pb-3 mb-4">
              <div className="font-hd text-[20px] text-kh uppercase tracking-[1px]">ADD NEW USER ACCOUNT</div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-txd hover:text-kh text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded text-[11.5px] font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-[12.5px]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Service / Army Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.armyNumber}
                    onChange={(e) => setFormData({...formData, armyNumber: e.target.value})}
                    placeholder="e.g. IC-12345A"
                    className="form-input bg-sf w-full"
                  />
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Spr Arjun Kumar"
                    className="form-input bg-sf w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Rank *</label>
                  <select
                    value={formData.rank}
                    onChange={(e) => setFormData({...formData, rank: e.target.value})}
                    className="form-input bg-sf w-full"
                  >
                    {AVAILABLE_RANKS.map(rank => (
                      <option key={rank} value={rank}>{rank}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="form-input bg-sf w-full"
                  >
                    {AVAILABLE_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Specialist Trade</label>
                  <input
                    type="text"
                    value={formData.trade}
                    onChange={(e) => setFormData({...formData, trade: e.target.value})}
                    placeholder="e.g. Field Engineer"
                    className="form-input bg-sf w-full"
                  />
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Access Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="form-input bg-sf w-full"
                  >
                    <option value="super_admin">Super Admin (Master Admin)</option>
                    <option value="exam_officer">Exam Officer (Administrator)</option>
                    <option value="candidate">Candidate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-br/60 pt-4">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="form-input bg-sf w-full"
                  />
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder="••••••••"
                    className="form-input bg-sf w-full"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-br mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn flex-1 bg-sf border border-br text-txm hover:border-kh transition-colors py-2.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn flex-1 bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 rounded font-bold"
                >
                  {actionLoading ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ────────────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-sf border border-br rounded-md w-full max-w-lg shadow-2xl p-6 font-mn my-8 relative">
            <div className="flex justify-between items-center border-b border-br pb-3 mb-4">
              <div className="font-hd text-[20px] text-kh uppercase tracking-[1px]">EDIT USER ACCOUNT</div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-txd hover:text-kh text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded text-[11.5px] font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-[12.5px]">
              <div>
                <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Service Number (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  value={selectedUser?.armyNumber}
                  className="form-input bg-sf/50 opacity-60 w-full cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="form-input bg-sf w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Rank *</label>
                  <select
                    value={editFormData.rank}
                    onChange={(e) => setEditFormData({...editFormData, rank: e.target.value})}
                    className="form-input bg-sf w-full"
                  >
                    {AVAILABLE_RANKS.map(rank => (
                      <option key={rank} value={rank}>{rank}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Unit *</label>
                  <select
                    value={editFormData.unit}
                    onChange={(e) => setEditFormData({...editFormData, unit: e.target.value})}
                    className="form-input bg-sf w-full"
                  >
                    {AVAILABLE_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Specialist Trade</label>
                  <input
                    type="text"
                    value={editFormData.trade}
                    onChange={(e) => setEditFormData({...editFormData, trade: e.target.value})}
                    className="form-input bg-sf w-full"
                  />
                </div>
                <div>
                  <label className="block text-txd uppercase mb-1 font-bold text-[10px]">Access Role *</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                    className="form-input bg-sf w-full"
                  >
                    <option value="super_admin">Super Admin (Master Admin)</option>
                    <option value="exam_officer">Exam Officer (Administrator)</option>
                    <option value="candidate">Candidate</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-br mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn flex-1 bg-sf border border-br text-txm hover:border-kh transition-colors py-2.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn flex-1 bg-am hover:bg-am/90 text-oldd transition-colors py-2.5 rounded font-bold"
                >
                  {actionLoading ? 'Saving...' : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
