const nodemailer = require('nodemailer');
require('dotenv').config();

const { EMAIL_USER, EMAIL_PASS } = process.env;

console.log('Testing email configuration...');
console.log('EMAIL_USER:', EMAIL_USER ? `${EMAIL_USER.substring(0, 3)}***@${EMAIL_USER.split('@')[1]}` : 'NOT SET');
console.log('EMAIL_PASS:', EMAIL_PASS ? `${EMAIL_PASS.substring(0, 3)}***` : 'NOT SET');

const testEmailConfig = async () => {
    // Test 1: Basic configuration check
    console.log('\n=== Test 1: Configuration Check ===');
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error('❌ EMAIL_USER or EMAIL_PASS not configured');
        return;
    }
    console.log('✅ Email credentials are configured');

    // Test 2: Create transporter with different configurations
    console.log('\n=== Test 2: Testing Different SMTP Configurations ===');
    
    const configs = [
        {
            name: 'Gmail with service',
            config: {
                service: 'gmail',
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS,
                },
                connectionTimeout: 30000,
                socketTimeout: 30000,
                greetingTimeout: 30000
            }
        },
        {
            name: 'Gmail with host/port',
            config: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS,
                },
                connectionTimeout: 30000,
                socketTimeout: 30000,
                greetingTimeout: 30000,
                tls: {
                    rejectUnauthorized: false
                }
            }
        },
        {
            name: 'Gmail SSL (port 465)',
            config: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS,
                },
                connectionTimeout: 30000,
                socketTimeout: 30000,
                greetingTimeout: 30000,
                tls: {
                    rejectUnauthorized: false
                }
            }
        }
    ];

    for (const { name, config } of configs) {
        console.log(`\n--- Testing: ${name} ---`);
        try {
            const transporter = nodemailer.createTransport(config);
            console.log('⏳ Verifying connection...');
            
            const result = await Promise.race([
                transporter.verify(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Manual timeout after 30s')), 30000)
                )
            ]);
            
            console.log('✅ Connection successful!');
            
            // Try sending a test email
            console.log('⏳ Sending test email...');
            await transporter.sendMail({
                from: EMAIL_USER,
                to: EMAIL_USER, // Send to self
                subject: 'Test Email - Configuration Working',
                text: 'This is a test email to verify the email configuration is working properly.',
                html: '<p>This is a test email to verify the email configuration is working properly.</p>'
            });
            console.log('✅ Test email sent successfully!');
            
            transporter.close();
            return true;
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            if (error.code) {
                console.log(`   Error code: ${error.code}`);
            }
        }
    }
    
    return false;
};

const checkNetworkConnectivity = async () => {
    console.log('\n=== Test 3: Network Connectivity ===');
    
    const testConnections = [
        { host: 'smtp.gmail.com', port: 587, name: 'Gmail SMTP (587)' },
        { host: 'smtp.gmail.com', port: 465, name: 'Gmail SMTP SSL (465)' },
        { host: 'google.com', port: 80, name: 'Google HTTP (80)' }
    ];
    
    for (const { host, port, name } of testConnections) {
        try {
            console.log(`⏳ Testing connection to ${name}...`);
            const net = require('net');
            
            await new Promise((resolve, reject) => {
                const socket = new net.Socket();
                const timeout = setTimeout(() => {
                    socket.destroy();
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                socket.connect(port, host, () => {
                    clearTimeout(timeout);
                    socket.destroy();
                    resolve();
                });
                
                socket.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
            
            console.log(`✅ ${name} - Connection successful`);
        } catch (error) {
            console.log(`❌ ${name} - Failed: ${error.message}`);
        }
    }
};

const main = async () => {
    try {
        await checkNetworkConnectivity();
        const success = await testEmailConfig();
        
        if (success) {
            console.log('\n🎉 Email configuration is working properly!');
        } else {
            console.log('\n❌ Email configuration has issues. Please check:');
            console.log('1. Gmail account credentials are correct');
            console.log('2. Gmail "Less secure app access" is enabled OR use App Password');
            console.log('3. Network connectivity to Gmail servers');
            console.log('4. Firewall/proxy settings');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
};

main();
