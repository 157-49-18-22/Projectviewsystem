const pool = require('./config/db');

async function checkMilestones() {
    try {
        console.log('Checking milestone_approvals table...\n');
        
        const [milestones] = await pool.query('SELECT * FROM milestone_approvals ORDER BY project_id, id');
        
        console.log('Total milestones:', milestones.length);
        console.log('\n--- Milestone Details ---');
        
        milestones.forEach(m => {
            console.log(`ID: ${m.id}, Project: ${m.project_id}, Name: ${m.milestone_name}, Status: ${m.status}, Attachment: ${m.attachment_url}, RequestedAt: ${m.requested_at}`);
        });
        
        console.log('\n--- Count by Project ---');
        const [counts] = await pool.query(`
            SELECT project_id, 
                   COUNT(*) as total,
                   SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
            FROM milestone_approvals 
            GROUP BY project_id
        `);
        
        counts.forEach(c => {
            console.log(`Project ${c.project_id}: Total=${c.total}, Approved=${c.approved}`);
        });
        
        pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        pool.end();
    }
}

checkMilestones();
