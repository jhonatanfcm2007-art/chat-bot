import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const targetUpload = `          if (response.ok) {
            const data = await response.json();
            uploadedImageUrl = data.url;
          } else {
            alert('Error al subir la imagen');
            return;
          }`;

const fixUpload = `          if (response.ok) {
            const data = await response.json();
            uploadedImageUrl = data.url;
          } else {
            const errText = await response.text();
            alert('Error del servidor al subir imagen: ' + errText);
            return;
          }`;

if (content.includes("alert('Error al subir la imagen');")) {
    content = content.replace(targetUpload, fixUpload);
    fs.writeFileSync('src/components/Simulator.jsx', content);
    console.log("Patched Simulator upload error alert");
} else {
    console.log("Target not found in Simulator");
}
