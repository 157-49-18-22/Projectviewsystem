import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, FileSpreadsheet, CreditCard, FolderKanban, CheckSquare, LogOut, Bell, Menu, X } from 'lucide-react';
import Notifications from '../components/Notifications';
import axios from 'axios';
import './DashboardLayout.css';

const API = 'https://projectviewsystem.onrender.com/api';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [clientStatus, setClientStatus] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [clientName, setClientName] = useState(null);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        setUserRole(user.role);
        
        // Auto close sidebar on mobile
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        handleResize(); // Set initially
        window.addEventListener('resize', handleResize);
        
        if (user.role === 'Client') {
            fetchClientStatus();
            const interval = setInterval(() => {
                fetchClientStatus();
            }, 10000);
            return () => {
                clearInterval(interval);
                window.removeEventListener('resize', handleResize);
            };
        }
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchClientStatus = async () => {
        try {
            const res = await axios.get(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.length > 0) {
                const status = res.data[0].status;
                setClientStatus(status);
                setClientName(res.data[0].company_name || res.data[0].name);
            }
        } catch (err) {
            console.error('Error fetching client status:', err);
        }
    };

    const hasPaymentApproved = clientStatus === 'Project Active' || clientStatus === 'Active';

    const handleLogout = () => {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const userEmail = user.email;
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // If client was logged in, redirect to client login with email parameter
        if (user.role === 'Client' && userEmail) {
            navigate(`/login?email=${encodeURIComponent(userEmail)}`);
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="layout-container">
            {/* Mobile Overlay */}
            {isSidebarOpen && window.innerWidth <= 768 && (
                <div 
                    className="sidebar-overlay fixed inset-0 bg-black/50 z-[998] backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998, backdropFilter: 'blur(2px)' }}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {userRole === 'Client' ? (
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '2px', margin: 0 }}>
                            {clientName || 'HBI'}
                        </h2>
                    ) : (
                        <img src="/logo.png" alt="Logo" style={{ height: '180px', width: 'auto' }} />
                    )}
                    <button 
                        onClick={() => setSidebarOpen(false)} 
                        className="sidebar-close-btn"
                        aria-label="Close menu"
                    >
                        <X size={22} />
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <NavLink 
                        to={userRole === 'Client' ? '/client/dashboard' : '/dashboard'} 
                        onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} 
                        className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
                        end
                    >
                        <LayoutDashboard size={20} /> <span>Dashboard</span>
                    </NavLink>
                    {userRole === 'Admin' && (
                        <NavLink to="/clients" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Users size={20} /> <span>Clients</span>
                        </NavLink>
                    )}
                    <NavLink to="/agreements" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FileText size={20} /> <span>Agreements</span>
                    </NavLink>
                    <NavLink to="/invoices" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FileSpreadsheet size={20} /> <span>Invoices</span>
                    </NavLink>
                    <NavLink to="/payments" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <CreditCard size={20} /> <span>Payments</span>
                    </NavLink>
                    {userRole === 'Admin' || (userRole === 'Client' && hasPaymentApproved) ? (
                        <>
                            <NavLink to="/projects" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                                <FolderKanban size={20} /> <span>Projects</span>
                            </NavLink>
                            <NavLink to="/milestones" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                                <CheckSquare size={20} /> <span>Milestones</span>
                            </NavLink>
                        </>
                    ) : null}
                    {userRole === 'Admin' && (
                        <NavLink to="/timeline" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                            <CheckSquare size={20} /> <span>Audit Timeline</span>
                        </NavLink>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={20} /> <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-wrapper">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="toggle-btn" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                            <Menu size={24} />
                        </button>
                        <h2>Overview</h2>
                    </div>
                    <div className="topbar-right">
                        <Notifications />
                        <div className="user-profile">
                            <div className="avatar">{user.name ? user.name.charAt(0).toUpperCase() : 'A'}</div>
                            <div className="user-info">
                                <span className="name">{user.name || 'User'}</span>
                                <span className="role">{user.role || 'User'}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="content-area">
                    {userRole === 'Client' && !hasPaymentApproved && (location.pathname === '/projects' || location.pathname === '/milestones' || location.pathname === '/reviews') && (
                        <div className="payment-reminder">
                            <div className="reminder-content">
                                <h3>Payment Required</h3>
                                <p>Please complete your payment to access Projects and Milestones features.</p>
                                <button onClick={() => navigate('/payments')}>
                                    <CreditCard size={16} /> Go to Payments
                                </button>
                            </div>
                        </div>
                    )}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

