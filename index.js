// index.js – För Parse Server v6+ med korrekt initiering

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');

// Initiera Express och miljövariabler först
const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

// Databas URI
const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
  console.warn('⚠️ DATABASE_URI not specified, falling back to localhost.');
}

// Push key path (för iOS om aktuellt)
const pushKeyPath = path.resolve(__dirname, './certificate/AuthKey-<keyID>.p8');
console.log('🔐 Push key path:', pushKeyPath);

// Android push config baserat på appId
const androidPushConfigs = {
  'id-FAoIJ78ValGFwYdBWfxch7Fm': {
    senderId: '9966393092',
    apiKey: 'AAAAAlILFwQ:APA91bFc35odIRUsaAFv58wDbO_3ram_yFk92npV9HfD3T-eT7rRXMsrq8601-Y6b4RPA44KcgQe8ANGoSucIImdIs0ZlLBYPyQzVBD3s5q8C9Wj5T-Fnk684Kl1I_iWxTJyrWoim8sr'
  }
  // lägg till fler vid behov
};

const appId = process.env.APP_ID || 'id-FAoIJ78ValGFwYdBWfxch7Fm';
const pushConfig = androidPushConfigs[appId]
  ? { android: androidPushConfigs[appId] }
  : undefined;

// Skapa Parse Server-instans
const parseServer = new ParseServer({
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, '/cloud/main.js'),
  appId,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL || `http://localhost:${port}${mountPath}`,
  publicServerURL: process.env.PUBLIC_SERVER_URL || `http://localhost:${port}${mountPath}`,
  push: pushConfig,
  liveQuery: {
    classNames: ['Posts', 'Comments'] // Ändra efter behov
  }
});

// Mounta Parse Server API
app.use(mountPath, parseServer.app);

// Statiskt innehåll om du har t.ex. test.html
app.use('/public', express.static(path.join(__dirname, '/public')));

// Test-rutter
app.get('/', (req, res) => {
  res.status(200).send('✅ Parse Server deployed successfully.');
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

// Starta HTTP-server
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}${mountPath}`);
});

// Aktivera LiveQuery
ParseServer.createLiveQueryServer(httpServer);
