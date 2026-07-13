const multer = require('multer');

// Use memoryStorage so files are kept in RAM as Buffer
// We then upload them to Cloudinary directly (no local disk needed)
// This is required for Render.com which has an ephemeral filesystem
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;
