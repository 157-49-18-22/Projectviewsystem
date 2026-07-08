const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    try {
        const passwordHash = await bcrypt.hash('password123', 10);
        
        // Remove old admin if exists
        await pool.query("DELETE FROM users WHERE email='admin@maydiv.com'");
        
        // Insert clean admin
        await pool.query(
            "INSERT INTO users (role, name, email, password_hash, first_login_done) VALUES (?, ?, ?, ?, ?)",
            ['Admin', 'Super Admin', 'admin@maydiv.com', passwordHash, true]
        );
        console.log("SUCCESS: Admin User 'admin@maydiv.com' with password 'password123' inserted successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error creating admin user:", err);
        process.exit(1);
    }
}

seedAdmin();
