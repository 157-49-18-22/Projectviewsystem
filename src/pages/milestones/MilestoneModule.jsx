import React, { useState, useEffect } from 'react';
import { Plus, X, CheckCircle2, Clock, AlertCircle, Search, Folder, User as UserIcon, Calendar, MoreVertical, DollarSign, Pickaxe } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

const statusConfig = {
    'Not Submitted':    { color: 'var(--text-muted)', icon: <Clock size={20} />, bg: 'rgba(100,100,100,0.1)', border: '#9ca3af' },
    'Pending Approval': { color: '#f59e0b', icon: <Clock size={24} />, bg: 'rgba(245,158,11,0.15)', border: '#fb923c' },
    'Approved':         { color: '#10b981', icon: <CheckCircle2 size={24} />, bg: 'rgba(16,185,129,0.15)', border: '#10b981' },
    'Changes Requested':{ color: '#ef4444',  icon: <AlertCircle size={24} />,  bg: 'rgba(239,68,68,0.15)', border: '#ef4444' },
};

const MilestoneModule = () => {
    const [milestones, setMilestones] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectMilestones, setProjectMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showRespond, setShowRespond] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showEdit, setShowEdit] = useState(null);
    const [showView, setShowView] = useState(null);
    const [editData, setEditData] = useState({ milestone_name: '', description: '' });


    const [formData, setFormData] = useState({ project_id: '', milestone_id: '', description: '' });
    const [respondData, setRespondData] = useState({ status: '', client_remarks: '' });
    
    // UI Filters
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'Admin';

    const fetchMilestones = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/milestones`, { headers: { Authorization: `Bearer ${token}` } });
            setMilestones(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProjectMilestones = async (projectId) => {
        try {
            const res = await axios.get(`${API}/projects/${projectId}/milestones`, { headers: { Authorization: `Bearer ${token}` } });
            setProjectMilestones(res.data || []);
        } catch (err) {
            console.error('Error fetching project milestones:', err);
            setProjectMilestones([]);
        }
    };

    useEffect(() => {
        fetchMilestones();
        if (isAdmin) fetchProjects();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/milestones/request`, formData, { headers: { Authorization: `Bearer ${token}` } });
            alert('✅ Milestone submitted for client approval! Client has been notified.');
            setShowCreate(false);
            setFormData({ project_id: '', milestone_id: '', description: '' });
            setProjectMilestones([]);
            fetchMilestones();
        } catch (err) {
            alert('❌ ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const handleProjectChange = async (projectId) => {
        setFormData({ ...formData, project_id: projectId, milestone_id: '' });
        if (projectId) {
            await fetchProjectMilestones(projectId);
        } else {
            setProjectMilestones([]);
        }
    };

    const handleRespond = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/milestones/respond`, {
                milestone_id: showRespond.id,
                status: respondData.status,
                client_remarks: respondData.client_remarks
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert('✅ Response submitted!');
            setShowRespond(null);
            setRespondData({ status: '', client_remarks: '' });
            fetchMilestones();
        } catch (err) {
            alert('❌ ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this milestone request? It will be reverted back and appear in the dropdown again.')) return;
        try {
            await axios.delete(`${API}/milestones/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            alert('✅ Milestone request deleted.');
            fetchMilestones();
        } catch (err) {
            alert('❌ ' + (err.response?.data?.message || 'Server error'));
        }
    };

    // Calculate Stats
    const completedCount = milestones.filter(m => m.status === 'Approved').length;
    const pendingCount = milestones.filter(m => m.status === 'Pending Approval').length;
    // Mocking an estimated payout value
    const estimatedPayout = completedCount * 1200 + pendingCount * 1200;

    // Filter Logic
    const displayedMilestones = milestones.filter(m => {
        if (filter === 'Pending' && m.status !== 'Pending Approval') return false;
        if (filter === 'Approved' && m.status !== 'Approved') return false;
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (m.milestone_name?.toLowerCase().includes(q) || 
                    m.project_name?.toLowerCase().includes(q) || 
                    m.company_name?.toLowerCase().includes(q));
        }
        return true;
    });

    return (
        <div className="module-content" style={{ maxWidth: '1440px', margin: '0 auto' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Milestone Approvals</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Review and manage client project milestones and payments.</p>
                </div>
                {isAdmin && (
                    <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: '10px', fontWeight: 600, boxShadow: '0 8px 16px rgba(99,102,241,0.2)' }}
                        onClick={() => setShowCreate(true)}>
                        <Plus size={20} /> Add Milestone
                    </button>
                )}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Completed</p>
                        <h4 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>{completedCount} Milestones</h4>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Awaiting Approval</p>
                        <h4 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>{pendingCount} Milestones</h4>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estimated Payout</p>
                        <h4 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>${estimatedPayout.toLocaleString()}</h4>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['All', 'Pending', 'Approved'].map(t => (
                        <button key={t} onClick={() => setFilter(t)} style={{
                            padding: '0.5rem 1.25rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                            background: filter === t ? 'var(--primary-color)' : 'var(--bg-card)',
                            color: filter === t ? 'white' : 'var(--text-muted)',
                            border: filter === t ? '1px solid var(--primary-color)' : '1px solid var(--border-color)'
                        }}>
                            {t === 'All' ? 'All Milestones' : t}
                        </button>
                    ))}
                </div>
                <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Search milestones..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} 
                    />
                </div>
            </div>

            {/* Bento-style Milestone Cards List */}
            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading milestones...</p>
            ) : displayedMilestones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                    <Pickaxe size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No Milestones Found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{searchQuery ? 'Try adjusting your search filters.' : 'No milestones have been submitted yet.'}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {displayedMilestones.map(m => {
                        const cfg = statusConfig[m.status] || statusConfig['Pending Approval'];
                        return (
                            <div key={m.id} style={{
                                position: 'relative',
                                background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px',
                                padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }} 
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(0,0,0,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                
                                {/* Thick colored left border */}
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: cfg.border, borderTopLeftRadius: '14px', borderBottomLeftRadius: '14px' }} />


                                {/* Rounded Badge Icon */}
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `4px solid ${cfg.bg}`
                                }}>
                                    {cfg.icon}
                                </div>

                                {/* Main details */}
                                <div style={{ flex: '1 1 300px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{m.milestone_name}</h3>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 700 }}>#{m.id}</span>
                                    </div>
                                    <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{m.description}</p>
                                    
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Folder size={16} /> <span>Project: <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{m.project_name}</strong></span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <UserIcon size={16} /> <span>Client: <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{m.company_name}</strong></span>
                                        </div>
                                        {m.status === 'Approved' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: cfg.color }}>
                                                <Calendar size={16} /> <span style={{ fontWeight: 600 }}>Completed on {new Date(m.responded_at || m.requested_at).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {m.status === 'Pending Approval' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: cfg.color }}>
                                                <AlertCircle size={16} /> <span style={{ fontWeight: 600 }}>Awaiting response</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Remarks if any */}
                                    {m.client_remarks && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem' }}>
                                            <strong>Client Remarks:</strong> {m.client_remarks}
                                        </div>
                                    )}
                                </div>

                                {/* Right Actions/Status */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', minWidth: '160px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: cfg.bg, color: cfg.color, padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                                        {m.status === 'Approved' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, animation: 'pulse 2s infinite' }} />}
                                        {m.status}
                                    </div>
                                    
                                    {m.status === 'Pending Approval' ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                                            <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem', fontWeight: 600, borderRadius: '8px' }}
                                                onClick={() => { setShowRespond(m); setRespondData({ status: '', client_remarks: '' }); }}>
                                                {isAdmin ? 'Respond' : 'Review & Respond'}
                                            </button>
                                            <button 
                                                onClick={() => setActiveDropdown(activeDropdown === m.id ? null : m.id)}
                                                style={{ padding: '0.5rem', background: activeDropdown === m.id ? 'var(--bg-card)' : 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                <MoreVertical size={20} />
                                            </button>
                                            
                                            {/* Dropdown Menu */}
                                            {activeDropdown === m.id && (
                                                <div style={{ 
                                                    position: 'absolute', top: '110%', right: 0, zIndex: 10,
                                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', 
                                                    borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                                                    minWidth: '150px', overflow: 'hidden'
                                                }}>
                                                    <button onClick={() => { setShowView(m); setActiveDropdown(null); }} style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem' }}>View Details</button>
                                                    <button onClick={() => { setShowEdit(m); setEditData({ milestone_name: m.milestone_name, description: m.description || '' }); setActiveDropdown(null); }} style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem' }}>Edit Milestone</button>
                                                    <button onClick={() => { handleDelete(m.id); setActiveDropdown(null); }} style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>Delete</button>
                                                </div>
                                            )}
                                            
                                            {/* Close dropdown when clicking outside overlay (hacky but works inline) */}
                                            {activeDropdown === m.id && (
                                                <div onClick={() => setActiveDropdown(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} />
                                            )}
                                        </div>
                                    ) : (
                                        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                            ${(Math.random() * 5000 + 1000).toFixed(2)} {/* Mock price for visuals like the HTML */}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Empty State Appended Footer */}
                    {displayedMilestones.length === milestones.length && (
                        <div style={{ marginTop: '2rem', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                <Folder size={32} />
                            </div>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>You've reached the end</h4>
                            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', maxWidth: '400px' }}>All milestone records have been shown based on your current filters.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Milestone Modal */}
            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Add New Milestone</h3>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Project</label>
                                <select required className="input-field" value={formData.project_id}
                                    onChange={(e) => handleProjectChange(e.target.value)}>
                                    <option value="">-- Choose a project --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.project_name} ({p.company_name})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Milestone</label>
                                <select required className="input-field" value={formData.milestone_id}
                                    onChange={(e) => setFormData({ ...formData, milestone_id: e.target.value })}
                                    disabled={!formData.project_id}>
                                    <option value="">-- Choose a milestone --</option>
                                    {projectMilestones.map(m => (
                                        <option key={m.id} value={m.id}>{m.milestone_name}</option>
                                    ))}
                                </select>
                                {formData.project_id && projectMilestones.length === 0 && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        No available milestones for this project (all submitted).
                                    </p>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                                <textarea className="input-field" rows="3" placeholder="Describe what has been delivered..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem', fontWeight: 600 }}>Submit for Client Approval</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Respond Modal */}
            {showRespond && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Respond to Milestone</h3>
                            <button onClick={() => setShowRespond(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Milestone: <strong style={{ color: 'var(--text-main)' }}>{showRespond.milestone_name}</strong>
                        </p>
                        <form onSubmit={handleRespond} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button type="button"
                                    onClick={() => setRespondData({ ...respondData, status: 'Approved' })}
                                    style={{ 
                                        padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                        border: `2px solid ${respondData.status === 'Approved' ? 'var(--success)' : 'var(--border-color)'}`, 
                                        background: respondData.status === 'Approved' ? 'rgba(16,185,129,0.1)' : 'transparent', 
                                        color: respondData.status === 'Approved' ? 'var(--success)' : 'var(--text-main)', 
                                        fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer'
                                    }}>
                                    <CheckCircle2 size={28} />
                                    Approve
                                </button>
                                <button type="button"
                                    onClick={() => setRespondData({ ...respondData, status: 'Changes Requested' })}
                                    style={{ 
                                        padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                                        border: `2px solid ${respondData.status === 'Changes Requested' ? 'var(--danger)' : 'var(--border-color)'}`, 
                                        background: respondData.status === 'Changes Requested' ? 'rgba(239,68,68,0.1)' : 'transparent', 
                                        color: respondData.status === 'Changes Requested' ? 'var(--danger)' : 'var(--text-main)', 
                                        fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer'
                                    }}>
                                    <AlertCircle size={28} />
                                    Request Changes
                                </button>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Remarks (Optional)</label>
                                <textarea className="input-field" rows="3" placeholder="Any notes or revision requests..."
                                    value={respondData.client_remarks}
                                    onChange={(e) => setRespondData({ ...respondData, client_remarks: e.target.value })}></textarea>
                            </div>
                            <button type="submit" className="btn-primary" disabled={!respondData.status} style={{ marginTop: '0.5rem', padding: '0.75rem', fontWeight: 600 }}>
                                Submit Response
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showView && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Milestone Details</h3>
                            <button onClick={() => setShowView(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Milestone Name</label>
                                <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: '0.25rem 0' }}>{showView.milestone_name}</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Project</label>
                                <p style={{ fontWeight: 500, margin: '0.25rem 0' }}>{showView.project_name}</p>
                            </div>
                            {showView.description && (
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Description</label>
                                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{showView.description}</p>
                                </div>
                            </div>
                            )}
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</label>
                                <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '8px', background: 'var(--bg-main)', fontWeight: 600, marginTop: '0.25rem' }}>{showView.status}</span>
                            </div>
                            {showView.client_remarks && (
                            <div>
                                <label style={{ display: 'block', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>Client Remarks</label>
                                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', color: 'var(--danger)' }}>
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{showView.client_remarks}</p>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Milestone Modal */}
            {showEdit && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Edit Milestone</h3>
                            <button onClick={() => setShowEdit(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Milestone Name</label>
                                <input required className="input-field" type="text"
                                    value={editData.milestone_name}
                                    onChange={(e) => setEditData({ ...editData, milestone_name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                                <textarea className="input-field" rows="4" 
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}></textarea>
                            </div>
                            <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowEdit(null)} className="btn-secondary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MilestoneModule;
