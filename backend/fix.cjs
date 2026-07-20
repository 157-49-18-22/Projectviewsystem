const pool = require('./config/db');

async function fix() {
    try {
        await pool.query('ALTER TABLE invoices ADD COLUMN document_data LONGTEXT');
        console.log("Added document_data column to invoices");
    } catch(e) { 
        console.log(e.message); 
    }
    
    try {
        await pool.query('ALTER TABLE payments ADD COLUMN document_data LONGTEXT');
        console.log("Added document_data column to payments");
    } catch (e) {
        console.log(e.message);
    }
    
    process.exit();
}
fix();
