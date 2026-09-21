import fs from 'fs';
let content = fs.readFileSync('src/components/MobileNav.jsx', 'utf8');

const regex = /{ id: 'simulator', icon: 'chat' },/;
const replacement = `{ id: 'simulator', icon: 'chat' },\n    { id: 'incidents', icon: 'local_shipping' },`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/MobileNav.jsx', content);
    console.log("MobileNav.jsx patched successfully");
} else {
    console.log("Regex not found in MobileNav.jsx");
}
