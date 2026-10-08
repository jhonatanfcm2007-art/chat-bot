const fs = require('fs');
let code = fs.readFileSync('src/components/AIAssistant.jsx', 'utf8');

code = code.replace(
  /const \[welcomeImageUrl, metaPixelId, metaCapiToken, setWelcomeImageUrl\] = useState\((['"])(.*?)\1\);/g,
  "const [welcomeImageUrl, setWelcomeImageUrl] = useState('');"
);

fs.writeFileSync('src/components/AIAssistant.jsx', code);
console.log('Fixed syntax error via regex!');
