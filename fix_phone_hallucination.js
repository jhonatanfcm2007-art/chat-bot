import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetStr = `if (phoneMatch) refreshedChat.orderPhone = cleanVal(phoneMatch[1]) || refreshedChat.orderPhone;`;

const replacementStr = `if (phoneMatch) {
            let extractedPhone = cleanVal(phoneMatch[1]);
            const basePhone = from.split('@')[0].split('_')[0].replace(/\\D/g, '');
            const cleanExtracted = extractedPhone ? extractedPhone.replace(/\\D/g, '') : '';
            
            // Fix: IA hallucinating waLine at the end of the phone number
            if (cleanExtracted === basePhone + (refreshedChat.waLine || 1)) {
                extractedPhone = basePhone;
            }
            
            refreshedChat.orderPhone = extractedPhone || refreshedChat.orderPhone;
        }`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('server/index.js', content);
    console.log("Fix applied successfully!");
} else {
    console.log("Could not find the target string.");
}
