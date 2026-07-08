import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, FileSpreadsheet, CreditCard, FolderKanban, CheckSquare, LogOut, Bell, Menu } from 'lucide-react';
import Notifications from '../components/Notifications';
import axios from 'axios';
import './DashboardLayout.css';

const API = 'https://projectviewsystem.onrender.com/api';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [clientStatus, setClientStatus] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        setUserRole(user.role);
        
        if (user.role === 'Client') {
            fetchClientStatus();
            
            // Poll for status changes every 10 seconds
            const interval = setInterval(() => {
                fetchClientStatus();
            }, 10000);

            return () => clearInterval(interval);
        }
    }, []);

    const fetchClientStatus = async () => {
        try {
            const res = await axios.get(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.length > 0) {
                const status = res.data[0].status;
                console.log('Client status fetched:', status);
                setClientStatus(status);
            }
        } catch (err) {
            console.error('Error fetching client status:', err);
        }
    };

    const hasPaymentApproved = clientStatus === 'Project Active' || clientStatus === 'Active';

    const handleLogout = () => {
        // Clear local storage token
        navigate('/login');
    };

    return (
        <div className="layout-container">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <h2>MAYDIV</h2>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/dashboard" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <LayoutDashboard size={20} /> <span>Dashboard</span>
                    </NavLink>
                    {userRole === 'Admin' && (
                        <NavLink to="/clients" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                            <Users size={20} /> <span>Clients</span>
                        </NavLink>
                    )}
                    <NavLink to="/agreements" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FileText size={20} /> <span>Agreements</span>
                    </NavLink>
                    <NavLink to="/invoices" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <FileSpreadsheet size={20} /> <span>Invoices</span>
                    </NavLink>
                    <NavLink to="/payments" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <CreditCard size={20} /> <span>Payments</span>
                    </NavLink>
                    {userRole === 'Admin' || (userRole === 'Client' && hasPaymentApproved) ? (
                        <>
                            <NavLink to="/projects" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                                <FolderKanban size={20} /> <span>Projects</span>
                            </NavLink>
                            <NavLink to="/milestones" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                                <CheckSquare size={20} /> <span>Milestones</span>
                            </NavLink>
                        </>
                    ) : null}
                    {userRole === 'Admin' && (
                        <NavLink to="/timeline" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                            <CheckSquare size={20} /> <span>Audit Timeline</span>
                        </NavLink>
                    )}
                    <NavLink to="/notifications" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <Bell size={20} /> <span>Notifications</span>
                    </NavLink>
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
                    {userRole === 'Client' && !hasPaymentApproved && (
                        <div className="payment-reminder">
                            <div className="reminder-content">
                                <h3>âš ï¸ Payment Required</h3>
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

