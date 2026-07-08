const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text, html) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Maydiv Dashboard <onboarding@resend.dev>',
            to: [to],
            subject,
            html: html || `<p>${text}</p>`
        });

        if (error) {
            console.error('Resend error:', error);
            return false;
        }

        console.log('Email sent via Resend:', data?.id);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = { sendEmail };
