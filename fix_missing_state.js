import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

content = content.replace(
    "const [fullscreenImage, setFullscreenImage] = useState(null);",
    "const [isFetchingGuides, setIsFetchingGuides] = useState(false);\n  const [fullscreenImage, setFullscreenImage] = useState(null);"
);

fs.writeFileSync('src/components/Simulator.jsx', content);
console.log("State injected successfully");
