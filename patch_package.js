import fs from 'fs';
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.devDependencies.playwright) {
    pkg.dependencies.playwright = pkg.devDependencies.playwright;
    delete pkg.devDependencies.playwright;
}
if (!pkg.scripts.postinstall) {
    pkg.scripts.postinstall = "npx playwright install chromium";
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("Updated package.json");
