const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = process.env;

const createTransporter = () => {
    try {
        return nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
            pool: false,
            maxConnections: 1,
            maxMessages: 1,
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3'
            },
            connectionTimeout: 60000,
            socketTimeout: 60000,
            greetingTimeout: 60000,
            debug: false,
            logger: false
        });
    } catch (error) {
        throw new Error('Email service configuration error');
    }
};

const transporter = createTransporter();

const sendEmail = async (to, subject, text, html = null, retries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (!to || !subject || !text) {
                throw new Error('Missing required email parameters');
            }

            if (!EMAIL_USER) {
                throw new Error('EMAIL_USER not configured');
            }

            const mailOptions = {
                from: `"Admin Notifications" <${EMAIL_USER}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject,
                text,
                ...(html && { html }),
            };

            await transporter.sendMail(mailOptions);
            return;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            }
        }
    }

    throw new Error(`Email delivery failed: ${lastError.message}`);
};

const testEmailConnection = async () => {
    try {
        await transporter.verify();
        return { success: true, message: 'Email server is ready' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const closeConnection = () => {
    if (transporter && transporter.close) {
        transporter.close();
    }
};

module.exports = {
    sendEmail,
    testEmailConnection,
    closeConnection
};
