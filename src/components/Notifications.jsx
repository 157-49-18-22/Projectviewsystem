import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './Notifications.css';

const API = 'http://localhost:5000/api';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
            setNotifications(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const res = await axios.get(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
            setUnreadCount(res.data.count);
        } catch (err) {
            console.error(err);
        }
    };

    const markAsRead = async (notificationIds) => {
        try {
            await axios.put(`${API}/notifications/mark-read`, 
                { notificationIds },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchNotifications();
            fetchUnreadCount();
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = () => {
        const unreadIds = notifications.filter(n => n.status === 'Sent').map(n => n.id);
        if (unreadIds.length > 0) {
            markAsRead(unreadIds);
        }
    };

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
        
        // Poll for new notifications every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications();
            fetchUnreadCount();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const getNotificationIcon = (eventType) => {
        if (eventType.includes('Payment')) return <CheckCircle size={18} className="success-icon" />;
        if (eventType.includes('Project') || eventType.includes('Milestone')) return <AlertCircle size={18} className="info-icon" />;
        if (eventType.includes('Invoice')) return <Clock size={18} className="warning-icon" />;
        return <Bell size={18} className="default-icon" />;
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="notifications-container">
            <button 
                className="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notifications-dropdown">
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="mark-read-btn" onClick={markAllAsRead}>
                                <Check size={14} /> Mark all as read
                            </button>
                        )}
                        <button className="close-btn" onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="notifications-list">
                        {loading ? (
                            <p className="loading-text">Loading notifications...</p>
                        ) : notifications.length === 0 ? (
                            <p className="empty-text">No notifications</p>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    className={`notification-item ${notification.status === 'Sent' ? 'unread' : 'read'}`}
                                    onClick={() => notification.status === 'Sent' && markAsRead([notification.id])}
                                >
                                    <div className="notification-icon">
                                        {getNotificationIcon(notification.event_type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-header">
                                            <span className="event-type">{notification.event_type}</span>
                                            <span className="notification-time">{formatTime(notification.sent_at)}</span>
                                        </div>
                                        {notification.project_name && (
                                            <p className="project-name">{notification.project_name}</p>
                                        )}
                                        {notification.company_name && (
                                            <p className="company-name">{notification.company_name}</p>
                                        )}
                                        {notification.remarks && (
                                            <p className="notification-remarks">{notification.remarks}</p>
                                        )}
                                        <span className={`status-indicator ${notification.status.toLowerCase()}`}>
                                            {notification.status === 'Sent' ? 'New' : 'Read'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
