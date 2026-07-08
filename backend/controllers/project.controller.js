const pool = require('../config/db');
const { sendEmail } = require('../utils/email.service');
const notificationController = require('./notification.controller');

// Admin Action: Get All Projects
exports.getAllProjects = async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'Admin') {
            // Admin sees all projects
            query = `
                SELECT p.*, c.company_name, c.contact_person,
                    (SELECT COUNT(*) FROM milestone_approvals WHERE project_id = p.id AND status != 'Not Submitted') as total_milestones,
                    (SELECT COUNT(*) FROM milestone_approvals WHERE project_id = p.id AND status = 'Approved') as approved_milestones
                FROM projects p
                LEFT JOIN clients c ON p.client_id = c.id
                ORDER BY p.created_at DESC
            `;
            params = [];
        } else {
            // Client sees only their projects
            query = `
                SELECT p.*, c.company_name, c.contact_person,
                    (SELECT COUNT(*) FROM milestone_approvals WHERE project_id = p.id AND status != 'Not Submitted') as total_milestones,
                    (SELECT COUNT(*) FROM milestone_approvals WHERE project_id = p.id AND status = 'Approved') as approved_milestones
                FROM projects p
                LEFT JOIN clients c ON p.client_id = c.id
                WHERE p.client_id = ?
                ORDER BY p.created_at DESC
            `;
            params = [req.user.client_id];
        }

        const [projects] = await pool.query(query, params);
        res.json(projects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Action: Create a New Project
exports.createProject = async (req, res) => {
    const { client_id, project_name, start_date, end_date, milestones, team_members } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Create Project
        const [result] = await connection.query(
            'INSERT INTO projects (client_id, project_name, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [client_id, project_name, 'Not Started', start_date, end_date]
        );
        const projectId = result.insertId;

        // Create Milestones if provided
        if (milestones && milestones.length > 0) {
            for (const milestone of milestones) {
                await connection.query(
                    'INSERT INTO milestone_approvals (project_id, milestone_name, description, status) VALUES (?, ?, ?, ?)',
                    [projectId, milestone.name, milestone.description, 'Not Submitted']
                );
            }
        }

        // Create Team Members if provided (create users first)
        if (team_members && team_members.length > 0) {
            for (const member of team_members) {
                // Check if user already exists by email (we'll use name as email for now)
                const [existingUsers] = await connection.query(
                    'SELECT id FROM users WHERE name = ? OR email = ?',
                    [member.name, `${member.name.toLowerCase().replace(/\s/g, '.')}@maydiv.com`]
                );
                
                let userId;
                if (existingUsers.length > 0) {
                    userId = existingUsers[0].id;
                } else {
                    // Create new user
                    const [userResult] = await connection.query(
                        'INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)',
                        [member.name, `${member.name.toLowerCase().replace(/\s/g, '.')}@maydiv.com`, 'Team Member', '$2y$10$placeholder']
                    );
                    userId = userResult.insertId;
                }

                // Assign to project
                await connection.query(
                    'INSERT INTO project_team (project_id, user_id, role) VALUES (?, ?, ?)',
                    [projectId, userId, member.designation]
                );
            }
        }

        // Log it
        await connection.query(
            'INSERT INTO status_log (client_id, project_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?, ?)',
            [client_id, projectId, 'Project', projectId, req.user.id, 'Project Created']
        );

        await connection.commit();
        res.status(201).json({ message: 'Project created successfully.', projectId });

        // Fire and forget - non-blocking notification
        notificationController.createNotification(
            client_id,
            'Project Created',
            projectId,
            `New project "${project_name}" has been created`
        ).catch(err => console.error('Error creating notification:', err));
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        connection.release();
    }
};

// Admin Action: Assign Team Member to Project
exports.assignTeam = async (req, res) => {
    const { project_id, user_id, role } = req.body;

    try {
        await pool.query(
            'INSERT INTO project_team (project_id, user_id, role) VALUES (?, ?, ?)',
            [project_id, user_id, role]
        );
        res.status(201).json({ message: 'Team member successfully assigned to the project.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin/Team Action: Add/Update Gantt Task
exports.updateGantt = async (req, res) => {
    const { project_id, task_name, start_date, end_date, progress_percent, status } = req.body;

    try {
        await pool.query(
            'INSERT INTO gantt_tasks (project_id, task_name, start_date, end_date, progress_percent, status) VALUES (?, ?, ?, ?, ?, ?)',
            [project_id, task_name, start_date, end_date, progress_percent || 0, status || 'Pending']
        );
        res.json({ message: 'Gantt task added successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Client/Admin/Team Action: Get full project visibility
exports.getProjectDetails = async (req, res) => {
    const projectId = req.params.id;

    try {
        const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
        if (projects.length === 0) return res.status(404).json({ message: 'Project not found' });
        
        const project = projects[0];

        // Ensure Client only sees their own project
        if (req.user.role === 'Client' && project.client_id !== req.user.client_id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Fetch Assigned Team
        const [team] = await pool.query(
            'SELECT u.id, u.name, u.email, pt.role FROM project_team pt JOIN users u ON pt.user_id = u.id WHERE pt.project_id = ?',
            [projectId]
        );

        // Fetch Milestones (created during project creation)
        const [milestones] = await pool.query(
            'SELECT * FROM milestone_approvals WHERE project_id = ? ORDER BY requested_at DESC',
            [projectId]
        );

        res.json({
            project_info: project,
            team,
            milestones
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Project Milestones (for milestone approval dropdown)
// Only returns milestones that have NOT been submitted for approval yet
exports.getProjectMilestones = async (req, res) => {
    const projectId = req.params.id;

    try {
        // Only return milestones with 'Not Submitted' status (available to submit)
        const [milestones] = await pool.query(
            `SELECT id, milestone_name 
             FROM milestone_approvals 
             WHERE project_id = ? 
               AND status = 'Not Submitted'
             ORDER BY milestone_name ASC`,
            [projectId]
        );
        res.json(milestones);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Action: Mark Project as Completed
exports.completeProject = async (req, res) => {
    const projectId = req.params.id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [projects] = await connection.query('SELECT client_id FROM projects WHERE id = ?', [projectId]);
        if (projects.length === 0) return res.status(404).json({ message: 'Project not found' });
        const clientId = projects[0].client_id;

        // 1. Mark Project Complete
        await connection.query('UPDATE projects SET status = ? WHERE id = ?', ['Completed', projectId]);
        
        // 2. Mark Client Status Complete
        await connection.query('UPDATE clients SET status = ? WHERE id = ?', ['Completed', clientId]);
        
        // 3. Log Action in new status_log table
        await connection.query(
            'INSERT INTO status_log (client_id, project_id, entity_type, entity_id, changed_by, remarks) VALUES (?, ?, ?, ?, ?, ?)',
            [clientId, projectId, 'Project', projectId, req.user.id, 'Marked Project Completed']
        );

        await connection.commit();

        // 4. Send Review Link via Email
        const [clientResult] = await connection.query('SELECT email FROM clients WHERE id = ?', [clientId]);
        if (clientResult.length > 0) {
            const reviewUrl = `${process.env.FRONTEND_URL}/review/${projectId}`;
            const emailHtml = `
                <h2>Congratulations! Your Project is Complete</h2>
                <p>The development of your project has been successfully completed and finalized.</p>
                <p>We would really appreciate it if you could take a moment to leave a review about your experience with Maydiv:</p>
                <a href="${reviewUrl}" style="padding: 10px; background-color: #4CAF50; color: white; text-decoration: none;">Submit Final Review</a>
            `;
            await sendEmail(clientResult[0].email, 'Project Completely Delivered! Leave a Review', 'Project Completed', emailHtml);
        }

        res.json({ message: 'Project finalized. Review email dispatched.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Client Action: Submit Review
exports.submitReview = async (req, res) => {
    const projectId = req.params.id;
    const { rating, comments } = req.body;
    
    try {
        const [projects] = await pool.query('SELECT client_id, project_name FROM projects WHERE id = ?', [projectId]);
        if (projects.length === 0) return res.status(404).json({ message: 'Project not found' });
        const clientId = projects[0].client_id;
        const projectName = projects[0].project_name;
        
        // Use exact 'reviews' table from new schema
        await pool.query(
            'INSERT INTO reviews (client_id, project_id, rating, feedback_text) VALUES (?, ?, ?, ?)',
            [clientId, projectId, rating, comments]
        );
        
        // Create notification
        await notificationController.createNotification(
            clientId,
            'Review Submitted',
            projectId,
            `Client submitted a review for project ${projectName}`
        );

        // Close the lifecycle
        res.json({ message: 'Thank you for your feedback! Review submitted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Action: Delete Project
exports.deleteProject = async (req, res) => {
    const projectId = req.params.id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Delete related records
        await connection.query('DELETE FROM project_team WHERE project_id = ?', [projectId]);
        await connection.query('DELETE FROM milestone_approvals WHERE project_id = ?', [projectId]);
        await connection.query('DELETE FROM gantt_tasks WHERE project_id = ?', [projectId]);
        
        // Delete the project
        await connection.query('DELETE FROM projects WHERE id = ?', [projectId]);

        await connection.commit();
        res.json({ message: 'Project deleted successfully.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Admin Action: Sell Project
exports.sellProject = async (req, res) => {
    const projectId = req.params.id;

    try {
        await pool.query('UPDATE projects SET status = ? WHERE id = ?', ['Sold', projectId]);
        res.json({ message: 'Project marked as sold successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Action: Create Milestone
exports.createMilestone = async (req, res) => {
    const projectId = req.params.id;
    const { milestone_name, description, attachment_url } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [projects] = await connection.query('SELECT client_id FROM projects WHERE id = ?', [projectId]);
        if (projects.length === 0) return res.status(404).json({ message: 'Project not found' });
        const clientId = projects[0].client_id;

        await connection.query(
            'INSERT INTO milestone_approvals (project_id, milestone_name, description, attachment_url, status) VALUES (?, ?, ?, ?, ?)',
            [projectId, milestone_name, description, attachment_url, 'Pending Approval']
        );

        // Create notification
        await notificationController.createNotification(
            clientId,
            'New Milestone Created',
            projectId,
            `New milestone "${milestone_name}" has been created for your project`
        );

        await connection.commit();
        res.status(201).json({ message: 'Milestone created successfully.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Admin Action: Update Milestone Status
exports.updateMilestone = async (req, res) => {
    const milestoneId = req.params.id;
    const { status, client_remarks } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [milestoneData] = await connection.query(
            'SELECT ma.*, p.client_id, p.project_name, p.status as project_status FROM milestone_approvals ma JOIN projects p ON ma.project_id = p.id WHERE ma.id = ?',
            [milestoneId]
        );
        
        if (milestoneData.length === 0) return res.status(404).json({ message: 'Milestone not found' });
        
        const milestone = milestoneData[0];
        const clientId = milestone.client_id;

        // Update milestone status
        await connection.query(
            'UPDATE milestone_approvals SET status = ?, client_remarks = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, client_remarks || null, milestoneId]
        );

        // AUTO STATUS: If first milestone is Approved and project is 'Not Started' → set to 'Working'
        if (status === 'Approved' && milestone.project_status === 'Not Started') {
            await connection.query(
                "UPDATE projects SET status = 'Working' WHERE id = ?",
                [milestone.project_id]
            );
            console.log(`✅ Project ${milestone.project_id} auto-changed to Working`);
        }

        // Create notification for client
        await notificationController.createNotification(
            clientId,
            `Milestone ${status}`,
            milestone.project_id,
            `Milestone "${milestone.milestone_name}" has been ${status}`
        );

        await connection.commit();
        res.json({ message: 'Milestone status updated successfully.' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

