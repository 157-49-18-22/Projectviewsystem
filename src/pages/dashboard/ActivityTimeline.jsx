import React, { useState, useEffect } from 'react';
import { History, CheckCircle, Upload, FileText, PenTool, Star, FolderKanban, User, Clock } from 'lucide-react';
import axios from 'axios';

const API = 'https://projectviewsystem.onrender.com/api';

// Map entity_type to icon and color
const getIconConfig = (entityType, remarks) => {
    const r = (remarks || '').toLowerCase();
    if (r.includes('completed'))       return { icon: <CheckCircle size={24} />, color: '#10b981', bg: 'rgba(16,185,129,0.15)' }; // green
    if (r.includes('approved'))        return { icon: <CheckCircle size={24} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' }; // blue
    if (r.includes('payment'))         return { icon: <FileText size={24} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };    // yellow
    if (r.includes('agreement'))       return { icon: <PenTool size={24} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' };   // purple
    if (r.includes('review'))          return { icon: <Star size={24} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    if (r.includes('project created')) return { icon: <FolderKanban size={24} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' };
    if (r.includes('milestone'))       return { icon: <CheckCircle size={24} />, color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
    if (entityType === 'Client')       return { icon: <User size={24} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
    return { icon: <Clock size={24} />, color: 'var(--text-muted)', bg: 'var(--bg-main)' };
};

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.round(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ActivityTimeline = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get(`${API}/audit`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLogs(res.data);
            } catch (err) {
                console.error('Failed to fetch audit logs', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const entityTypes = ['All', ...new Set(logs.map(l => l.entity_type).filter(Boolean))];
    const filtered = filter === 'All' ? logs : logs.filter(l => l.entity_type === filter);

    return (
        <div className="module-content">
            <div className="module-header" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                        <History size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Audit Timeline</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Monitor system activities and user actions</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={18} />
                        Acknowledge All
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {entityTypes.map(type => (
                    <button key={type} onClick={() => setFilter(type)}
                        style={{
                            padding: '0.4rem 1.25rem',
                            borderRadius: '20px',
                            border: `1px solid ${filter === type ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            background: filter === type ? 'var(--primary-color)' : 'var(--bg-card)',
                            color: filter === type ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            fontWeight: 500,
                            transition: 'all 0.2s ease'
                        }}>
                        {type}
                    </button>
                ))}
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading audit trail...</p>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-color)', background: 'transparent' }}>
                    <History size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>No Activity Found</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                        There are no events recorded for {filter === 'All' ? 'any category' : `the category "${filter}"`} yet.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map((log, index) => {
                        const { icon, color, bg } = getIconConfig(log.entity_type, log.remarks);
                        return (
                            <div key={log.id || index} style={{
                                display: 'flex',
                                gap: '1.25rem',
                                padding: '1.5rem',
                                borderRadius: '16px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                transition: 'all 0.3s ease',
                                cursor: 'default',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                                {/* Colored left border accent */}
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: color, opacity: 0.8 }} />

                                {/* Icon */}
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: bg,
                                    color: color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {icon}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                            {log.remarks || `${log.entity_type} Updated`}
                                        </h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                                            {formatTimeAgo(log.changed_at)}
                                        </span>
                                    </div>
                                    
                                    <div style={{ margin: '0.5rem 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {/* Optional status change indicator */}
                                        {(log.old_status || log.new_status) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {log.old_status && <span style={{ textDecoration: 'line-through', opacity: 0.8 }}>{log.old_status}</span>}
                                                {log.old_status && log.new_status && <span>â†’</span>}
                                                {log.new_status && <strong style={{ color: 'var(--text-main)' }}>{log.new_status}</strong>}
                                            </div>
                                        )}
                                        
                                        {/* Added context like project or company */}
                                        {(log.company_name || log.project_name || log.changed_by_name) && (
                                            <p style={{ margin: 0, lineHeight: 1.5 }}>
                                                {log.changed_by_name && <span>Action by <strong>{log.changed_by_name}</strong> ({log.changed_by_role}). </span>}
                                                {log.project_name && <span>Related to project <strong>{log.project_name}</strong> </span>}
                                                {log.company_name && <span>associated with <strong>{log.company_name}</strong>.</span>}
                                            </p>
                                        )}
                                    </div>

                                    {/* Badges/Tags Row */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '6px',
                                            background: 'rgba(139,92,246,0.1)',
                                            color: '#8b5cf6',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {log.entity_type}
                                        </span>
                                        {log.entity_id && (
                                            <span style={{
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '6px',
                                                background: 'var(--bg-main)',
                                                color: 'var(--text-muted)',
                                                fontSize: '0.7rem',
                                                fontWeight: 600
                                            }}>
                                                ID: {log.entity_id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {filtered.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                            <button style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Clock size={16} /> Load older activity
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityTimeline;


