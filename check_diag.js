import fetch from 'node-fetch';

async function check() {
    try {
        const res = await fetch('https://backend-production-3b17.up.railway.app/api/diagnostico');
        const data = await res.json();
        console.log(data);
    } catch(e) {
        console.error(e);
    }
}
check();
