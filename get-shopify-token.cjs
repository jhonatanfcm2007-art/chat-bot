const express = require('express');
const app = express();
const port = 3001;
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

let CURRENT_CLIENT_ID = '';
let CURRENT_CLIENT_SECRET = '';
const SHOP = 'tqz44p-hk.myshopify.com';
const REDIRECT_URI = 'http://localhost:3001/callback';
const SCOPES = 'read_customers,write_customers,read_orders,write_orders,write_draft_orders,read_draft_orders';

app.get('/', (req, res) => {
    res.send(`
        <html><head><meta charset="UTF-8"><title>Obtener Token</title></head>
        <body style="font-family: Arial; padding: 40px; background: #f4f6f8;">
            <div style="max-width: 600px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: auto;">
                <h2>Paso 1: Ingresa tus credenciales</h2>
                <p style="color: #666;">Como cambiaste de app o se borró la anterior, el ID viejo ya no sirve. Pega aquí el <b>ID de cliente</b> y el <b>Secreto</b> de tu app actual (la que está viva en tu Dev Dashboard).</p>
                
                <form action="/auth" method="POST">
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px;">ID de cliente (Client ID):</label>
                        <input type="text" name="client_id" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Ej: 80b1bac...">
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px;">Secreto (Client Secret):</label>
                        <input type="text" name="client_secret" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Ej: shpss_...">
                    </div>
                    
                    <p style="color: red; font-size: 14px;"><b>¡IMPORTANTE!</b> Asegúrate de que el traductor de Google esté <b>APAGADO</b> en esta página para que no rompa los códigos al enviarlos.</p>
                    
                    <button type="submit" style="background: #008060; color: white; border: none; padding: 12px 20px; font-size: 16px; border-radius: 4px; cursor: pointer; width: 100%;">
                        Generar Token de Shopify
                    </button>
                </form>
            </div>
        </body></html>
    `);
});

app.post('/auth', (req, res) => {
    CURRENT_CLIENT_ID = req.body.client_id.trim();
    CURRENT_CLIENT_SECRET = req.body.client_secret.trim();
    
    console.log("Iniciando auth con ID:", CURRENT_CLIENT_ID);
    
    const authUrl = `https://${SHOP}/admin/oauth/authorize?client_id=${CURRENT_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${REDIRECT_URI}&state=123456`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.send('Error: No se recibió ningún código de autorización.');
    }

    try {
        const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: CURRENT_CLIENT_ID,
                client_secret: CURRENT_CLIENT_SECRET,
                code: code
            })
        });

        const data = await response.json();
        
        if (data.access_token) {
            const accessToken = data.access_token;
            res.send(`
                <div style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1 style="color: #008060;">¡ÉXITO TOTAL!</h1>
                    <p style="font-size: 20px;">Copia este código y pégalo en Railway en la variable <b>SHOPIFY_ACCESS_TOKEN</b>:</p>
                    <div style="padding: 20px; background: #eee; border: 2px dashed #008060; font-size: 28px; font-family: monospace; display: inline-block;">
                        ${accessToken}
                    </div>
                </div>
            `);
            console.log('\n\n✅ TOKEN OBTENIDO EXITOSAMENTE:\n', accessToken, '\n\n');
        } else {
            console.error(data);
            res.send('Error al obtener el token: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error(error);
        res.send('Error de red al obtener el token. Revisa la consola.');
    }
});

app.listen(port, () => {
    console.log(`\n\n🚀 Servidor de Autenticación listo.`);
    console.log(`👉 Abre tu navegador e ingresa a: http://localhost:${port}\n\n`);
});
