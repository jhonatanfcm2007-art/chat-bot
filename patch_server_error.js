import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetError = `    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).send('Upload failed');
    }`;

const fixError = `    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).send('Fallo interno al procesar la imagen: ' + e.message);
    }`;

if (content.includes("res.status(500).send('Upload failed');")) {
    content = content.replace(targetError, fixError);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched server error message");
} else {
    console.log("Target not found in server error log");
}
