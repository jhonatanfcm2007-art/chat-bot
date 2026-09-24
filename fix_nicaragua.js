import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Update AI Country inference to explicitly include Nicaragua and Panama
content = content.replace(
    "else if (aiCountry === 'CL' || aiCountry.includes('CHILE')) countryISO = 'CL';",
    "else if (aiCountry === 'CL' || aiCountry.includes('CHILE')) countryISO = 'CL';\n        else if (aiCountry === 'NI' || aiCountry.includes('NICARAGUA')) countryISO = 'NI';\n        else if (aiCountry === 'PA' || aiCountry.includes('PANAMA')) countryISO = 'PA';"
);

content = content.replace(
    "else if (detectPhone.startsWith('57')) countryISO = 'CO';",
    "else if (detectPhone.startsWith('57')) countryISO = 'CO';\n        else if (detectPhone.startsWith('505')) countryISO = 'NI';\n        else if (detectPhone.startsWith('507')) countryISO = 'PA';"
);

// Update ISO mapping
content = content.replace(
    "else if (countryISO === 'CO') effectivePrefix = '57';",
    "else if (countryISO === 'CO') effectivePrefix = '57';\n        else if (countryISO === 'NI') effectivePrefix = '505';\n        else if (countryISO === 'PA') effectivePrefix = '507';"
);

fs.writeFileSync('server/index.js', content);
console.log("Added Nicaragua (NI, 505) and Panama (PA, 507) to country inference logic");
