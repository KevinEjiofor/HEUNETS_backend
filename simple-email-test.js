const nodemailer = require('nodemailer');
require('dotenv').config();

const { EMAIL_USER, EMAIL_PASS } = process.env;

console.log('=== Simple Email Test ===');
console.log('EMAIL_USER:', EMAIL_USER ? 'Set' : 'Not set');
console.log('EMAIL_PASS:', EMAIL_PASS ? 'Set' : 'Not set');

const simpleTest = async () => {
    try {
        console.log('\n1. Creating transporter...');
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
            connectionTimeout: 10000,
            socketTimeout: 10000,
            greetingTimeout: 10000,
            debug: true, // Enable debug output
            logger: true // Enable logging
        });

        console.log('2. Testing connection...');
        await transporter.verify();
        console.log('✅ Connection successful!');

        console.log('3. Sending test email...');
        const info = await transporter.sendMail({
            from: EMAIL_USER,
            to: EMAIL_USER,
            subject: 'Test Email',
            text: 'This is a test email.'
        });

        console.log('✅ Email sent:', info.messageId);
        transporter.close();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error code:', error.code);
        console.error('Command:', error.command);
        
        if (error.code === 'EAUTH') {
            console.log('\n🔐 Authentication failed. This could mean:');
            console.log('1. Incorrect email/password');
            console.log('2. "Less secure app access" is disabled');
            console.log('3. You need to use an App Password instead');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            console.log('\n🌐 Connection failed. This could mean:');
            console.log('1. Network connectivity issues');
            console.log('2. Firewall blocking SMTP connections');
            console.log('3. ISP blocking port 587');
        }
    }
};

simpleTest();
