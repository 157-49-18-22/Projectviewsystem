import React, { useState, useEffect } from 'react';
import { FolderKanban, FileText, CreditCard, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const ClientDashboard = () => {
    const [stats, setStats] = useState({
        projects: 0,
        invoices: 0,
        pendingPayments: 0,
        completedMilestones: 0
    });
    const [myProjects, setMyProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        fetchClientData();
    }, []);

    const fetchClientData = async () => {
        try {
            // Fetch projects (filtered by client_id in backend)
            const projectsRes = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
            
            // Fetch invoices (filtered by client_id in backend)
            const invoicesRes = await axios.get(`${API}/invoices`, { headers: { Authorization: `Bearer ${token}` } });
            
            // Fetch payments (filtered by client_id in backend)
            const paymentsRes = await axios.get(`${API}/payments`, { headers: { Authorization: `Bearer ${token}` } });

            // Calculate stats
            const myProjectsList = projectsRes.data;
            const activeProjects = myProjectsList.filter(p => p.status === 'Active').length;
            const pendingPayments = paymentsRes.data.filter(p => p.status === 'Submitted').length;
            const totalInvoices = invoicesRes.data.length;
            
            // Calculate completed milestones from project details
            let totalMilestones = 0;
            let completedMilestones = 0;
            
            for (const project of myProjectsList) {
                try {
                    const projectDetailsRes = await axios.get(`${API}/projects/${project.id}`, { headers: { Authorization: `Bearer ${token}` } });
                    const milestones = projectDetailsRes.data.milestones || [];
                    totalMilestones += milestones.length;
                    completedMilestones += milestones.filter(m => m.status === 'Approved').length;
                } catch (err) {
                    console.error('Error fetching project details:', err);
                }
            }

            setStats({
                projects: activeProjects,
                invoices: totalInvoices,
                pendingPayments,
                completedMilestones
            });

            setMyProjects(myProjectsList);
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
        <div className="dashboard-content">
            <h1 style={{marginBottom: '2rem', fontSize: '1.8rem'}}>Client Dashboard</h1>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
                <div className="card" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary-color)', borderRadius: '12px'}}>
                        <FolderKanban size={28} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{stats.projects}</h3>
                        <p style={{color: 'var(--text-muted)'}}>Active Projects</p>
                    </div>
                </div>

                <div className="card" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '12px'}}>
                        <FileText size={28} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{stats.invoices}</h3>
                        <p style={{color: 'var(--text-muted)'}}>Total Invoices</p>
                    </div>
                </div>

                <div className="card" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '12px'}}>
                        <CreditCard size={28} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{stats.pendingPayments}</h3>
                        <p style={{color: 'var(--text-muted)'}}>Pending Payments</p>
                    </div>
                </div>

                <div className="card" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '12px'}}>
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <h3 style={{fontSize: '1.5rem', fontWeight: '700'}}>{stats.completedMilestones}</h3>
                        <p style={{color: 'var(--text-muted)'}}>Completed Milestones</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 style={{marginBottom: '1rem'}}>My Projects</h3>
                {myProjects.length === 0 ? (
                    <p style={{color: 'var(--text-muted)'}}>No projects assigned yet</p>
                ) : (
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
                                <th style={{textAlign: 'left', padding: '0.75rem'}}>Project Name</th>
                                <th style={{textAlign: 'left', padding: '0.75rem'}}>Start Date</th>
                                <th style={{textAlign: 'left', padding: '0.75rem'}}>End Date</th>
                                <th style={{textAlign: 'left', padding: '0.75rem'}}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myProjects.map(project => (
                                <tr key={project.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                    <td style={{padding: '0.75rem'}}>{project.project_name}</td>
                                    <td style={{padding: '0.75rem'}}>{project.start_date?.split('T')[0]}</td>
                                    <td style={{padding: '0.75rem'}}>{project.end_date?.split('T')[0]}</td>
                                    <td style={{padding: '0.75rem'}}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            background: project.status === 'Active' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                                            color: project.status === 'Active' ? '#4caf50' : '#ffc107'
                                        }}>
                                            {project.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ClientDashboard;
