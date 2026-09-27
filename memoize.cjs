const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

// Add useMemo to imports if not there
if (!code.includes('useMemo')) {
    code = code.replace(/import React, {([^}]+)} from 'react';/, "import React, { $1, useMemo } from 'react';");
}

// Memoize chatSessions
const oldChatSessions = "const chatSessions = Object.entries(chats)";
const newChatSessions = "const chatSessions = useMemo(() => Object.entries(chats)";
if (code.includes(oldChatSessions) && !code.includes(newChatSessions)) {
    code = code.replace(oldChatSessions, newChatSessions);
    
    // Find the end of the chatSessions declaration to close the useMemo
    const endStr = ".sort((a, b) => b.activityTime - a.activityTime);";
    if (code.includes(endStr)) {
        const newEndStr = endStr + "\n  }, [chats, searchTerm, filterTag, filterProduct, filterCountry, filterOwner, filterGuide]);";
        code = code.replace(endStr, newEndStr);
    }
}

// We should also memoize the selected chat data if it's heavy, or simply let the MessageInput component handle its own state.
// To fully fix typing lag, we MUST extract the input.
fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Memoized chatSessions');
