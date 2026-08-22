import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, ShieldCheck, Key, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function UserManagementModal({ token, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Cashier');
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username || !password || !name) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      setFormError('');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, name, role })
      });

      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        setShowAddForm(false);
        setUsername('');
        setName('');
        setPassword('');
        setRole('Cashier');
      } else {
        setFormError(data.error || 'Failed to create user account');
      }
    } catch (err) {
      setFormError('Error creating user: ' + err.message);
    }
  };

  const handleDeleteUser = async (id, userName) => {
    if (!window.confirm(`Are you sure you want to delete user account '${userName}'?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        alert(data.error || 'Failed to delete user account');
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const getRoleBadge = (r) => {
    if (r === 'Admin') return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontSize: '0.72rem', fontWeight: '700', border: '1px solid rgba(168, 85, 247, 0.4)' }}>👑 Admin</span>;
    if (r === 'Manager') return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '0.72rem', fontWeight: '700', border: '1px solid rgba(59, 130, 246, 0.4)' }}>👔 Manager</span>;
    return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.72rem', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.4)' }}>🛒 Cashier</span>;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '700px', maxWidth: '95vw' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>User Account Management</h2>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Manage system logins, credentials & roles</div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Total Registered Accounts: <strong>{users.length}</strong></div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <UserPlus size={16} /> {showAddForm ? 'Cancel' : 'Add New User'}
          </button>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <form onSubmit={handleCreateUser} style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserPlus size={16} style={{ color: '#60a5fa' }} /> Create New System Account
            </h3>

            {formError && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '6px', fontSize: '0.8rem' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Miller" className="input-field-sm" style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Username *</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. john" className="input-field-sm" style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set password" className="input-field-sm" style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Access Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="input-field-sm" style={{ width: '100%' }}>
                  <option value="Cashier">Cashier (POS Checkout)</option>
                  <option value="Manager">Manager (Inventory & Import)</option>
                  <option value="Admin">Admin (Full Access & Users)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
              Save Account
            </button>
          </form>
        )}

        {/* Users Table */}
        <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw className="spin" size={20} /> Loading users...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.8)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Username</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: '600', color: 'white' }}>{u.name}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{u.username}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>{getRoleBadge(u.role)}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#94a3b8', fontSize: '0.78rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        style={{ padding: '0.35rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', cursor: 'pointer' }}
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
