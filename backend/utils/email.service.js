const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_PASSWORD
    }
});

const sendEmail = async (to, subject, text, html) => {
    try {
        const mailOptions = {
            from: '"Maydiv Dashboard" <576abhishek.2020@gmail.com>',
            to,
            subject,
            text,
            html
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent via Brevo:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = { sendEmail };
