// index.js – Stabil version för Parse Server v6+ med dashboard + push + /serverInfo-fix

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

const databaseURI = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseURI) {
  console.warn('⚠️ DATABASE_URI not specified, använder localhost.');
}

const appId = process.env.APP_ID;
const masterKey = process.env.MASTER_KEY;
const readOnlyMasterKey = process.env.READ_ONLY_MASTER_KEY;
const serverURL = process.env.SERVER_URL;
const publicServerURL = process.env.PUBLIC_SERVER_URL || serverURL;

const pushKeyPath = path.resolve(__dirname, 'certificates/AuthKey_AT4486F4YN.p8');
console.log('🔐 Push cert path:', pushKeyPath);

const pushAdapter = new PushAdapter({
  android: {
    senderId: '9966393092',
    apiKey: 'AAAAAlILFwQ:APA91bFc35odIRUsaAFv58wDbO_3ram_yFk92npV9HfD3T-eT7rRXMsrq8601-Y6b4RPA44KcgQe8ANGoSucIImdIs0ZlLBYPyQzVBD3s5q8C9Wj5T-Fnk684Kl1I_iWxTJyrWoim8sr'
  },
  ios: [
    {
      token: {
        key: fs.readFileSync(pushKeyPath),
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW'
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: true
    }
  ]
});

const parseServer = new ParseServer({
  databaseURI,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, 'cloud/main.js'),
  appId,
  masterKey,
  readOnlyMasterKey,
  serverURL,
  publicServerURL,
  push: { adapter: pushAdapter },
  liveQuery: {
    classNames: ['Posts', 'Comments']
  },
  protectedFields: {
    _Installation: {
      '*': [] // tillgänglig i dashboard
    }
  }
});

// ✅ Lägg till /serverInfo route manuellt (dashboard kräver detta)
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

app.use(mountPath, parseServer.app);
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (_, res) => {
  res.status(200).send('✅ Parse Server uppe och kör!');
});

app.get('/test', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/test.html'));
});

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}${mountPath}`);
});

ParseServer.createLiveQueryServer(httpServer);
