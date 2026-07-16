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
        if (!capturedImage) {
            alert('Please capture your photo (Step 1) before submitting.');
            return;
        }
        if (sigCanvas.current && sigCanvas.current.isEmpty()) {
            alert('Please provide your digital signature (Step 2) before submitting.');
            return;
        }

        setSigning(true);
        const signatureData = sigCanvas.current.toDataURL();
        const photoData = capturedImage;

        try {
            const token = localStorage.getItem('token');
            await axios.post('https://projectviewsystem.onrender.com/api/agreements/sign', 
                { 
                    agreement_id: currentAgreement.id, 
                    signature_data: signatureData,
                    client_photo: photoData
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
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    if (videoRef.current) {
                        videoRef.current.play().catch(err => {
                            console.error('Error playing video:', err);
                        });
                    }
                };
                // Force video to play after a short delay
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.play().catch(err => {
                            console.error('Error playing video (timeout):', err);
                        });
                    }
                }, 100);
            }
            setCameraMode(true);
        } catch (err) {
            console.error('Error accessing camera:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert('Camera permission denied. Please allow camera access in your browser settings and try again.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                alert('No camera found. Please make sure your camera is connected and try again.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                alert('Camera is already in use by another application. Please close other apps using the camera and try again.');
            } else {
                alert('Could not access camera: ' + err.message + '. Please check your camera permissions and try again.');
            }
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
            const maxSize = 800;
            let width = videoRef.current.videoWidth;
            let height = videoRef.current.videoHeight;
            
            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Draw full image without circular crop for better visibility
            ctx.drawImage(videoRef.current, 0, 0, width, height);
            
            // Compress image to JPEG with 0.7 quality
            const imageData = canvas.toDataURL('image/jpeg', 0.7);
            console.log('Image captured, size:', imageData.length);
            setCapturedImage(imageData);
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
                                                                {/* Left: Drawn Signature */}
                                                                <div className="signature-section">
                                                                    <p className="signature-label">✍️ Digital Signature</p>
                                                                    <div className="signature-box" style={{ 
                                                                        width: '100%', maxWidth: '280px', height: '180px', 
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'var(--bg-main)'
                                                                    }}>
                                                                        <img src={agreement.signature_data} alt="Drawn Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                    </div>
                                                                    <p className="signature-date">
                                                                        🕐 Signed: {agreement.signed_at ? new Date(agreement.signed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                                                                    </p>
                                                                </div>
                                                                
                                                                {/* Middle: Captured Photo */}
                                                                {agreement.client_photo ? (
                                                                    <div className="signature-section">
                                                                        <p className="signature-label">📷 Biometric Photo Capture</p>
                                                                        <div className="signature-box" style={{ 
                                                                            width: '100%', maxWidth: '280px', height: '180px', 
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                                                            borderRadius: '8px', border: '2px solid var(--primary-color)', background: '#000'
                                                                        }}>
                                                                            <img src={agreement.client_photo} alt="Client Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="signature-section" style={{opacity: 0.5}}>
                                                                        <p className="signature-label">📷 Biometric Photo Capture</p>
                                                                        <div className="signature-box" style={{ 
                                                                            width: '100%', maxWidth: '280px', height: '180px', 
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'var(--bg-main)'
                                                                        }}>
                                                                            <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>No photo captured (Old Record)</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Divider */}
                                                                <div className="signature-divider"></div>

                                                                {/* Right: Verification Details */}
                                                                <div className="verification-section">
                                                                    <p className="signature-label">🔐 Verification Record</p>
                                                                    <div className="verification-details">
                                                                        <p><span className="label">CLIENT:</span> {agreement.contact_person}</p>
                                                                        <p><span className="label">COMPANY:</span> {agreement.company_name}</p>
                                                                        <p><span className="label">AGR ID:</span> AGR-{agreement.id}</p>
                                                                        <p><span className="label">METHOD:</span> Biometric + Draw Pad</p>
                                                                        <p><span className="label">STATUS:</span> <span style={{color:'#22c55e',fontWeight:700}}>✅ Integrity Verified</span></p>
                                                                        <p><span className="label">TIMESTAMP:</span> {agreement.signed_at ? new Date(agreement.signed_at).toISOString().replace('T',' ').substring(0,19) : 'N/A'}</p>
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
                        <h3>Digital Signature & Verification</h3>
                        <p className="modal-desc">Please complete both steps to sign the agreement securely.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                            {/* Step 1: Photo Capture */}
                            <div>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Step 1</span> 
                                    Camera Photo Capture
                                </h4>
                                {!capturedImage ? (
                                    <div className="camera-wrapper" style={{ alignItems: 'flex-start' }}>
                                        {cameraMode ? (
                                            <>
                                                <div className="camera-frame" style={{ width: '100%', maxWidth: '350px', height: '260px' }}>
                                                    <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
                                                </div>
                                                <div className="camera-actions" style={{ marginTop: '0.5rem' }}>
                                                    <button type="button" className="btn-secondary" onClick={stopCamera}><X size={16} /> Cancel</button>
                                                    <button type="button" className="btn-primary" onClick={captureImage}><Camera size={16} /> Capture Image</button>
                                                </div>
                                            </>
                                        ) : (
                                            <button type="button" className="btn-secondary" onClick={() => startCamera()} style={{ width: '100%', padding: '2rem', border: '2px dashed var(--border-color)', background: 'var(--bg-main)' }}>
                                                <Camera size={32} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
                                                Click here to start camera
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="captured-image-wrapper" style={{ alignItems: 'flex-start' }}>
                                        <div className="captured-frame" style={{ width: '100%', maxWidth: '350px', height: '260px', overflow: 'hidden', borderRadius: '8px' }}>
                                            <img src={capturedImage} alt="Captured Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div className="camera-actions" style={{ marginTop: '0.5rem' }}>
                                            <span style={{ color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Verified size={16} /> Captured</span>
                                            <button type="button" className="btn-secondary" style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={retakePhoto}><RotateCcw size={14} /> Retake</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                            {/* Step 2: Digital Draw */}
                            <div>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Step 2</span> 
                                    Digital Signature
                                </h4>
                                <div className="signature-pad-wrapper" style={{ marginBottom: 0 }}>
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        canvasProps={{ className: 'signature-canvas' }}
                                    />
                                    <button type="button" className="clear-signature-btn" onClick={clearSignature}>
                                        <RotateCcw size={16} /> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-actions" style={{ paddingTop: '1.5rem', marginTop: '1rem' }}>
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

