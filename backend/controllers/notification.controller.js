const pool = require('../config/db');

// Get notifications for the logged-in user
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const clientId = req.user.client_id;

        let query, params;

        if (userRole === 'Admin') {
            // Admin sees all notifications
            query = `
                SELECT 
                    nl.*,
                    c.company_name,
                    c.contact_person,
                    p.project_name
                FROM notifications_log nl
                LEFT JOIN clients c ON nl.client_id = c.id
                LEFT JOIN projects p ON nl.project_id = p.id
                ORDER BY nl.sent_at DESC
                LIMIT 50
            `;
            params = [];
        } else if (userRole === 'Client') {
            // Client sees only their notifications
            query = `
                SELECT 
                    nl.*,
                    p.project_name
                FROM notifications_log nl
                LEFT JOIN projects p ON nl.project_id = p.id
                WHERE nl.client_id = ?
                ORDER BY nl.sent_at DESC
                LIMIT 50
            `;
            params = [clientId];
        } else {
            // Team member sees notifications for projects they're assigned to
            query = `
                SELECT 
                    nl.*,
                    c.company_name,
                    p.project_name
                FROM notifications_log nl
                LEFT JOIN clients c ON nl.client_id = c.id
                LEFT JOIN projects p ON nl.project_id = p.id
                WHERE nl.client_id IN (
                    SELECT DISTINCT p.client_id 
                    FROM project_team pt
                    JOIN projects p ON pt.project_id = p.id
                    WHERE pt.user_id = ?
                )
                ORDER BY nl.sent_at DESC
                LIMIT 50
            `;
            params = [userId];
        }

        const [notifications] = await pool.query(query, params);
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a notification
exports.createNotification = async (clientId, eventType, projectId = null, remarks = null) => {
    try {
        await pool.query(
            'INSERT INTO notifications_log (client_id, project_id, event_type, remarks) VALUES (?, ?, ?, ?)',
            [clientId, projectId, eventType, remarks]
        );
    } catch (err) {
        console.error('Error creating notification:', err);
    }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const clientId = req.user.client_id;

        let query, params;

        if (userRole === 'Admin') {
            query = 'SELECT COUNT(*) as count FROM notifications_log WHERE status = "Sent"';
            params = [];
        } else if (userRole === 'Client') {
            query = 'SELECT COUNT(*) as count FROM notifications_log WHERE client_id = ? AND status = "Sent"';
            params = [clientId];
        } else {
            query = `
                SELECT COUNT(*) as count 
                FROM notifications_log nl
                WHERE nl.client_id IN (
                    SELECT DISTINCT p.client_id 
                    FROM project_team pt
                    JOIN projects p ON pt.project_id = p.id
                    WHERE pt.user_id = ?
                )
                AND nl.status = "Sent"
            `;
            params = [userId];
        }

        const [result] = await pool.query(query, params);
        res.json({ count: result[0].count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { notificationIds } = req.body;
        
        if (!notificationIds || notificationIds.length === 0) {
            return res.status(400).json({ message: 'No notification IDs provided' });
        }

        await pool.query(
            'UPDATE notifications_log SET status = "Read" WHERE id IN (?)',
            [notificationIds]
        );
        
        res.json({ message: 'Notifications marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
