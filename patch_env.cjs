const fs = require('fs');

let envContent = fs.readFileSync('.env', 'utf8');

const token1Match = envContent.match(/WHATSAPP_TOKEN=(.*)/);
const tokenToUse = token1Match ? token1Match[1].trim() : '';

const newPhoneId = '1348380355027930';

if (!envContent.includes('WHATSAPP_PHONE_ID_3')) {
    envContent += `\nWHATSAPP_PHONE_ID_3=${newPhoneId}`;
    envContent += `\nWHATSAPP_TOKEN_3=${tokenToUse}\n`;
    fs.writeFileSync('.env', envContent);
    console.log('Line 3 added successfully.');
} else {
    // replace if exists
    envContent = envContent.replace(/WHATSAPP_PHONE_ID_3=.*/, `WHATSAPP_PHONE_ID_3=${newPhoneId}`);
    envContent = envContent.replace(/WHATSAPP_TOKEN_3=.*/, `WHATSAPP_TOKEN_3=${tokenToUse}`);
    fs.writeFileSync('.env', envContent);
    console.log('Line 3 updated successfully.');
}
