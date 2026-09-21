import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const target = `case 'users':
        return <UsersManager serverUrl={SERVER_URL} currentUser={currentUser} />;`;

const replacement = `case 'users':
        return <UsersManager serverUrl={SERVER_URL} currentUser={currentUser} />;
      case 'incidents':
        return <Incidents BACKEND_URL={SERVER_URL} socket={socket} />;`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/App.jsx', content);
    console.log("App.jsx updated with incidents case");
} else {
    console.log("Target not found in App.jsx");
}
