import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar, User, FolderKanban, Users, Flag, CheckCircle, Clock, AlertCircle, Eye, Trash, Edit, Check } from 'lucide-react';
import axios from 'axios';
import './ProjectDashboard.css';

const API = 'https://projectviewsystem.onrender.com/api';

const ProjectDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isAdmin = user.role === 'Admin';
    const isClient = user.role === 'Client';
    
    console.log('User role:', user.role, 'isAdmin:', isAdmin, 'isClient:', isClient);
    console.log('User object:', user);

    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectDetails, setProjectDetails] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editProjectData, setEditProjectData] = useState({
        id: '',
        project_name: '',
        start_date: '',
        end_date: '',
        status: '',
        milestones: [],
        team: []
    });
    const [formData, setFormData] = useState({ 
        client_id: '', 
        project_name: '', 
        start_date: '', 
        end_date: '',
        milestones: [],
        team_members: []
    });
    const [teamForm, setTeamForm] = useState({ project_id: '', user_id: '', role: '' });
    const [milestoneForm, setMilestoneForm] = useState({ project_id: '', milestone_name: '', description: '', attachment_url: '' });
    const [newMilestone, setNewMilestone] = useState({ name: '', description: '' });
    const [newTeamMember, setNewTeamMember] = useState({ name: '', designation: '' });
    const [filterStatus, setFilterStatus] = useState('All');
    
    const token = localStorage.getItem('token');

    const fetchProjects = async () => {
        try {
            const res = await axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await axios.get(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } });
            setClients(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const res = await axios.get(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
            setTeamMembers(res.data.filter(u => u.role === 'Team Member'));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProjectDetails = async (projectId) => {
        try {
            const res = await axios.get(`${API}/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
            setProjectDetails(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchProjects();
        fetchClients();
        if (isAdmin) {
            fetchTeamMembers();
        }
    }, [isAdmin]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API}/projects`, formData, { headers: { Authorization: `Bearer ${token}` } });
            
            alert('âœ… Project created successfully!');
            setShowModal(false);
            setFormData({ client_id: '', project_name: '', start_date: '', end_date: '', milestones: [], team_members: [] });
            setNewMilestone({ name: '', description: '' });
            setNewTeamMember({ name: '', designation: '' });
            fetchProjects();
        } catch (err) {
            alert('âŒ Error: ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const addMilestone = () => {
        console.log('Adding milestone:', newMilestone);
        if (!newMilestone.name || !newMilestone.description) {
            alert('Please fill in both milestone name and description');
            return;
        }
        setFormData({ ...formData, milestones: [...formData.milestones, newMilestone] });
        setNewMilestone({ name: '', description: '' });
        console.log('Milestone added successfully');
    };

    const removeMilestone = (index) => {
        setFormData({ ...formData, milestones: formData.milestones.filter((_, i) => i !== index) });
    };

    const addTeamMember = () => {
        console.log('Adding team member:', newTeamMember);
        if (!newTeamMember.name || !newTeamMember.designation) {
            alert('Please fill in both member name and designation');
            return;
        }
        setFormData({ ...formData, team_members: [...formData.team_members, newTeamMember] });
        setNewTeamMember({ name: '', designation: '' });
        console.log('Team member added successfully');
    };

    const removeTeamMember = (index) => {
        setFormData({ ...formData, team_members: formData.team_members.filter((_, i) => i !== index) });
    };

    const handleAssignTeam = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/projects/assign`, teamForm, { headers: { Authorization: `Bearer ${token}` } });
            alert('âœ… Team member assigned successfully!');
            setShowTeamModal(false);
            setTeamForm({ project_id: '', user_id: '', role: '' });
            fetchProjectDetails(teamForm.project_id);
        } catch (err) {
            alert('âŒ Error: ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const handleCreateMilestone = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/projects/${milestoneForm.project_id}/milestones`, milestoneForm, { headers: { Authorization: `Bearer ${token}` } });
            alert('âœ… Milestone created successfully!');
            setShowMilestoneModal(false);
            setMilestoneForm({ project_id: '', milestone_name: '', description: '', attachment_url: '' });
            fetchProjects();
            if (selectedProject) fetchProjectDetails(selectedProject);
        } catch (err) {
            alert('âŒ Error: ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            const currentToken = localStorage.getItem('token');
            const updateData = {
                project_name: editProjectData.project_name,
                start_date: editProjectData.start_date,
                end_date: editProjectData.end_date,
                status: editProjectData.status
            };
            await axios.put(`${API}/projects/${editProjectData.id}`, updateData, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });
            setShowEditModal(false);
            fetchProjects();
            alert('Project updated successfully!');
        } catch (err) {
            console.error('Failed to update project:', err);
            alert('Error updating project');
        }
    };

    const handleMilestoneAction = async (milestoneId, status, remarks = '') => {
        try {
            await axios.put(`${API}/projects/milestones/${milestoneId}`, 
                { status, client_remarks: remarks },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchProjects();
            fetchProjectDetails(selectedProject);
            alert(`Milestone ${status} successfully!`);
        } catch (err) {
            alert('âŒ Error: ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const handleMarkComplete = async () => {
        if (!confirm('Are you sure you want to mark this project as complete?')) return;
        
        try {
            await axios.post(`${API}/projects/${selectedProject}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
            alert('âœ… Project marked as complete!');
            setProjectDetails(null);
            fetchProjects();
        } catch (err) {
            alert('âŒ Error: ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const handleDeleteProject = async () => {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
        
        try {
            await axios.delete(`${API}/projects/${selectedProject}`, { headers: { Authorization: `Bearer ${token}` } });
            alert('âœ… Project deleted successfully!');
            setProjectDetails(null);
            fetchProjects();
        } catch (err) {
            alert('âŒ Error: ' + (err.response?.data?.message || 'Server error'));
        }
    };

    const calculateProgress = (milestones) => {
        // Only count milestones that have been submitted (exclude 'Not Submitted' templates)
        const submitted = (milestones || []).filter(m => m.status !== 'Not Submitted');
        if (submitted.length === 0) return { pct: 0, approved: 0, total: submitted.length, pending: 0, remaining: 0 };
        const approved = submitted.filter(m => m.status === 'Approved').length;
        const pending  = submitted.filter(m => m.status === 'Pending Approval').length;
        const remaining = submitted.length - approved;
        const pct = Math.round((approved / submitted.length) * 100);
        return { pct, approved, total: submitted.length, pending, remaining };
    };

    const getMilestoneIcon = (status) => {
        switch (status) {
            case 'Approved':
                return <CheckCircle size={18} className="success-text" />;
            case 'Changes Requested':
                return <AlertCircle size={18} className="warning-text" />;
            default:
                return <Clock size={18} className="pending-text" />;
        }
    };

    const getFilteredProjects = () => {
        if (filterStatus === 'All') return projects;
        return projects.filter(p => p.status === filterStatus);
    };

    const statusColor = (status) => {
        if (status === 'Working') return '#10b981';
        if (status === 'Active') return 'var(--success)';
        if (status === 'Completed') return 'var(--primary-color)';
        return 'var(--text-muted)';
    };

    const getStatusClass = (status) => {
        const map = {
            'Not Started': 'not-started',
            'Working': 'working',
            'Active': 'active',
            'Completed': 'completed',
        };
        return map[status] || 'not-started';
    };

    return (
        <div className="module-content" style={{ maxWidth: '1440px', margin: '0 auto' }}>
            {/* Hero Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Project Management</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: '600px', lineHeight: '1.4' }}>
                        Track and manage your active audit projects. Oversee milestones, compliance levels, and client approvals in real-time.
                    </p>
                </div>
                {isAdmin && (
                    <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: '10px', fontWeight: 600, boxShadow: '0 8px 16px rgba(99,102,241,0.2)' }}
                        onClick={() => setShowModal(true)}>
                        <Plus size={20} /> Create Project
                    </button>
                )}
            </div>

            {/* Dashboard Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {['All', 'Working', 'Pending Approval', 'Completed'].map(t => (
                    <button 
                        key={t} 
                        onClick={() => setFilterStatus(t)}
                        style={{ 
                            padding: '0.5rem 1.25rem', 
                            borderRadius: '20px', 
                            background: filterStatus === t ? 'var(--primary-color)' : 'var(--bg-card)', 
                            color: filterStatus === t ? 'white' : 'var(--text-muted)', 
                            fontWeight: 600, 
                            fontSize: '0.85rem', 
                            border: filterStatus === t ? 'none' : '1px solid var(--border-color)', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s', 
                            whiteSpace: 'nowrap' 
                        }}
                        onMouseEnter={e => { if (filterStatus !== t) e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                        onMouseLeave={e => { if (filterStatus !== t) e.currentTarget.style.background = 'var(--bg-card)'; }}
                    >
                         {t}
                    </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Sort by: Newest</span>
                </div>
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading projects...</p>
            ) : projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                    <FolderKanban size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No Projects Found</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {isAdmin ? 'Create your first project by clicking the button above.' : 'No projects assigned to you yet.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {getFilteredProjects().map(p => {
                        const total = Number(p.total_milestones) || 0;
                        const approved = Number(p.approved_milestones) || 0;
                        const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
                        
                        let badgeBg, badgeColor, badgeText;
                        if (p.status === 'Completed') { badgeBg = 'rgba(16,185,129,0.15)'; badgeColor = '#10b981'; badgeText = 'COMPLETED'; }
                        else if (p.status === 'Working') { badgeBg = 'rgba(99,102,241,0.15)'; badgeColor = '#6366f1'; badgeText = 'WORKING'; }
                        else if (p.status === 'Active') { badgeBg = 'rgba(16,185,129,0.15)'; badgeColor = '#10b981'; badgeText = 'ACTIVE'; }
                        else if (p.status === 'Pending Approval') { badgeBg = 'rgba(245,158,11,0.15)'; badgeColor = '#f59e0b'; badgeText = 'PENDING'; }
                        else { badgeBg = 'var(--bg-main)'; badgeColor = 'var(--text-muted)'; badgeText = p.status?.toUpperCase() || 'NOT STARTED'; }

                        return (
                        <div key={p.id} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px',
                            padding: '1.5rem', transition: 'transform 0.2s, box-shadow 0.2s',
                            display: 'flex', flexDirection: 'column', 
                            boxShadow: '0 4px 20px -4px rgba(67, 67, 213, 0.08)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(67, 67, 213, 0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px -4px rgba(67, 67, 213, 0.08)'; }}>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, transition: 'color 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-color)'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-main)'}>
                                        {p.project_name}
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        <User size={14} />
                                        <span>{isAdmin ? p.company_name : 'Your Project'}</span>
                                    </div>
                                </div>
                                <span style={{ background: badgeBg, color: badgeColor, padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                                    {badgeText}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <Calendar size={14} />
                                <span>{p.start_date?.split('T')[0]} ? {p.end_date?.split('T')[0]}</span>
                            </div>

                            {/* Progress Meter */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: pct === 100 ? '#10b981' : 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 700 }}>
                                        <Flag size={14} />
                                        <span>{total === 0 ? 'No milestones' : `${approved} / ${total} Approved`}</span>
                                    </div>
                                    
                                    {total > 0 && pct < 100 && (
                                        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>
                                            {total - approved} LEFT
                                        </span>
                                    )}
                                    {total > 0 && pct === 100 && (
                                        <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>
                                            DONE
                                        </span>
                                    )}
                                </div>
                                
                                <div style={{ height: '8px', width: '100%', background: 'var(--bg-main)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: total === 0 ? '0%' : `${pct}%`,
                                        background: pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg, #8b5cf6, #6d28d9)',
                                        boxShadow: pct > 0 ? (pct === 100 ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(139,92,246,0.6)') : 'none',
                                        transition: 'width 0.6s ease'
                                    }} />
                                </div>
                            </div>

                            {/* Action Button */}
                            <button style={{
                                width: '100%', padding: '0.75rem', marginTop: 'auto',
                                background: 'var(--bg-main)', color: 'var(--text-muted)',
                                border: 'none', borderRadius: '8px', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            onClick={() => { setSelectedProject(p.id); fetchProjectDetails(p.id); }}>
                                <Eye size={16} /> View Details
                            </button>
                        </div>
                        );
                    })}
                    
                    {/* Skeleton / Add Card Placeholder (Admin Only) */}
                    {isAdmin && (
                        <div style={{
                            border: '2px dashed var(--border-color)', borderRadius: '16px', padding: '1.5rem',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                            color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', background: 'transparent'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        onClick={() => setShowModal(true)}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Plus size={32} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Start New Project</span>
                        </div>
                    )}
                </div>
            )}

            {/* Project Details Modal */}
            {projectDetails && (
                <div className="modal-overlay">
                    <div className="modal-card large-modal">
                        <div className="modal-header">
                            <h3>{projectDetails.project_info?.project_name || projectDetails.project_name}</h3>
                            <div className="modal-header-actions">
                                {isAdmin && (
                                    <>
                                        <button 
                                            className="btn-small p-2 bg-[#e1e0ff] text-[#4648d4] rounded-lg border-none cursor-pointer"
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                                            onClick={async () => {
                                                const projectId = projectDetails.project_info.id;
                                                try {
                                                    const res = await axios.get(`${API}/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
                                                    setEditProjectData({
                                                        id: res.data.project_info.id,
                                                        project_name: res.data.project_info.project_name,
                                                        start_date: res.data.project_info.start_date.split('T')[0],
                                                        end_date: res.data.project_info.end_date.split('T')[0],
                                                        status: res.data.project_info.status,
                                                        milestones: res.data.milestones || [],
                                                        team: res.data.team || []
                                                    });
                                                    setProjectDetails(null);
                                                    setShowEditModal(true);
                                                } catch (err) {
                                                    console.error('Error fetching project details:', err);
                                                    alert('Error loading project details');
                                                }
                                            }}
                                        >
                                            <Edit size={14} /> Edit
                                        </button>
                                        {projectDetails.project_info?.status !== 'Completed' && (
                                            <button 
                                                className="btn-small complete-btn"
                                                onClick={handleMarkComplete}
                                            >
                                                <CheckCircle size={14} /> Mark Complete
                                            </button>
                                        )}
                                        <button 
                                            className="btn-small delete-btn"
                                            onClick={handleDeleteProject}
                                        >
                                            <Trash size={14} /> Delete
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setProjectDetails(null)}><X size={24} /></button>
                            </div>
                        </div>

                        <div className="project-details-content">
                            {/* Team Section */}
                            <div className="detail-section">
                                <div className="section-header">
                                    <h4><Users size={18} /> Team Members</h4>
                                    {isAdmin && (
                                        <button 
                                            className="btn-small"
                                            onClick={() => {
                                                setTeamForm({ ...teamForm, project_id: projectDetails.project_info.id });
                                                setShowTeamModal(true);
                                            }}
                                        >
                                            <Plus size={14} /> Add Member
                                        </button>
                                    )}
                                </div>
                                {projectDetails.team.length === 0 ? (
                                    <p className="empty-state">No team members assigned yet</p>
                                ) : (
                                    <div className="team-list">
                                        {projectDetails.team.map(member => (
                                            <div key={member.id} className="team-member">
                                                <div className="member-info">
                                                    <strong>{member.name}</strong>
                                                    <span className="member-role">{member.role}</span>
                                                </div>
                                                <span className="member-email">{member.email}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Milestones Section */}
                            <div className="detail-section">
                                <div className="section-header">
                                    <h4><Flag size={18} /> Milestones</h4>
                                    {isAdmin && (
                                        <button 
                                            className="btn-small"
                                            onClick={() => setShowMilestoneModal(true)}
                                        >
                                            <Plus size={14} /> Add Milestone
                                        </button>
                                    )}
                                </div>
                                {projectDetails.milestones.length === 0 ? (
                                    <p className="empty-state">No milestones created yet</p>
                                ) : (
                                    <div className="milestone-list">
                                        {projectDetails.milestones.map(milestone => (
                                            <div key={milestone.id} className="milestone-item">
                                                <div className="milestone-header">
                                                    {getMilestoneIcon(milestone.status)}
                                                    <strong>{milestone.milestone_name}</strong>
                                                    <span className={`milestone-status status-${milestone.status.toLowerCase().replace(' ', '-')}`}>
                                                        {milestone.status}
                                                    </span>
                                                </div>
                                                <p className="milestone-description">{milestone.description}</p>
                                                {milestone.client_remarks && (
                                                    <p className="milestone-remarks"><strong>Client Remarks:</strong> {milestone.client_remarks}</p>
                                                )}
                                                {isClient && milestone.status === 'Pending Approval' && (
                                                    <div className="milestone-actions">
                                                        <button 
                                                            className="btn-small approve-btn"
                                                            onClick={() => handleMilestoneAction(milestone.id, 'Approved')}
                                                        >
                                                            <Check size={14} /> Approve
                                                        </button>
                                                        <button 
                                                            className="btn-small reject-btn"
                                                            onClick={() => {
                                                                const remarks = prompt('Enter your remarks for changes:');
                                                                if (remarks) {
                                                                    handleMilestoneAction(milestone.id, 'Changes Requested', remarks);
                                                                }
                                                            }}
                                                        >
                                                            <X size={14} /> Request Changes
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Progress Chart */}
                            {(() => {
                                const prog = calculateProgress(projectDetails.milestones || []);
                                return (
                                <div className="detail-section">
                                    <h4><CheckCircle size={18} /> Project Progress</h4>
                                    <div className="progress-chart">
                                        {/* Percentage label */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {prog.total === 0 ? 'No milestones submitted yet' : `${prog.approved} of ${prog.total} milestones completed`}
                                            </span>
                                            <span style={{
                                                fontSize: '1.4rem',
                                                fontWeight: 800,
                                                background: prog.pct === 100
                                                    ? 'linear-gradient(135deg,#10b981,#059669)'
                                                    : 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text'
                                            }}>{prog.pct}%</span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{
                                            height: '18px',
                                            background: 'rgba(255,255,255,0.07)',
                                            borderRadius: '20px',
                                            overflow: 'visible',
                                            position: 'relative',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                        }}>
                                            <div style={{
                                                height: '18px',
                                                width: prog.total === 0 ? '0%' : `${Math.max(prog.pct, prog.pct > 0 ? 4 : 0)}%`,
                                                borderRadius: '20px',
                                                background: prog.pct === 100
                                                    ? 'linear-gradient(90deg,#10b981,#059669)'
                                                    : 'linear-gradient(90deg,#8b5cf6,#6d28d9)',
                                                boxShadow: prog.pct > 0
                                                    ? (prog.pct === 100
                                                        ? '0 0 16px rgba(16,185,129,0.7)'
                                                        : '0 0 16px rgba(139,92,246,0.7)')
                                                    : 'none',
                                                transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                                                position: 'relative'
                                            }} />
                                        </div>

                                        {/* Stats Row */}
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.4rem 0.9rem', borderRadius:'20px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)' }}>
                                                <CheckCircle size={14} color="#10b981" />
                                                <span style={{ fontSize:'0.85rem', color:'#10b981', fontWeight:600 }}>Approved: {prog.approved}</span>
                                            </div>
                                            {prog.pending > 0 && (
                                                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.4rem 0.9rem', borderRadius:'20px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)' }}>
                                                    <Clock size={14} color="#f59e0b" />
                                                    <span style={{ fontSize:'0.85rem', color:'#f59e0b', fontWeight:600 }}>Pending: {prog.pending}</span>
                                                </div>
                                            )}
                                            {prog.remaining > 0 && (
                                                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.4rem 0.9rem', borderRadius:'20px', background:'rgba(251,146,60,0.1)', border:'1px solid rgba(251,146,60,0.25)' }}>
                                                    <Flag size={14} color="#fb923c" />
                                                    <span style={{ fontSize:'0.85rem', color:'#fb923c', fontWeight:600 }}>{prog.remaining} remaining</span>
                                                </div>
                                            )}
                                            {prog.pct === 100 && (
                                                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.4rem 0.9rem', borderRadius:'20px', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)' }}>
                                                    <span style={{ fontSize:'0.85rem', color:'#10b981', fontWeight:700 }}>ðŸŽ‰ All Done!</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Project - Full Panel Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-[rgba(11,28,48,0.55)] backdrop-blur-sm" style={{fontFamily: "'Inter', sans-serif"}}>
                    <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '92vh' }}>

                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e2e8f0]" style={{ flexShrink: 0 }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#e1e0ff] rounded-xl" style={{ color: '#4648d4' }}>
                                    <Edit size={20} />
                                </div>
                                <div>
                                    <h2 className="text-[18px] font-bold text-[#0b1c30] m-0" style={{fontFamily: "'Hanken Grotesk', sans-serif"}}>Edit Project</h2>
                                    <p className="text-[12px] text-[#64748b] m-0">Manage details, milestones & team</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '6px', borderRadius: '8px' }}>
                                <X size={22} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>

                            {/* ── Section 1: Project Info ── */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '1rem' }}>Project Info</p>
                                <form id="editProjectForm" onSubmit={handleUpdateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0b1c30', marginBottom: '6px' }}>Project Name</label>
                                        <input
                                            type="text" required
                                            style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                            value={editProjectData.project_name}
                                            onChange={(e) => setEditProjectData({ ...editProjectData, project_name: e.target.value })}
                                            onFocus={e => e.target.style.borderColor = '#4648d4'}
                                            onBlur={e => e.target.style.borderColor = '#c7c4d7'}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0b1c30', marginBottom: '6px' }}>Start Date</label>
                                            <input type="date" required
                                                style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                                value={editProjectData.start_date}
                                                onChange={(e) => setEditProjectData({ ...editProjectData, start_date: e.target.value })}
                                                onFocus={e => e.target.style.borderColor = '#4648d4'}
                                                onBlur={e => e.target.style.borderColor = '#c7c4d7'}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0b1c30', marginBottom: '6px' }}>End Date</label>
                                            <input type="date" required
                                                style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                                value={editProjectData.end_date}
                                                onChange={(e) => setEditProjectData({ ...editProjectData, end_date: e.target.value })}
                                                onFocus={e => e.target.style.borderColor = '#4648d4'}
                                                onBlur={e => e.target.style.borderColor = '#c7c4d7'}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0b1c30', marginBottom: '6px' }}>Status</label>
                                        <select required
                                            style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box', appearance: 'none' }}
                                            value={editProjectData.status}
                                            onChange={(e) => setEditProjectData({ ...editProjectData, status: e.target.value })}
                                        >
                                            <option value="Not Started">Not Started</option>
                                            <option value="Working">Working</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </form>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 1.75rem 0' }} />

                            {/* ── Section 2: Milestones ── */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '1rem' }}>Milestones</p>

                                {/* Existing milestones list */}
                                {editProjectData.milestones?.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                        {editProjectData.milestones.map((m) => (
                                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.status === 'Approved' ? '#10b981' : m.status === 'Pending Approval' ? '#f59e0b' : '#94a3b8', flexShrink: 0 }}></div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{m.milestone_name}</p>
                                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{m.status}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`Delete milestone "${m.milestone_name}"?`)) return;
                                                        try {
                                                            await axios.delete(`${API}/projects/milestones/${m.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                                            const res = await axios.get(`${API}/projects/${editProjectData.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                                            setEditProjectData({ ...editProjectData, milestones: res.data.milestones });
                                                        } catch(e) { alert('Error deleting milestone'); }
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '6px', display: 'flex' }}
                                                >
                                                    <Trash size={15} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 1rem 0' }}>No milestones yet.</p>
                                )}

                                {/* Add new milestone */}
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px dashed #c7c4d7' }}>
                                    <p style={{ margin: '0 0 10px 0', fontWeight: 600, fontSize: '13px', color: '#0b1c30' }}>+ Add Milestone</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input
                                            type="text" placeholder="Milestone name"
                                            value={milestoneForm.milestone_name}
                                            onChange={e => setMilestoneForm({ ...milestoneForm, milestone_name: e.target.value, project_id: editProjectData.id })}
                                            style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <textarea
                                            placeholder="Description (optional)" rows={2}
                                            value={milestoneForm.description}
                                            onChange={e => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                                            style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!milestoneForm.milestone_name) { alert('Enter milestone name'); return; }
                                                try {
                                                    await axios.post(`${API}/projects/${editProjectData.id}/milestones`, milestoneForm, { headers: { Authorization: `Bearer ${token}` } });
                                                    const res = await axios.get(`${API}/projects/${editProjectData.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                                    setEditProjectData({ ...editProjectData, milestones: res.data.milestones });
                                                    setMilestoneForm({ project_id: editProjectData.id, milestone_name: '', description: '', attachment_url: '' });
                                                } catch(e) { alert('Error adding milestone'); }
                                            }}
                                            style={{ alignSelf: 'flex-end', padding: '8px 16px', background: '#4648d4', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 1.75rem 0' }} />

                            {/* ── Section 3: Team Members ── */}
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '1rem' }}>Team Members</p>

                                {/* Existing members */}
                                {editProjectData.team?.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                        {editProjectData.team.map((member) => (
                                            <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e1e0ff', color: '#4648d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                                                        {member.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{member.name}</p>
                                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{member.role} · {member.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 1rem 0' }}>No team members yet.</p>
                                )}

                                {/* Assign new member */}
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px dashed #c7c4d7' }}>
                                    <p style={{ margin: '0 0 10px 0', fontWeight: 600, fontSize: '13px', color: '#0b1c30' }}>+ Assign Member</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <select
                                            value={teamForm.user_id}
                                            onChange={e => setTeamForm({ ...teamForm, user_id: e.target.value, project_id: editProjectData.id })}
                                            style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                                        >
                                            <option value="">-- Select Team Member --</option>
                                            {teamMembers.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text" placeholder="Role (e.g. Developer)"
                                            value={teamForm.role}
                                            onChange={e => setTeamForm({ ...teamForm, role: e.target.value })}
                                            style={{ width: '100%', border: '1.5px solid #c7c4d7', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!teamForm.user_id || !teamForm.role) { alert('Select member and enter role'); return; }
                                                try {
                                                    await axios.post(`${API}/projects/assign`, { ...teamForm, project_id: editProjectData.id }, { headers: { Authorization: `Bearer ${token}` } });
                                                    const res = await axios.get(`${API}/projects/${editProjectData.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                                    setEditProjectData({ ...editProjectData, team: res.data.team });
                                                    setTeamForm({ project_id: editProjectData.id, user_id: '', role: '' });
                                                } catch(e) { alert('Error assigning team member'); }
                                            }}
                                            style={{ alignSelf: 'flex-end', padding: '8px 16px', background: '#4648d4', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Assign
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8f9ff', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                            <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button type="submit" form="editProjectForm" style={{ padding: '10px 24px', background: '#4648d4', color: 'white', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(70,72,212,0.3)' }}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Create Project Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(11,28,48,0.4)] backdrop-blur-sm" style={{fontFamily: "'Inter', sans-serif"}}>
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-8 py-6 border-b border-[#c7c4d7]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#e1e0ff] rounded-lg text-[#4648d4]">
                                    <span className="material-symbols-outlined">create_new_folder</span>
                                </div>
                                <h2 className="text-[20px] font-semibold text-[#0b1c30]" style={{fontFamily: "'Hanken Grotesk', sans-serif"}}>Create New Project</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-[#464554] hover:text-[#ba1a1a] transition-colors p-1 rounded-full hover:bg-[#ffdad6]">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6" style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#d3e4fe transparent'
                        }}>
                            <form id="createProjectForm" onSubmit={handleCreate} className="space-y-6">
                                {/* Client Selection */}
                                <div className="space-y-2 text-left">
                                    <label className="block text-[14px] font-bold text-[#0b1c30]">Select Client</label>
                                    <div className="relative">
                                        <select 
                                            required
                                            className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                            value={formData.client_id}
                                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                        >
                                            <option value="">-- Choose a client --</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.company_name} ({c.contact_person})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Project Name */}
                                <div className="space-y-2 text-left">
                                    <label className="block text-[14px] font-bold text-[#0b1c30]">Project Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                        placeholder="e.g. Website Redesign"
                                        value={formData.project_name}
                                        onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                    />
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-2 gap-6 text-left">
                                    <div className="space-y-2">
                                        <label className="block text-[14px] font-bold text-[#0b1c30]">Start Date</label>
                                        <div className="relative">
                                            <input 
                                                type="date"
                                                required
                                                className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                                value={formData.start_date}
                                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[14px] font-bold text-[#0b1c30]">End Date</label>
                                        <div className="relative">
                                            <input 
                                                type="date"
                                                required
                                                className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                                value={formData.end_date}
                                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-[#c7c4d7] my-4"></div>

                                {/* Milestones Section */}
                                <div className="space-y-4 text-left">
                                    <div className="flex items-center gap-2 text-[#4648d4]">
                                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>flag</span>
                                        <h3 className="text-[18px] font-semibold" style={{fontFamily: "'Inter', sans-serif"}}>Milestones</h3>
                                    </div>
                                    
                                    {formData.milestones.length > 0 && (
                                        <div className="space-y-3 mb-4">
                                            {formData.milestones.map((milestone, index) => (
                                                <div key={index} className="flex justify-between items-center bg-[#f8f9ff] p-4 rounded-xl border border-[#c7c4d7]/40 shadow-sm">
                                                    <div>
                                                        <p className="font-bold text-[14px] text-[#0b1c30]">{milestone.name}</p>
                                                        <p className="text-[13px] text-[#464554] mt-1">{milestone.description}</p>
                                                    </div>
                                                    <button type="button" onClick={() => removeMilestone(index)} className="text-[#ba1a1a] hover:bg-[#ffdad6] p-2 rounded-lg transition-colors flex items-center justify-center">
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-[#eff4ff] rounded-xl p-6 border border-[#c7c4d7] space-y-4 shadow-sm">
                                        <div className="grid grid-cols-12 gap-4">
                                            <div className="col-span-5 text-left">
                                                <label className="block text-[12px] font-medium uppercase tracking-wider text-[#464554] mb-2">Milestone Name</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                                    placeholder="e.g. Design Phase"
                                                    value={newMilestone.name}
                                                    onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-7 text-left">
                                                <label className="block text-[12px] font-medium uppercase tracking-wider text-[#464554] mb-2">Description</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                                    placeholder="Brief description"
                                                    value={newMilestone.description}
                                                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <button type="button" onClick={addMilestone} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#4648d4] rounded-xl text-[#4648d4] font-bold hover:bg-[#6063ee]/10 transition-colors">
                                            <span className="material-symbols-outlined">add_circle</span>
                                            Add Milestone
                                        </button>
                                    </div>
                                    
                                    {formData.milestones.length === 0 && (
                                        <div className="text-center py-4">
                                            <p className="text-[#464554] text-[14px]">No milestones added yet. Add one to track progress.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-[#c7c4d7] my-4"></div>

                                {/* Team Members Section */}
                                <div className="space-y-4 text-left">
                                    <div className="flex items-center gap-2 text-[#4648d4]">
                                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>group</span>
                                        <h3 className="text-[18px] font-semibold" style={{fontFamily: "'Inter', sans-serif"}}>Team Members</h3>
                                    </div>
                                    
                                    {formData.team_members.length > 0 && (
                                        <div className="space-y-3 mb-4">
                                            {formData.team_members.map((member, index) => (
                                                <div key={index} className="flex justify-between items-center bg-[#f8f9ff] p-4 rounded-xl border border-[#c7c4d7]/40 shadow-sm">
                                                    <div>
                                                        <p className="font-bold text-[14px] text-[#0b1c30]">{member.name}</p>
                                                        <p className="text-[13px] text-[#464554] mt-1">{member.designation}</p>
                                                    </div>
                                                    <button type="button" onClick={() => removeTeamMember(index)} className="text-[#ba1a1a] hover:bg-[#ffdad6] p-2 rounded-lg transition-colors flex items-center justify-center">
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-[#eff4ff] rounded-xl p-6 border border-[#c7c4d7] space-y-4 shadow-sm">
                                        <div className="grid grid-cols-12 gap-4">
                                            <div className="col-span-5 text-left">
                                                <label className="block text-[12px] font-medium uppercase tracking-wider text-[#464554] mb-2">Member Name</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                                    placeholder="e.g. John Doe"
                                                    value={newTeamMember.name}
                                                    onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-7 text-left">
                                                <label className="block text-[12px] font-medium uppercase tracking-wider text-[#464554] mb-2">Designation</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-white border border-[#c7c4d7] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#4648d4] focus:ring-2 focus:ring-[#e1e0ff] transition-all"
                                                    placeholder="e.g. Senior Developer"
                                                    value={newTeamMember.designation}
                                                    onChange={(e) => setNewTeamMember({ ...newTeamMember, designation: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <button type="button" onClick={addTeamMember} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#4648d4] rounded-xl text-[#4648d4] font-bold hover:bg-[#6063ee]/10 transition-colors">
                                            <span className="material-symbols-outlined">person_add</span>
                                            Add Team Member
                                        </button>
                                    </div>
                                    
                                    {formData.team_members.length === 0 && (
                                        <div className="text-center py-4">
                                            <p className="text-[#464554] text-[14px]">No team members added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 border-t border-[#c7c4d7] bg-[#f8f9ff] flex justify-end gap-3 rounded-b-3xl">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl text-[16px] font-semibold text-[#464554] hover:bg-[#dce9ff] transition-colors border-none bg-transparent cursor-pointer">
                                Cancel
                            </button>
                            <button type="submit" form="createProjectForm" className="px-8 py-3 bg-[#4648d4] text-white rounded-xl text-[16px] font-semibold shadow-lg shadow-[#4648d4]/30 hover:shadow-[#4648d4]/50 hover:-translate-y-0.5 active:translate-y-0 transition-all border-none cursor-pointer">
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Team Modal */}
            {showTeamModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Assign Team Member</h3>
                            <button onClick={() => setShowTeamModal(false)}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleAssignTeam} className="project-form">
                            <div className="form-group">
                                <label>Select Team Member</label>
                                <select
                                    required
                                    value={teamForm.user_id}
                                    onChange={(e) => setTeamForm({ ...teamForm, user_id: e.target.value })}
                                >
                                    <option value="">-- Choose a team member --</option>
                                    {teamMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Role/Designation</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Developer, Designer, Project Manager"
                                    value={teamForm.role}
                                    onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })} 
                                />
                            </div>
                            <button type="submit" className="btn-primary">Assign Member</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Milestone Modal */}
            {showMilestoneModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Create Milestone</h3>
                            <button onClick={() => setShowMilestoneModal(false)}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreateMilestone} className="project-form">
                            <div className="form-group">
                                <label>Select Project</label>
                                <select 
                                    required 
                                    value={milestoneForm.project_id}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, project_id: e.target.value })} 
                                >
                                    <option value="">Select a project...</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>{project.project_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Milestone Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Design Phase Complete"
                                    value={milestoneForm.milestone_name}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, milestone_name: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea 
                                    required 
                                    rows="3"
                                    placeholder="Describe this milestone..."
                                    value={milestoneForm.description}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Attachment URL (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="https://..."
                                    value={milestoneForm.attachment_url}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, attachment_url: e.target.value })} 
                                />
                            </div>
                            <button type="submit" className="btn-primary">Create Milestone</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDashboard;


