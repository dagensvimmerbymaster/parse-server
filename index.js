// index.js – Stabil version för Parse Server v6+ med dashboard- och push-stöd

console.log('✅ Initierar Parse Server med push-stöd...');

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');
const PushAdapter = require('@parse/push-adapter').default;

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
  console.warn('⚠️ DATABASE_URI not specified, använder localhost.');
}

const appId = process.env.APP_ID;
const masterKey = process.env.MASTER_KEY;
const readOnlyMasterKey = process.env.READ_ONLY_MASTER_KEY || ''; // om du behöver

console.log('📦 MASTER_KEY:', masterKey);
console.log('📦 READ_ONLY_MASTER_KEY:', readOnlyMasterKey);
console.log('🔁 Jämförda nycklar lika?:', masterKey === readOnlyMasterKey);

const pushKeyPath = path.resolve(__dirname, 'certificates/AuthKey_AT4486F4YN.p8');
console.log('🔐 Push cert path:', pushKeyPath);

const pushAdapter = new PushAdapter({
  android: {
    senderId: '9966393092',
    apiKey: '...'
  },
  ios: [{
      token: {
        key: fs.readFileSync(pushKeyPath),
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW'
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: true
  }]
});

// ✚ Custom endpoint för serverInfo — dashboard kräver detta för att ansluta
app.post(`${mountPath}/serverInfo`, express.json(), (req, res) => {
  return res.json({
    parseServerVersion: ParseServer.version,
    features: {
      globalConfig: true,
      hooks: true,
      logs: true,
      push: true,
      schemas: true,
      cloudCode: true,
      logsViewer: true
    }
  });
});

const parseServer = new ParseServer({
  databaseURI: databaseUri,
  cloud: path.join(__dirname, 'cloud/main.js'),
  appId,
  masterKey,
  ...(readOnlyMasterKey && { readOnlyMasterKey }), // endast om olika
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  push: { adapter: pushAdapter },
  liveQuery: { classNames: ['Posts', 'Comments'] },
  protectedFields: {
    _Installation: { '*': [] }
  },
  allowHeaders: ['X-Parse-Master-Key', 'X-Parse-REST-API-Key', 'X-Parsed-Application-Id']
});

// Mounta parse-server
app.use(mountPath, parseServer.app);
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (_, res) => res.send('🚀 Parse Server igång!'));
app.get('/test', (_, res) => res.sendFile(path.join(__dirname, 'public/test.html')));

const httpServer = http.createServer(app);
httpServer.listen(port, () =>
  console.log(`Server lyssnar på http://localhost:${port}${mountPath}`)
);
ParseServer.createLiveQueryServer(httpServer);
