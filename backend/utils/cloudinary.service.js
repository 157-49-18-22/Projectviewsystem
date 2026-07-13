const cloudinary = require('../config/cloudinary');

/**
 * Upload a Buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Cloudinary folder name
 * @param {string} resourceType - 'raw' for PDF, 'image' for images
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadToCloudinary = (buffer, folder = 'maydiv', resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
                // For PDFs, 'auto' will typically handle them safely as 'image' or document.
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, public_id: result.public_id });
            }
        );
        stream.end(buffer);
    });
};

/**
 * Fetch a file from a URL and return as Buffer
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
const fetchFromUrl = async (url) => {
    const axios = require('axios');
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
};

module.exports = { uploadToCloudinary, fetchFromUrl };
