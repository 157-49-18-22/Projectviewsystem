import React, { useState, useEffect } from 'react';
import { Download, Eye, FileText, Send, Upload, DollarSign, Calendar, Users, Trash2 } from 'lucide-react';
import axios from 'axios';
import './InvoiceModule.css';

const InvoiceModule = () => {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isAdmin = user.role === 'Admin';
    const isClient = user.role === 'Client';

    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [invoiceForm, setInvoiceForm] = useState({
        client_id: '',
        amount: '',
        due_date: '',
        invoice_file: null
    });

    useEffect(() => {
        fetchInvoices();
        if (isAdmin) {
            fetchClients();
        }
    }, [isAdmin]);

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('https://projectviewsystem.onrender.com/api/invoices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvoices(res.data);
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('https://projectviewsystem.onrender.com/api/clients', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(res.data);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        }
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        if (!invoiceForm.client_id || !invoiceForm.amount || !invoiceForm.due_date) {
            alert('Please fill all required fields');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('client_id', invoiceForm.client_id);
        formData.append('amount', invoiceForm.amount);
        formData.append('due_date', invoiceForm.due_date);
        if (invoiceForm.invoice_file) {
            formData.append('invoice_file', invoiceForm.invoice_file);
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://projectviewsystem.onrender.com/api/invoices/create', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            setShowCreateModal(false);
            setInvoiceForm({ client_id: '', amount: '', due_date: '', invoice_file: null });
            fetchInvoices();
            alert('Invoice created and sent to client successfully!');
        } catch (err) {
            console.error('Failed to create invoice:', err);
            alert('Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setInvoiceForm({ ...invoiceForm, invoice_file: e.target.files[0] });
    };

    const handleDeleteInvoice = async (invoiceId) => {
        if (!confirm('Are you sure you want to delete this invoice?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`https://projectviewsystem.onrender.com/api/invoices/${invoiceId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchInvoices();
            alert('Invoice deleted successfully');
        } catch (err) {
            console.error('Failed to delete invoice:', err);
            alert('Failed to delete invoice');
        }
    };

    return (
        <div className="module-content">
            <div className="module-header">
                <h2>Invoice Management</h2>
                {isAdmin && (
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        <FileText size={18} /> Create Invoice
                    </button>
                )}
            </div>

            <div className="card data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>{isAdmin ? 'Client' : 'Generated Date'}</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No invoices found
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td><strong>INV-{inv.id}</strong></td>
                                    <td>{isAdmin ? inv.client_name || `Client #${inv.client_id}` : new Date(inv.created_at).toLocaleDateString()}</td>
                                    <td style={{fontWeight: '600'}}>${inv.amount}</td>
                                    <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`status-badge ${inv.status === 'Paid' ? 'status-paid' : 'status-unpaid'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {inv.file_url ? (
                                                <>
                                                    <a 
                                                        href={inv.file_url?.startsWith('http') ? inv.file_url : `https://projectviewsystem.onrender.com${inv.file_url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="icon-btn-small"
                                                        title="View Invoice"
                                                    >
                                                        <Eye size={16} />
                                                    </a>
                                                    <a 
                                                        href={inv.file_url?.startsWith('http') ? inv.file_url : `https://projectviewsystem.onrender.com${inv.file_url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="icon-btn-small"
                                                        title="Download"
                                                        download
                                                    >
                                                        <Download size={16} />
                                                    </a>
                                                </>
                                            ) : (
                                                <span className="no-file-text">No file</span>
                                            )}
                                            {isAdmin && (
                                                <button 
                                                    className="icon-btn-small delete-btn"
                                                    title="Delete Invoice"
                                                    onClick={() => handleDeleteInvoice(inv.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h3>Create New Invoice</h3>
                        <form onSubmit={handleCreateInvoice}>
                            <div className="form-group">
                                <label>Select Client</label>
                                <div className="input-with-icon">
                                    <Users size={18} className="input-icon" />
                                    <select
                                        value={invoiceForm.client_id}
                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, client_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a client</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.contact_person} - {client.company_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Amount ($)</label>
                                <div className="input-with-icon">
                                    <DollarSign size={18} className="input-icon" />
                                    <input
                                        type="number"
                                        value={invoiceForm.amount}
                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                                        placeholder="Enter amount"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Due Date</label>
                                <div className="input-with-icon">
                                    <Calendar size={18} className="input-icon" />
                                    <input
                                        type="date"
                                        value={invoiceForm.due_date}
                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Invoice PDF (Optional)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="file-input"
                                />
                                {invoiceForm.invoice_file && (
                                    <p className="file-name">Selected: {invoiceForm.invoice_file.name}</p>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create & Send Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceModule;

