import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './SetPassword.css';

const SetPassword = () => {
    const navigate = useNavigate();
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setPasswordData({...passwordData, [e.target.name]: e.target.value});
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validation
        if (passwordData.newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('https://projectviewsystem.onrender.com/api/auth/reset-password', 
                { newPassword: passwordData.newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setSuccess(true);
            
            // Update user in localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            user.first_login_done = true;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Redirect after delay
            setTimeout(() => {
                const userRole = user.role;
                navigate(userRole === 'Client' ? '/client/dashboard' : '/dashboard');
            }, 2000);
            
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="set-password-container">
                <div className="set-password-card">
                    <div className="success-message">
                        <CheckCircle size={64} className="success-icon" />
                        <h2>Password Set Successfully!</h2>
                        <p>Redirecting to dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="set-password-container">
            <div className="set-password-card">
                <div className="set-password-header">
                    <h2>Set Your Password</h2>
                    <p>This is your first login. Please create a secure password for your account.</p>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit} className="set-password-form">
                    <div className="input-group">
                        <label>New Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type={showPassword ? "text" : "password"}
                                name="newPassword" 
                                placeholder="Enter new password (min 6 characters)"
                                className="input-field" 
                                required 
                                onChange={handleChange}
                                value={passwordData.newPassword}
                            />
                            <button 
                                type="button" 
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <label>Confirm Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword" 
                                placeholder="Confirm your password"
                                className="input-field" 
                                required 
                                onChange={handleChange}
                                value={passwordData.confirmPassword}
                            />
                            <button 
                                type="button" 
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary set-password-btn" disabled={loading}>
                        <span>{loading ? 'Setting Password...' : 'Set Password'}</span>
                    </button>
                </form>
            </div>
            
            <div className="design-elements">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
            </div>
        </div>
    );
};

export default SetPassword;

