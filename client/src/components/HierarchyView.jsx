import React, { useState, useEffect } from 'react';
import { Crown, Shield, User, Stethoscope, GitFork, RefreshCw } from 'lucide-react';

export default function HierarchyView({ superadminAuth }) {
  const [hierarchy, setHierarchy] = useState([]);
  const [stats, setStats] = useState({ totalAdmins: 0, totalUsers: 0, totalDoctors: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHierarchy();
  }, [superadminAuth]);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      // Use superadmin token if available
      const headers = superadminAuth?.token
        ? { Authorization: `Bearer ${superadminAuth.token}` }
        : {};
      
      const res = await fetch('/api/superadmin/hierarchy', { headers });
      const data = await res.json();
      if (data.success) {
        setHierarchy(data.hierarchy);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching hierarchy:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>
            <GitFork size={28} color="#e63946" /> MongoDB Inheritance Explorer
          </h2>
          <p>
            Live hierarchical tree visualization: <code>Superadmin ➔ Admin (admins) ➔ User (user) ➔ Doctor (doctors)</code>
          </p>
        </div>

        <button className="btn-secondary" onClick={fetchHierarchy}>
          <RefreshCw size={15} /> Refresh DB Tree
        </button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Loading MongoDB inheritance tree...
        </div>
      ) : (
        <div className="tree-explorer-container">
          {/* Master Superadmin Root */}
          <div className="tree-node-superadmin">
            <div className="tree-node-superadmin-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Crown size={22} color="#b45309" />
                <span style={{ fontSize: '1.15rem', color: '#b45309' }}>👑 Master Superadmin (Root)</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Total Admins: {stats.totalAdmins} | Total Users: {stats.totalUsers} | Total Doctors: {stats.totalDoctors}
              </span>
            </div>

            {hierarchy.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem', padding: '1rem' }}>
                No admins registered under Superadmin yet.
              </p>
            ) : (
              hierarchy.map((admin) => (
                <div key={admin._id} className="tree-admin-branch">
                  {/* Admin Level */}
                  <div className="tree-admin-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Shield size={18} color="#0284c7" />
                      <div>
                        <strong style={{ color: '#0369a1' }}>{admin.name}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '0.5rem' }}>
                          ({admin.organization || 'Cardio Network'})
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.76rem', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px', color: '#0369a1', fontWeight: 600 }}>
                      {admin.usersCount} Users • {admin.doctorsCount} Doctors
                    </span>
                  </div>

                  {/* Users Level under this Admin */}
                  {admin.users && admin.users.length > 0 ? (
                    admin.users.map((user) => (
                      <div key={user._id} className="tree-user-branch">
                        <div className="tree-user-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={16} color="#e63946" />
                            <div>
                              <strong style={{ color: '#0f172a' }}>{user.employeeId || user.name}</strong>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.74rem', background: '#fee2e2', padding: '2px 8px', borderRadius: '10px', color: '#b91c1c', fontWeight: 600 }}>
                            {user.doctors ? user.doctors.length : 0} Doctors Registered
                          </span>
                        </div>

                        {/* Doctors Level under this User */}
                        {user.doctors && user.doctors.length > 0 ? (
                          <div className="tree-doctor-leaves">
                            {user.doctors.map((doc) => (
                              <div key={doc._id} className="tree-doc-pill">
                                <img
                                  src={doc.photoUrl}
                                  alt={doc.doctorName}
                                  className="tree-doc-thumb"
                                  onError={(e) => { e.target.src = '/assets/sample_poster.jpeg'; }}
                                />
                                <span>
                                  <strong>{doc.doctorName}</strong> ({doc.clinicName})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ marginLeft: '2rem', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                            No doctors created by this user yet
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ marginLeft: '2rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                      No users created under this Admin yet
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
