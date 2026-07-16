import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [clientInfo, setClientInfo] = useState(null);
    const [isClientLogin, setIsClientLogin] = useState(false);

    // Check if this is a client login via URL parameter
    useEffect(() => {
        const clientEmail = searchParams.get('email');
        if (clientEmail) {
            setIsClientLogin(true);
            setCredentials(prev => ({ ...prev, email: clientEmail }));
            // Fetch client info
            fetchClientInfo(clientEmail);
        }
    }, [searchParams]);

    const fetchClientInfo = async (email) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`https://projectviewsystem.onrender.com/api/clients/by-email/${email}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data) {
                setClientInfo(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch client info:', err);
        }
    };

    // Agar pehle se logged in hai to seedha dashboard pe bhejo
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (token && user) {
            navigate(user.role === 'Client' ? '/client/dashboard' : '/dashboard', { replace: true });
        }
    }, []);

    const handleChange = (e) => {
        setCredentials({...credentials, [e.target.name]: e.target.value});
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const res = await axios.post('https://projectviewsystem.onrender.com/api/auth/login', credentials);
            // Save token
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            // Check if first login - redirect to set password
            if (!res.data.user.first_login_done) {
                navigate('/set-password');
            } else {
                // Navigate based on role
                navigate(res.data.user.role === 'Client' ? '/client/dashboard' : '/dashboard');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Login Failed. Check backend server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`login-container ${isClientLogin ? 'client-login' : 'admin-login'}`}>
            <div className={`login-card ${isClientLogin ? 'client-card' : 'admin-card'}`}>
                <div className="login-header">
                    {isClientLogin && clientInfo ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                                <div style={{ 
                                    width: '80px', height: '80px', borderRadius: '50%', 
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                                }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>
                                        {clientInfo.company_name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <h2>{clientInfo.company_name || 'Client Portal'}</h2>
                            <p>Welcome back, {clientInfo.contact_person || 'Client'}</p>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <img src="/logo.png" alt="Maydiv" style={{ height: '120px', width: 'auto' }} />
                            </div>
                            <h2>Admin Portal</h2>
                            <p>Enter your credentials to access the dashboard</p>
                        </>
                    )}
                </div>
                {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label>Email Address</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input 
                                type="email" 
                                name="email" 
                                placeholder="you@example.com"
                                className="input-field" 
                                required 
                                onChange={handleChange}
                                value={credentials.email}
                            />
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type={showPassword ? 'text' : 'password'}
                                name="password" 
                                placeholder="••••••••"
                                className="input-field" 
                                required 
                                onChange={handleChange}
                            />
                            <button 
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-options">
                        <label className="remember">
                            <input type="checkbox" /> Remember me
                        </label>
                        <a href="#" className="forgot-password">Forgot password?</a>
                    </div>

                    <button type="submit" className={`btn-primary login-btn ${isClientLogin ? 'client-btn' : 'admin-btn'}`} disabled={loading}>
                        <span>{loading ? 'Logging in...' : 'Login'}</span> <LogIn size={18} />
                    </button>
                </form>
            </div>
            
            <div className="design-elements">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
            </div>
        </div>
    );
}

export default Login;

