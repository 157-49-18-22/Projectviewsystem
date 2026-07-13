import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, PenTool, CheckCircle, Clock, Upload, Send, Users, RotateCcw, ChevronLeft, ChevronRight, Filter, Plus, Verified, RefreshCw, Camera, X } from 'lucide-react';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import './AgreementViewer.css';

const AgreementViewer = () => {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isClient = user.role === 'Client';
    const isAdmin = user.role === 'Admin';
    
    const [status, setStatus] = useState('Pending');
    const [showSignModal, setShowSignModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [agreementFile, setAgreementFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [clientAgreements, setClientAgreements] = useState([]);
    const [currentAgreement, setCurrentAgreement] = useState(null);
    const [signing, setSigning] = useState(false);
    const sigCanvas = useRef({});
    const [allAgreements, setAllAgreements] = useState([]);
    const [expandedSignature, setExpandedSignature] = useState(null);
    const [cameraMode, setCameraMode] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Fetch clients for admin
    useEffect(() => {
        if (isAdmin) {
            fetchClients();
            fetchAllAgreements();
        }
        if (isClient) {
            fetchClientAgreements();
        }
    }, [isAdmin, isClient]);

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

    const fetchAllAgreements = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('https://projectviewsystem.onrender.com/api/agreements/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllAgreements(res.data);
        } catch (err) {
            console.error('Failed to fetch all agreements:', err);
        }
    };

    const fetchClientAgreements = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('https://projectviewsystem.onrender.com/api/agreements/my-agreements', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClientAgreements(res.data);
            if (res.data.length > 0) {
                setCurrentAgreement(res.data[0]);
                setStatus(res.data[0].status);
            }
        } catch (err) {
            console.error('Failed to fetch agreements:', err);
        }
    };

    const handleSign = async () => {
        if (!capturedImage && sigCanvas.current.isEmpty()) {
            alert('Please sign or capture your signature before submitting');
            return;
        }

        setSigning(true);
        const signatureData = capturedImage || sigCanvas.current.toDataURL();

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://projectviewsystem.onrender.com/api/agreements/sign', 
                { 
                    agreement_id: currentAgreement.id, 
                    signature_data: signatureData 
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setStatus('Signed');
            setShowSignModal(false);
            setCapturedImage(null);
            setCameraMode(false);
            // Refresh agreements
            await fetchClientAgreements();
        } catch (err) {
            console.error('Failed to sign agreement:', err);
            alert('Failed to sign agreement');
        } finally {
            setSigning(false);
        }
    };

    const clearSignature = () => {
        sigCanvas.current.clear();
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraMode(true);
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please allow camera permissions.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraMode(false);
    };

    const captureImage = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Draw circular crop
            const size = Math.min(canvas.width, canvas.height);
            const x = (canvas.width - size) / 2;
            const y = (canvas.height - size) / 2;
            
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(videoRef.current, 0, 0);
            
            setCapturedImage(canvas.toDataURL('image/png'));
            stopCamera();
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        startCamera();
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleFileChange = (e) => {
        setAgreementFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedClient || !agreementFile) {
            alert('Please select a client and upload an agreement file');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('client_id', selectedClient);
        formData.append('agreement_file', agreementFile);

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://projectviewsystem.onrender.com/api/agreements/upload', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            setUploadSuccess(true);
            setTimeout(() => {
                setUploadSuccess(false);
                setShowUploadModal(false);
                setSelectedClient('');
                setAgreementFile(null);
            }, 2000);
        } catch (err) {
            console.error('Failed to upload agreement:', err);
            alert('Failed to upload agreement');
        } finally {
            setLoading(false);
        }
    };

    const toggleSignature = (id) => {
        setExpandedSignature(expandedSignature === id ? null : id);
    };

    // Calculate stats
    const totalAgreements = allAgreements.length;
    const signedAgreements = allAgreements.filter(a => a.status === 'Signed').length;
    const pendingAgreements = allAgreements.filter(a => a.status === 'Pending').length;
    const expiringAgreements = 0;

    return (
        <div className="module-content">
            <div className="page-header">
                <div>
                    <h3>Agreements Tracking</h3>
                    <p>Review and manage legal documentation across all client accounts.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-filter">
                        <Filter size={18} /> Filters
                    </button>
                    {isAdmin && (
                        <button className="btn-new-agreement" onClick={() => setShowUploadModal(true)}>
                            <Plus size={18} /> New Agreement
                        </button>
                    )}
                </div>
            </div>

            <div className="agreement-container">
                {isAdmin ? (
                    <div className="admin-agreements-list">
                        {allAgreements.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={64} className="pdf-icon" />
                                <h3>No Agreements Found</h3>
                                <p>No agreements have been uploaded yet.</p>
                            </div>
                        ) : (
                            <div className="agreements-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>S.NO</th>
                                            <th>CLIENT</th>
                                            <th>COMPANY</th>
                                            <th>STATUS</th>
                                            <th>DATE</th>
                                            <th className="text-right">ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allAgreements.map((agreement, index) => (
                                            <>
                                                <tr key={agreement.id} className="group">
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        <div className="client-info">
                                                            <span className="client-name">{agreement.contact_person}</span>
                                                            <span className="client-id">ID: AGR-{agreement.id}</span>
                                                        </div>
                                                    </td>
                                                    <td>{agreement.company_name}</td>
                                                    <td>
                                                        <span className={`status-badge-new status-${agreement.status.toLowerCase()}`}>
                                                            {agreement.status === 'Signed' && <span className="status-dot"></span>}
                                                            {agreement.status}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(agreement.created_at).toLocaleDateString('en-GB')}</td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            {agreement.status === 'Signed' && agreement.signature_data && (
                                                                <button 
                                                                    className="icon-btn"
                                                                    onClick={() => toggleSignature(agreement.id)}
                                                                    title="View Signature"
                                                                >
                                                                    <PenTool size={18} />
                                                                </button>
                                                            )}
                                                            <a 
                                                                href={`https://projectviewsystem.onrender.com${agreement.document_url}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="icon-btn"
                                                                title="Download"
                                                            >
                                                                <Download size={18} />
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {agreement.status === 'Signed' && agreement.signature_data && expandedSignature === agreement.id && (
                                                    <tr key={`sig-${agreement.id}`} className="signature-row">
                                                        <td colSpan="6">
                                                            <div className="signature-display-new">
                                                                <div className="signature-section">
                                                                    <p className="signature-label">Client Signature</p>
                                                                    <div className="signature-box">
                                                                        <img 
                                                                            src={agreement.signature_data} 
                                                                            alt="Client Signature" 
                                                                            className="signature-image"
                                                                        />
                                                                    </div>
                                                                    <p className="signature-date">
                                                                        Signed on: {agreement.signed_at ? new Date(agreement.signed_at).toLocaleString() : 'N/A'}
                                                                    </p>
                                                                </div>
                                                                <div className="signature-divider"></div>
                                                                <div className="verification-section">
                                                                    <p className="signature-label">Verification Meta</p>
                                                                    <div className="verification-details">
                                                                        <p><span className="label">IP:</span> 192.168.1.104</p>
                                                                        <p><span className="label">METHOD:</span> Digital Biometric</p>
                                                                        <p><span className="label">STATUS:</span> Integrity Verified</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="table-footer">
                                    <p>Showing <span className="font-bold">{allAgreements.length}</span> of <span className="font-bold">{allAgreements.length}</span> agreements</p>
                                    <div className="pagination">
                                        <button className="pagination-btn" disabled>
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button className="pagination-btn">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {currentAgreement ? (
                            <div className="agreement-content-wrapper">
                                <div className="pdf-viewer-placeholder">
                                    <FileText size={48} className="pdf-icon" />
                                    <h3>Service Agreement</h3>
                                    <p>Sent on: {new Date(currentAgreement.created_at).toLocaleDateString()}</p>
                                    <p>Status: <span className={`status-${currentAgreement.status.toLowerCase()}`}>{currentAgreement.status}</span></p>
                                    
                                    <a 
                                        href={`https://projectviewsystem.onrender.com${currentAgreement.document_url}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="sign-button"
                                        style={{ width: 'auto', display: 'inline-flex', marginTop: '1rem' }}
                                    >
                                        <Download size={18} /> View/Download Agreement
                                    </a>
                                </div>

                                <div className="agreement-actions-compact">
                                    {currentAgreement.status === 'Pending' ? (
                                        <div className="status-banner-compact">
                                            <Clock size={16} className="warning-text" />
                                            <span>Signature Required</span>
                                        </div>
                                    ) : (
                                        <div className="status-banner-compact signed">
                                            <CheckCircle size={16} className="success-text" />
                                            <span>Signed on {currentAgreement.signed_at ? new Date(currentAgreement.signed_at).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    )}

                                    {currentAgreement.status === 'Pending' && isClient && (
                                        <button className="btn-primary sign-button-compact" onClick={() => setShowSignModal(true)}>
                                            <PenTool size={16} /> Sign Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="pdf-viewer-placeholder empty-state">
                                <FileText size={64} className="pdf-icon" />
                                <h3>No Agreement Available</h3>
                                <p>You don't have any pending agreements to review.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Stats Grid */}
            {isAdmin && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-total">
                            <FileText size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total</p>
                            <p className="stat-value">{totalAgreements}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-signed">
                            <Verified size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Signed</p>
                            <p className="stat-value">{signedAgreements}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-pending">
                            <Clock size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Pending</p>
                            <p className="stat-value">{pendingAgreements}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon stat-icon-expiring">
                            <RefreshCw size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Expiring</p>
                            <p className="stat-value">{expiringAgreements}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignModal && (
                <div className="modal-overlay">
                    <div className="modal-card signature-modal">
                        <h3>Digital Signature</h3>
                        <p className="modal-desc">By signing below, you agree to all the terms and conditions mentioned in the agreement document.</p>
                        
                        <div className="signature-methods">
                            <button 
                                className={`method-btn ${!cameraMode && !capturedImage ? 'active' : ''}`}
                                onClick={() => {
                                    setCameraMode(false);
                                    setCapturedImage(null);
                                }}
                            >
                                <PenTool size={18} /> Draw Signature
                            </button>
                            <button 
                                className={`method-btn ${cameraMode || capturedImage ? 'active' : ''}`}
                                onClick={() => {
                                    setCapturedImage(null);
                                    startCamera();
                                }}
                            >
                                <Camera size={18} /> Camera Capture
                            </button>
                        </div>
                        
                        {cameraMode ? (
                            <div className="camera-wrapper">
                                <div className="camera-frame">
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted
                                        className="camera-feed"
                                    />
                                    <div className="circular-guide"></div>
                                </div>
                                <div className="camera-actions">
                                    <button 
                                        type="button" 
                                        className="btn-secondary"
                                        onClick={stopCamera}
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn-primary"
                                        onClick={captureImage}
                                    >
                                        <Camera size={16} /> Capture
                                    </button>
                                </div>
                            </div>
                        ) : capturedImage ? (
                            <div className="captured-image-wrapper">
                                <div className="captured-frame">
                                    <img 
                                        src={capturedImage} 
                                        alt="Captured Signature" 
                                        className="captured-signature"
                                    />
                                </div>
                                <div className="camera-actions">
                                    <button 
                                        type="button" 
                                        className="btn-secondary"
                                        onClick={retakePhoto}
                                    >
                                        <RotateCcw size={16} /> Retake
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="signature-pad-wrapper">
                                <SignatureCanvas
                                    ref={sigCanvas}
                                    canvasProps={{
                                        className: 'signature-canvas'
                                    }}
                                />
                                <button 
                                    type="button" 
                                    className="clear-signature-btn"
                                    onClick={clearSignature}
                                >
                                    <RotateCcw size={16} /> Clear
                                </button>
                            </div>
                        )}
                        
                        <div className="modal-actions">
                            <button 
                                className="btn-secondary" 
                                onClick={() => {
                                    setShowSignModal(false);
                                    stopCamera();
                                    setCapturedImage(null);
                                }}
                                disabled={signing}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn-primary" 
                                onClick={handleSign}
                                disabled={signing}
                            >
                                {signing ? 'Signing...' : 'Confirm Signature'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Agreement Modal (Admin Only) */}
            {showUploadModal && (
                <div className="modal-overlay">
                    <div className="modal-card upload-modal">
                        <h3>Upload Agreement</h3>
                        <p className="modal-desc">Select a client and upload the agreement document to send to them.</p>
                        
                        {uploadSuccess ? (
                            <div className="success-message">
                                <CheckCircle size={48} className="success-icon" />
                                <h4>Agreement Sent Successfully!</h4>
                                <p>The agreement has been sent to the selected client.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleUpload} className="upload-form">
                                <div className="form-group">
                                    <label>
                                        <Users size={18} className="label-icon" />
                                        Select Client
                                    </label>
                                    <select 
                                        className="form-select"
                                        value={selectedClient}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose a client...</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.company_name} - {client.contact_person}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>
                                        <FileText size={18} className="label-icon" />
                                        Agreement Document
                                    </label>
                                    <div className="file-upload-area">
                                        <input 
                                            type="file" 
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            required
                                            id="agreement-file"
                                        />
                                        <label htmlFor="agreement-file" className="file-label">
                                            <Upload size={24} />
                                            <span>{agreementFile ? agreementFile.name : 'Click to upload PDF'}</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button 
                                        type="button" 
                                        className="btn-secondary" 
                                        onClick={() => setShowUploadModal(false)}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-primary"
                                        disabled={loading}
                                    >
                                        <Send size={18} />
                                        {loading ? 'Sending...' : 'Send Agreement'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgreementViewer;

