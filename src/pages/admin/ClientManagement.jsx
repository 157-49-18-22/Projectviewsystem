import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import axios from 'axios';
import './ClientManagement.css';

const API = 'http://localhost:5000/api';

const ClientManagement = () => {
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [formData, setFormData] = useState({ company_name: '', contact_person: '', phone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');

    const token = localStorage.getItem('token');

    // Fetch all clients from backend
    const fetchClients = async () => {
        try {
            setFetchLoading(true);
            const res = await axios.get(`${API}/clients`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(res.data);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleCreateClient = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API}/clients`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Client Created! Welcome email sent to ' + formData.email);
            setFormData({ company_name: '', contact_person: '', phone: '', email: '' });
            setShowModal(false);
            fetchClients(); // Refresh table with real data
        } catch (error) {
            const msg = error.response?.data?.message || 'Server error. Check backend.';
            alert('❌ Error: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    const handleViewClient = (client) => {
        setSelectedClient(client);
        setShowViewModal(true);
    };

    const handleEditClient = (client) => {
        setSelectedClient(client);
        setFormData({
            company_name: client.company_name,
            contact_person: client.contact_person,
            phone: client.phone,
            email: client.email
        });
        setShowEditModal(true);
    };

    const handleUpdateClient = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put(`${API}/clients/${selectedClient.id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Client Updated Successfully!');
            setFormData({ company_name: '', contact_person: '', phone: '', email: '' });
            setShowEditModal(false);
            setSelectedClient(null);
            fetchClients();
        } catch (error) {
            const msg = error.response?.data?.message || 'Server error. Check backend.';
            alert('❌ Error: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClient = async () => {
        setLoading(true);
        try {
            await axios.delete(`${API}/clients/${selectedClient.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Client Deleted Successfully!');
            setShowDeleteModal(false);
            setSelectedClient(null);
            fetchClients();
        } catch (error) {
            const msg = error.response?.data?.message || 'Server error. Check backend.';
            alert('❌ Error: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="module-content">
            <div className="module-header">
                <h2>Client Management</h2>
                <button 
                    className="btn-primary" 
                    style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={18} /> Create Client
                </button>
            </div>

            <div className="card data-table-container">
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search clients..." 
                            className="input-field search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {fetchLoading ? (
                    <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading clients...</p>
                ) : clients.length === 0 ? (
                    <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>No clients found. Create your first client.</p>
                ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Client Code</th>
                            <th>Company Name</th>
                            <th>Contact Person</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients
                            .filter(c => 
                                c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
                                c.email?.toLowerCase().includes(search.toLowerCase())
                            )
                            .map(client => (
                            <tr key={client.id}>
                                <td><strong>{client.client_code || `MD-CL-${String(client.id).padStart(4,'0')}`}</strong></td>
                                <td>{client.company_name}</td>
                                <td>{client.contact_person}</td>
                                <td>{client.email}</td>
                                <td>
                                    <span className={`status-badge ${client.status?.toLowerCase().replace(/ /g, '-')}`}>
                                        {client.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="icon-btn-small" onClick={() => handleViewClient(client)}><Eye size={16} /></button>
                                        <button className="icon-btn-small edit" onClick={() => handleEditClient(client)}><Edit size={16} /></button>
                                        <button className="icon-btn-small delete" onClick={() => { setSelectedClient(client); setShowDeleteModal(true); }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>

            {/* Create Client Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Create New Client</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Company Name</label>
                                <input type="text" required className="input-field" placeholder="e.g. Acme Corp" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contact Person</label>
                                <input type="text" required className="input-field" placeholder="e.g. John Doe" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
                                <input type="email" required className="input-field" placeholder="john@acme.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                                <input type="text" className="input-field" placeholder="+1 234 567 890" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
                                {loading ? 'Creating & Sending Email...' : 'Create Client Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Client Modal */}
            {showViewModal && selectedClient && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Client Details</h3>
                            <button onClick={() => setShowViewModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Client Code</label>
                                <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>{selectedClient.client_code || `MD-CL-${String(selectedClient.id).padStart(4,'0')}`}</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Company Name</label>
                                <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>{selectedClient.company_name}</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Contact Person</label>
                                <p style={{ fontSize: '1rem' }}>{selectedClient.contact_person}</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
                                <p style={{ fontSize: '1rem' }}>{selectedClient.email}</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Phone</label>
                                <p style={{ fontSize: '1rem' }}>{selectedClient.phone || 'Not provided'}</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Status</label>
                                <span className={`status-badge ${selectedClient.status?.toLowerCase().replace(/ /g, '-')}`}>
                                    {selectedClient.status}
                                </span>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Created At</label>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    {new Date(selectedClient.created_at).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {showEditModal && selectedClient && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Edit Client</h3>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleUpdateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Company Name</label>
                                <input type="text" required className="input-field" placeholder="e.g. Acme Corp" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contact Person</label>
                                <input type="text" required className="input-field" placeholder="e.g. John Doe" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
                                <input type="email" required className="input-field" placeholder="john@acme.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                                <input type="text" className="input-field" placeholder="+1 234 567 890" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
                                {loading ? 'Updating...' : 'Update Client'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedClient && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Delete Client</h3>
                            <button onClick={() => setShowDeleteModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Are you sure you want to delete <strong>{selectedClient.company_name}</strong>?
                            </p>
                            <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                                This action cannot be undone. All associated data will be permanently deleted.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                style={{ 
                                    flex: 1, 
                                    padding: '0.75rem', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '8px', 
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteClient}
                                disabled={loading}
                                style={{ 
                                    flex: 1, 
                                    padding: '0.75rem', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    background: '#ef4444',
                                    color: 'white',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientManagement;
