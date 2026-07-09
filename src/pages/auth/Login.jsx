import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import axios from 'axios';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>MAYDIV</h2>
                    <p>Enter your credentials to access the dashboard</p>
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
                            />
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type="password" 
                                name="password" 
                                placeholder="••••••••"
                                className="input-field" 
                                required 
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-options">
                        <label className="remember">
                            <input type="checkbox" /> Remember me
                        </label>
                        <a href="#" className="forgot-password">Forgot password?</a>
                    </div>

                    <button type="submit" className="btn-primary login-btn" disabled={loading}>
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

