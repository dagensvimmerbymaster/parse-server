// index.js – För Parse Server v6+ med korrekt initiering

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
  console.warn('⚠️ DATABASE_URI not specified, falling back to localhost.');
}

const appId = process.env.APP_ID || 'id-FAoIJ78ValGFwYdBWfxch7Fm';

const pushKeyPath = path.resolve(__dirname, './certificate/AuthKey-AT4486F4YN.p8');
console.log('🔐 Push key path:', pushKeyPath);

let pushConfig;
try {
  const apnsKey = fs.readFileSync(pushKeyPath);

  pushConfig = {
    ios: {
      token: {
        key: apnsKey,
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW'
      },
      topic: 'com.dagensvimmerbyab.DH',
      production: true
    }
  };
} catch (err) {
  console.error('❌ Kunde inte läsa APNs-nyckeln:', err.message);
}

const herokuURL = 'https://dagensvimmerby.herokuapp.com' + mountPath;
const serverURL = process.env.SERVER_URL || herokuURL;
const publicServerURL = process.env.PUBLIC_SERVER_URL || herokuURL;

const parseServer = new ParseServer({
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, '/cloud/main.js'),
  appId,
  masterKey: process.env.MASTER_KEY,
  serverURL,
  publicServerURL,
  push: pushConfig,
  liveQuery: {
    classNames: ['Posts', 'Comments']
  }
});

app.use(mountPath, parseServer.app);
app.use('/public', express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.status(200).send('✅ Parse Server deployed successfully.');
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}${mountPath}`);
});

ParseServer.createLiveQueryServer(httpServer);
