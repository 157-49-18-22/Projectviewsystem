import React from 'react';
import { Bell, Mail } from 'lucide-react';

const NotificationCenter = () => {
    const notifications = [
        { msg: 'Client submitted a review for project MD-CL-0001', time: '1 hour ago', read: false },
        { msg: 'Payment Approved - Project Active', time: '2 days ago', read: true },
        { msg: 'Credentials sent to new client', time: '5 days ago', read: true }
    ];

    return (
        <div className="module-content">
            <div className="module-header">
                <h2>Notifications</h2>
            </div>
            
            <div className="card" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: `1px solid var(--border-color)`, paddingBottom: '1rem' }}>
                    <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>All</span>
                    <span style={{ color: 'var(--text-muted)' }}>Unread</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notifications.map((notif, index) => (
                        <div key={index} style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            padding: '1rem', 
                            background: notif.read ? 'transparent' : 'rgba(79, 70, 229, 0.05)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid',
                            borderColor: notif.read ? 'var(--border-color)' : 'rgba(79, 70, 229, 0.2)'
                        }}>
                            <div style={{ color: notif.read ? 'var(--text-muted)' : 'var(--primary-color)' }}>
                                {notif.read ? <Mail size={24} /> : <Bell size={24} />}
                            </div>
                            <div>
                                <p style={{ fontWeight: notif.read ? '400' : '600', marginBottom: '0.3rem' }}>{notif.msg}</p>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{notif.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
