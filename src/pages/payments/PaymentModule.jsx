import React, { useState, useEffect } from 'react';
import { Upload, Download, Eye, CheckCircle, XCircle, Clock, DollarSign, FileText, Check, X } from 'lucide-react';
import axios from 'axios';
import './PaymentModule.css';

const PaymentModule = () => {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isAdmin = user.role === 'Admin';
    const isClient = user.role === 'Client';

    const [payments, setPayments] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedPaymentId, setSelectedPaymentId] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [paymentForm, setPaymentForm] = useState({
        invoice_id: '',
        payment_proof: null
    });

    useEffect(() => {
        fetchPayments();
        if (isClient) {
            fetchInvoices();
        }
    }, [isClient]);

    const fetchPayments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('https://projectviewsystem.onrender.com/api/payments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPayments(res.data);
        } catch (err) {
            console.error('Failed to fetch payments:', err);
        }
    };

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('https://projectviewsystem.onrender.com/api/invoices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvoices(res.data.filter(inv => inv.status === 'Sent'));
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
        }
    };

    const handleUploadPayment = async (e) => {
        e.preventDefault();
        if (!paymentForm.invoice_id || !paymentForm.payment_proof) {
            alert('Please select an invoice and upload payment proof');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('invoice_id', paymentForm.invoice_id);
        formData.append('payment_proof', paymentForm.payment_proof);

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://projectviewsystem.onrender.com/api/payments/upload', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            setShowUploadModal(false);
            setSelectedPaymentId(null);
            setPaymentForm({ invoice_id: '', payment_proof: null });
            fetchPayments();
            alert('Payment proof uploaded successfully!');
        } catch (err) {
            console.error('Failed to upload payment:', err);
            alert('Failed to upload payment proof');
        } finally {
            setLoading(false);
        }
    };

    const handleResubmitPayment = (payment) => {
        setSelectedPaymentId(payment.id);
        setPaymentForm({ invoice_id: payment.invoice_id, payment_proof: null });
        setShowUploadModal(true);
    };

    const handleFileChange = (e) => {
        setPaymentForm({ ...paymentForm, payment_proof: e.target.files[0] });
    };

    const handleApprovePayment = async (paymentId) => {
        if (!confirm('Are you sure you want to approve this payment?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://projectviewsystem.onrender.com/api/payments/approve', 
                { payment_id: paymentId, status: 'Approved' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchPayments();
            alert('Payment approved successfully');
        } catch (err) {
            console.error('Failed to approve payment:', err);
            alert('Failed to approve payment');
        }
    };

    const handleRejectPayment = async (paymentId) => {
        const reason = prompt('Please enter rejection reason:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://projectviewsystem.onrender.com/api/payments/approve',
                { payment_id: paymentId, status: 'Rejected', rejection_reason: reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchPayments();
            alert('Payment rejected successfully');
        } catch (err) {
            console.error('Failed to reject payment:', err);
            alert('Failed to reject payment');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved':
                return <CheckCircle size={20} className="success-text" />;
            case 'Rejected':
                return <XCircle size={20} className="danger-text" />;
            default:
                return <Clock size={20} className="warning-text" />;
        }
    };

    return (
        <div className="module-content">
            <div className="module-header">
                <h2>Payment Management</h2>
            </div>

            <div className="card data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{isAdmin ? 'Client' : 'Invoice ID'}</th>
                            <th>Amount</th>
                            <th>Submitted Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No payments found
                                </td>
                            </tr>
                        ) : (
                            payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td>
                                        {isAdmin ? (
                                            <div>
                                                <strong>{payment.client_name}</strong>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {payment.company_name}
                                                </div>
                                            </div>
                                        ) : (
                                            <strong>INV-{payment.invoice_id}</strong>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: '600' }}>${payment.invoice_amount}</td>
                                    <td>{new Date(payment.submitted_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="status-badge-container">
                                            {getStatusIcon(payment.status)}
                                            <span className={`status-badge status-${payment.status.toLowerCase().replace(' ', '-')}`}>
                                                {payment.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {isAdmin ? (
                                                <>
                                                    {payment.status === 'Submitted' && (
                                                        <>
                                                            <button 
                                                                className="icon-btn-small approve-btn"
                                                                title="Approve"
                                                                onClick={() => handleApprovePayment(payment.id)}
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button 
                                                                className="icon-btn-small reject-btn"
                                                                title="Reject"
                                                                onClick={() => handleRejectPayment(payment.id)}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <a 
                                                        href={payment.payment_proof_url?.startsWith('http') ? payment.payment_proof_url : `https://projectviewsystem.onrender.com${payment.payment_proof_url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="icon-btn-small"
                                                        title="View Proof"
                                                    >
                                                        <Eye size={16} />
                                                    </a>
                                                    <a 
                                                        href={payment.payment_proof_url?.startsWith('http') ? payment.payment_proof_url : `https://projectviewsystem.onrender.com${payment.payment_proof_url}`} 
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
                                                <>
                                                    <button 
                                                        className="icon-btn-small"
                                                        title="Upload/Resubmit Payment"
                                                        onClick={() => handleResubmitPayment(payment)}
                                                    >
                                                        <Upload size={16} />
                                                    </button>
                                                    <a 
                                                        href={payment.payment_proof_url?.startsWith('http') ? payment.payment_proof_url : `https://projectviewsystem.onrender.com${payment.payment_proof_url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="icon-btn-small"
                                                        title="View Proof"
                                                    >
                                                        <Eye size={16} />
                                                    </a>
                                                    <a 
                                                        href={payment.payment_proof_url?.startsWith('http') ? payment.payment_proof_url : `https://projectviewsystem.onrender.com${payment.payment_proof_url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="icon-btn-small"
                                                        title="Download"
                                                        download
                                                    >
                                                        <Download size={16} />
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Upload Payment Modal */}
            {showUploadModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h3>{selectedPaymentId ? 'Resubmit Payment Proof' : 'Upload Payment Proof'}</h3>
                        <form onSubmit={handleUploadPayment}>
                            {!selectedPaymentId && (
                                <div className="form-group">
                                    <label>Select Invoice</label>
                                    <div className="input-with-icon">
                                        <FileText size={18} className="input-icon" />
                                        <select
                                            value={paymentForm.invoice_id}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Choose an invoice</option>
                                            {invoices.map((invoice) => (
                                                <option key={invoice.id} value={invoice.id}>
                                                    INV-{invoice.id} - ${invoice.amount} (Due: {new Date(invoice.due_date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Payment Proof (Screenshot)</label>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="file-input"
                                    required
                                />
                                {paymentForm.payment_proof && (
                                    <p className="file-name">Selected: {paymentForm.payment_proof.name}</p>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedPaymentId(null);
                                    setPaymentForm({ invoice_id: '', payment_proof: null });
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Uploading...' : 'Submit Proof'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentModule;

