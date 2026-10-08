const fs = require('fs');

// PATCH BACKEND (server/index.js)
let backendCode = fs.readFileSync('server/index.js', 'utf8');

const targetFunc = "chatEntries.sort((a, b) => b.activityTime - a.activityTime);";

const newLogic = `
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const filteredEntries = chatEntries.filter(({data, activityTime}) => {
        if (activityTime > threeDaysAgo) return true;
        if (data.tags && data.tags.length > 0) return true;
        return false;
    });
    
    filteredEntries.sort((a, b) => b.activityTime - a.activityTime);
`;

if (backendCode.includes(targetFunc)) {
    backendCode = backendCode.replace(targetFunc, newLogic);
    backendCode = backendCode.replace('for (const { id, data } of chatEntries) {', 'for (const { id, data } of filteredEntries) {');
    fs.writeFileSync('server/index.js', backendCode);
    console.log('Backend patched for 3-day limit.');
} else {
    console.log('Target function not found in backend.');
}

// PATCH FRONTEND (Simulator.jsx)
let frontendCode = fs.readFileSync('src/components/Simulator.jsx', 'utf8');
const depsFind = "}, [chats, searchTerm, filterTag, filterProduct, filterCountry, filterOwner, filterGuide]);";
const depsReplace = "}, [chats, searchTerm, filterTag, filterProduct, filterCountry, filterOwner, filterGuide, globalLine]);";

if (frontendCode.includes(depsFind)) {
    frontendCode = frontendCode.replace(depsFind, depsReplace);
    fs.writeFileSync('src/components/Simulator.jsx', frontendCode);
    console.log('Frontend patched with useMemo deps.');
} else {
    console.log('useMemo deps not found in frontend.');
}
