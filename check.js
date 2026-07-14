const url = 'https://backend-production-3b17.up.railway.app';
fetch(url)
  .then(r => r.text())
  .then(html => {
    const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      console.log('Found JS:', match[1]);
      fetch(url + match[1]).then(r => {
        console.log('JS Status:', r.status);
        process.exit(0);
      });
    } else {
      console.log('No JS found in HTML:', html);
    }
  });
