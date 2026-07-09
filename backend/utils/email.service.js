const axios = require('axios');
require('dotenv').config();

const sendEmail = async (to, subject, text, html) => {
    try {
        const payload = {
            sender: { 
                name: "Maydiv Dashboard", 
                email: "576abhishek.2020@gmail.com" 
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html || `<p>${text}</p>`
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            }
        });

        console.log('Email sent via Brevo HTTP API:', response.data?.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email via API:', error?.response?.data || error.message);
        return false;
    }
};

module.exports = { sendEmail };
