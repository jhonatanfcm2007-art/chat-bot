import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /case 'users':[\s\S]*?return <UsersManager serverUrl={SERVER_URL} currentUser={currentUser} \/>;/;
const replacement = `case 'users':
        return <UsersManager serverUrl={SERVER_URL} currentUser={currentUser} />;
      case 'incidents':
        return <Incidents BACKEND_URL={SERVER_URL} socket={socket} />;`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/App.jsx', content);
    console.log("App.jsx updated with incidents case via regex");
} else {
    console.log("Regex not found in App.jsx");
}
