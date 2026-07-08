const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');

// Get All Milestones (Admin sees all, Client sees their own)
// Excludes 'Not Submitted' milestones (they are project templates, not yet sent for approval)
exports.getAllMilestones = async (req, res) => {
    try {
        let query, params;
        if (req.user.role === 'Admin') {
            query = `
                SELECT ma.*, p.project_name, c.company_name, c.contact_person
                FROM milestone_approvals ma
                JOIN projects p ON ma.project_id = p.id
                JOIN clients c ON p.client_id = c.id
                WHERE ma.status != 'Not Submitted'
                ORDER BY ma.requested_at DESC
            `;
            params = [];
        } else {
            query = `
                SELECT ma.*, p.project_name
                FROM milestone_approvals ma
                JOIN projects p ON ma.project_id = p.id
                WHERE p.client_id = ? AND ma.status != 'Not Submitted'
                ORDER BY ma.requested_at DESC
            `;
            params = [req.user.client_id];
        }
        const [milestones] = await pool.query(query, params);
        res.json(milestones);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin/Team: Submit Milestone for Client Approval
// Updates the existing milestone record (status: Not Submitted → Pending Approval)
// Does NOT create a duplicate record
exports.requestApproval = async (req, res) => {
    const { project_id, milestone_id, description } = req.body;
    let attachment_url = null;
    if (req.file) attachment_url = `/uploads/${req.file.filename}`;

    try {
        // Fetch milestone details and verify it belongs to this project & is not yet submitted
        const [milestoneData] = await pool.query(
            'SELECT id, milestone_name FROM milestone_approvals WHERE id = ? AND project_id = ? AND status = ?',
            [milestone_id, project_id, 'Not Submitted']
        );

        if (milestoneData.length === 0) {
            return res.status(404).json({ message: 'Milestone not found or already submitted' });
        }

        const milestone_name = milestoneData[0].milestone_name;

        // UPDATE the existing milestone record — no duplicate insertion
        const updateQuery = attachment_url
            ? 'UPDATE milestone_approvals SET status = ?, description = ?, attachment_url = ?, requested_at = NOW() WHERE id = ?'
            : 'UPDATE milestone_approvals SET status = ?, description = ?, requested_at = NOW() WHERE id = ?';
        const updateParams = attachment_url
            ? ['Pending Approval', description, attachment_url, milestone_id]
            : ['Pending Approval', description, milestone_id];

        await pool.query(updateQuery, updateParams);

        // Notify client via email
        const [projectData] = await pool.query(
            'SELECT c.email, c.contact_person FROM projects p JOIN clients c ON p.client_id = c.id WHERE p.id = ?',
            [project_id]
        );

        if (projectData.length > 0) {
            const emailHtml = `
                <p>Hello ${projectData[0].contact_person},</p>
                <p>Milestone <strong>${milestone_name}</strong> has been submitted for your review.</p>
                <p>Please log in to your dashboard to <strong>Approve</strong> or <strong>Request Changes</strong>.</p>
            `;
            await sendEmail(projectData[0].email, `Milestone Review Required: ${milestone_name}`, 'Milestone Review', emailHtml);
        }

        res.status(200).json({ message: 'Milestone submitted for approval. Client notified.', id: milestone_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Client: Approve or Request Changes on a Milestone
exports.respondToMilestone = async (req, res) => {
    const { milestone_id, status, client_remarks } = req.body;

    if (!['Approved', 'Changes Requested'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get milestone + project info
        const [milestoneRows] = await connection.query(
            `SELECT ma.id, ma.project_id, ma.milestone_name,
                    p.client_id, p.status as project_status
             FROM milestone_approvals ma
             JOIN projects p ON ma.project_id = p.id
             WHERE ma.id = ?`,
            [milestone_id]
        );

        if (milestoneRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Milestone not found' });
        }

        const ms = milestoneRows[0];

        // Update milestone status
        await connection.query(
            'UPDATE milestone_approvals SET status = ?, client_remarks = ?, responded_at = NOW() WHERE id = ?',
            [status, client_remarks || null, milestone_id]
        );

        // AUTO STATUS: First Approved milestone → project becomes 'Working'
        if (status === 'Approved' && ms.project_status === 'Not Started') {
            await connection.query(
                "UPDATE projects SET status = 'Working' WHERE id = ?",
                [ms.project_id]
            );
            console.log(`✅ Project ${ms.project_id} auto-changed to Working (via respondToMilestone)`);
        }

        // Log to status_log
        await connection.query(
            'INSERT INTO status_log (client_id, project_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?, ?)',
            [ms.client_id, ms.project_id, 'Milestone', milestone_id, req.user.id, `Client responded: ${status}`]
        );

        await connection.commit();
        res.json({ message: `Milestone marked as ${status}.` });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Admin/Team: Delete/Withdraw a milestone request
exports.deleteMilestoneRequest = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if milestone exists and its current status
        const [rows] = await pool.query('SELECT * FROM milestone_approvals WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Milestone not found' });
        }
        
        // Update the milestone back to 'Not Submitted' instead of actually deleting the row
        // This makes it available again in the dropdown
        await pool.query(
            "UPDATE milestone_approvals SET status = 'Not Submitted', description = NULL, requested_at = NULL, client_remarks = NULL, responded_at = NULL WHERE id = ?",
            [id]
        );

        res.json({ message: 'Milestone request deleted successfully. It is now available again.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.editMilestone = async (req, res) => {
    try {
        const { id } = req.params;
        const { milestone_name, description } = req.body;
        await pool.query('UPDATE milestone_approvals SET milestone_name = ?, description = ? WHERE id = ?', [milestone_name, description, id]);
        res.json({ message: 'Milestone updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
