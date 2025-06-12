// index.js – Uppgraderad för Parse Server v6.4.0

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');

// Hämta databas-URL från miljövariabler
const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
  console.log('⚠️ DATABASE_URI not specified, falling back to localhost.');
}

// Push-konfiguration
const pushKeyPath = path.resolve(__dirname, './certificate/AuthKey-<keyID>.p8');
console.log('Push key path:', pushKeyPath);

const pushConfig = {
  android: {
    senderId: '',
    apiKey: ''
  },
  ios: {
    token: {
      key: pushKeyPath,
      keyId: '',
      teamId: '' // The Team ID for your Apple developer account
    },
    topic: '', // Your app's bundle identifier
    production: true
  }
};

// Skapa Parse Server-instansen
const parseServer = new ParseServer({
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, '/cloud/main.js'),
  appId: process.env.APP_ID || 'id-<ParseAppID>',
  masterKey: process.env.MASTER_KEY || 'key-<ParseMasterKey>',
  serverURL: process.env.SERVER_URL || 'http://<heroku-app>.herokuapp.com/parse',
  publicServerURL: process.env.PUBLIC_SERVER_URL || 'http://<heroku-app>.herokuapp.com/parse',
  push: pushConfig,
  liveQuery: {
    classNames: ['Posts', 'Comments']
  }
});

// Initiera Express
const app = express();

// Servera statiskt innehåll
app.use('/public', express.static(path.join(__dirname, '/public')));

// Mounta Parse API
const mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, parseServer);

// Test-rutter
app.get('/', (req, res) => {
  res.status(200).send('<AppName> parse-server deployed successfully');
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

// Starta servern
const port = process.env.PORT || 1337;
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`✅ Parse Server is running on port ${port}`);
});

// Aktivera Live Query-server
ParseServer.createLiveQueryServer(httpServer);
