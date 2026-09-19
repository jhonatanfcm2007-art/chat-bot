const fs = require('fs');

let settings = JSON.parse(fs.readFileSync('server/data/settings.json', 'utf8'));

for (let key in settings) {
    if (settings[key].systemPrompt) {
        settings[key].systemPrompt = settings[key].systemPrompt.replace(
            /\[PRODUCTOS: 1 Frasco Shilajit\]/g, 
            "[PRODUCTOS: Shilajit x1]"
        );
        settings[key].systemPrompt = settings[key].systemPrompt.replace(
            /\[INTERES: Combo 2 Tarros\]/g, 
            "[INTERES: Shilajit x2]"
        );
        settings[key].systemPrompt = settings[key].systemPrompt.replace(
            /\[INTERES: NombreDelCombo\]/g, 
            "[INTERES: NombreExactoDelProducto xCantidad]"
        );
    }
}

fs.writeFileSync('server/data/settings.json', JSON.stringify(settings, null, 2));
