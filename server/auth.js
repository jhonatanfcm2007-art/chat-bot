import express from 'express';

const app = express();
const port = 3002;

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const SCOPES = 'read_products,write_draft_orders,write_orders';
const REDIRECT_URI = `http://localhost:${port}/callback`;

app.get('/auth', (req, res) => {
    const shopToAuth = req.query.shop;
    if (!shopToAuth) {
        return res.send('Error: Por favor incluye la tienda en la URL. Ejemplo: http://localhost:3001/auth?shop=mitienda.myshopify.com');
    }
    const authUrl = `https://${shopToAuth}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${REDIRECT_URI}`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const { shop, code } = req.query;
    
    if (!shop || !code) {
        return res.send('Error: Falta shop o code en la respuesta.');
    }

    try {
        const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code
            })
        });

        const data = await response.json();
        
        if (data.access_token) {
            res.send(`
                <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h1 style="color: #4CAF50;">¡Conexión Exitosa!</h1>
                    <p style="font-size: 18px;">Tu Token de Acceso Permanente es:</p>
                    <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; font-size: 24px; margin: 20px auto; max-width: 600px; word-break: break-all; border: 2px solid #ddd;">
                        <strong>${data.access_token}</strong>
                    </div>
                    <p>Cópialo y envíaselo al desarrollador.</p>
                </div>
            `);
            console.log("\n✅ ¡ÉXITO! Tu Access Token es:");
            console.log(data.access_token);
            console.log("\n");
        } else {
            res.send('Error obteniendo el token. Revisa la consola.');
            console.log("Respuesta de error:", data);
        }
    } catch (error) {
        console.error(error);
        res.send('Error en el servidor. Revisa la consola.');
    }
});

app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 SERVIDOR DE AUTENTICACIÓN SHOPIFY INICIADO 🚀`);
    console.log(`======================================================`);
    console.log(`Paso 1: Entra a tu navegador web y escribe la siguiente dirección:`);
    console.log(`👉 http://localhost:${port}/auth?shop=tu-tienda-honduras.myshopify.com`);
    console.log(`(Asegúrate de cambiar "tu-tienda-honduras" por el nombre real de tu tienda nueva)`);
    console.log(`\nSi ya configuraste la app en Shopify para que redirija a http://localhost:3002/callback, el proceso será automático.\n`);
});
