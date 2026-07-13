import React, { useState, useEffect } from 'react';
import { Users, FileText, CreditCard, FolderKanban, DollarSign, Plus, Search, Filter, UserPlus, Calendar, History } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://projectviewsystem.onrender.com/api';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        clients: 0,
        projects: 0,
        pendingPayments: 0,
        totalRevenue: 0,
        pendingAgreements: 0
    });
    const [recentClients, setRecentClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'Client') {
            navigate('/client/dashboard', { replace: true });
            return;
        }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch clients
            const clientsRes = await axios.get(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } });
            
            // Fetch projects
            const projectsRes = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
            
            // Fetch payments
            const paymentsRes = await axios.get(`${API}/payments`, { headers: { Authorization: `Bearer ${token}` } });
            
            // Fetch invoices
            const invoicesRes = await axios.get(`${API}/invoices`, { headers: { Authorization: `Bearer ${token}` } });

            // Calculate stats
            const activeClients = clientsRes.data.filter(c => c.status === 'Active' || c.status === 'Project Active').length;
            const runningProjects = projectsRes.data.filter(p => p.status === 'Active').length;
            const pendingPayments = paymentsRes.data.filter(p => p.status === 'Submitted').length;
            const totalRevenue = invoicesRes.data.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
            const pendingAgreements = clientsRes.data.filter(c => c.status === 'Agreement Pending').length;

            setStats({
                clients: activeClients,
                projects: runningProjects,
                pendingPayments,
                totalRevenue,
                pendingAgreements
            });

            // Get recent clients (last 5)
            setRecentClients(clientsRes.data.slice(0, 5));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;
    }

    return (
        <div className="module-content" style={{ maxWidth: '1440px', margin: '0 auto', background: 'var(--bg-main)', fontFamily: 'Inter, sans-serif' }}>
            {/* Hero Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontFamily: 'Hanken Grotesk, sans-serif' }}>Admin Dashboard</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Welcome back. Here is what's happening with your clients today.</p>
                </div>
                
            </div>

            {/* Bento Grid Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {/* Stat 1: Active Clients */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', transition: 'box-shadow 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                     onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
                     onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={24} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)', background: 'rgba(99,102,241,0.15)', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>+12%</span>
                    </div>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontFamily: 'Hanken Grotesk, sans-serif' }}>{stats.clients}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Active Clients</p>
                </div>

                {/* Stat 2: Running Projects */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', transition: 'box-shadow 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                     onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
                     onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(100,116,139,0.1)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FolderKanban size={24} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', background: 'rgba(100,116,139,0.1)', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>Stable</span>
                    </div>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontFamily: 'Hanken Grotesk, sans-serif' }}>{stats.projects}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Running Projects</p>
                </div>

                {/* Stat 3: Pending Payments */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', transition: 'box-shadow 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                     onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
                     onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={24} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', background: 'rgba(239,68,68,0.15)', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>Action Required</span>
                    </div>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontFamily: 'Hanken Grotesk, sans-serif' }}>{stats.pendingPayments}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Pending Payments</p>
                </div>

                {/* Stat 4: Total Revenue (Wait, removing pending agreements to match the 4-grid) */}
                <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', transition: 'box-shadow 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                     onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
                     onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '96px', height: '96px', background: 'rgba(99,102,241,0.05)', borderRadius: '50%', margin: '-32px -32px 0 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-main)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={24} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', background: 'rgba(67,56,202,0.1)', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>Record High</span>
                    </div>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontFamily: 'Hanken Grotesk, sans-serif' }}>${stats.totalRevenue.toLocaleString()}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Total Revenue</p>
                </div>
            </div>

            {/* Recent Clients Table Section */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, fontFamily: 'Hanken Grotesk, sans-serif' }}>Recent Clients</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer' }}><Filter size={18} /></button>
                        <button style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer' }}><Search size={18} /></button>
                    </div>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <tr>
                                <th style={{ padding: '1rem 2rem', fontWeight: 700 }}>Company</th>
                                <th style={{ padding: '1rem 2rem', fontWeight: 700 }}>Contact</th>
                                <th style={{ padding: '1rem 2rem', fontWeight: 700 }}>Email</th>
                                <th style={{ padding: '1rem 2rem', fontWeight: 700 }}>Status</th>
                                
                            </tr>
                        </thead>
                        <tbody>
                            {recentClients.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No clients found</td></tr>
                            ) : recentClients.map(client => (
                                <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-main)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                {client.company_name.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{client.company_name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{client.contact_person}</td>
                                    <td style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{client.email}</td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: client.status === 'Active' || client.status === 'Project Active' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(99,102,241,0.1)',
                                            color: client.status === 'Active' || client.status === 'Project Active' ? '#4caf50' : 'var(--primary-color)'
                                        }}>
                                            {client.status}
                                        </span>
                                    </td>
                                    
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Footer */}
                <div style={{ padding: '1rem 2rem', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <p style={{ margin: 0 }}>Showing {recentClients.length} clients</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 700, cursor: 'not-allowed', opacity: 0.5 }}>Previous</button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' }}>Next</button>
                    </div>
                </div>
            </div>

            {/* Bottom Layout: Quick Actions / Recent Audit (Placeholder mock layout matching HTML) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                    <h5 style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                        <button onClick={() => navigate('/clients')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-main)', border: 'none', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-main)'; }}>
                            <UserPlus size={24} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Add Client</span>
                        </button>
                        <button onClick={() => navigate('/invoices')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-main)', border: 'none', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-main)'; }}>
                            <FileText size={24} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>New Invoice</span>
                        </button>
                        <button onClick={() => navigate('/milestones')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-main)', border: 'none', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-main)'; }}>
                            <Calendar size={24} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Milestone</span>
                        </button>
                    </div>
                </div>
                
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'var(--primary-color)', opacity: 0, pointerEvents: 'none' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Audit</h5>
                        <History size={18} color="var(--primary-color)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: '4px', background: 'var(--primary-color)', borderRadius: '4px' }}></div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>System updated statuses</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Just now • by System</p>
                            </div>
                        </div>
                    </div>
                    <button style={{ width: '100%', marginTop: '1.5rem', padding: '0.5rem', background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>View All Audit History</button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;



