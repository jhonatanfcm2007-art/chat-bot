import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.jsx';

try {
  // Mock localStorage and window
  global.localStorage = {
    getItem: (key) => key === 'globalLineRestricted' ? '2' : null,
    setItem: () => {},
    removeItem: () => {}
  };
  global.window = {
    location: { search: '?linea=2' }
  };
  global.navigator = { serviceWorker: null };
  global.document = { addEventListener: () => {}, removeEventListener: () => {} };
  
  const html = renderToString(<App />);
  console.log("RENDER SUCCESS!");
} catch (err) {
  console.error("RENDER ERROR:", err);
}
