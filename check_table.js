const pool = require('./backend/config/db');

async function check() {
    const [rows] = await pool.query('DESCRIBE invoices');
    console.log(rows);
    process.exit();
}
check();
