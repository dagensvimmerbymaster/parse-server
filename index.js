// index.js – Parse Server med dashboard-stöd och push

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

const appId = process.env.APP_ID || 'id-FAoIJ78ValGFwYdBWfxch7Fm';
const masterKey = process.env.MASTER_KEY || 'key-8uNA4ZslCgVoqFeuy5epBntj';
const serverURL = process.env.SERVER_URL || 'https://dagensvimmerby.herokuapp.com/parse';

console.log('📦 MASTER_KEY:', masterKey);

// 🔐 Push-certifikat
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
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, 'cloud/main.js'),
  appId,
  masterKey,
  serverURL,
  publicServerURL: serverURL,
  push: { adapter: pushAdapter },
  liveQuery: {
    classNames: ['Posts', 'Comments']
  },
  masterKeyIps: ['0.0.0.0/0', '::/0'], // Tillåt masterKey från alla IP
  protectedFields: {
    _Installation: {
      '*': [] // Gör _Installation synlig i dashboard
    }
  }
});

// Mounta Parse Server API
app.use(mountPath, parseServer.app);
app.use('/public', express.static(path.join(__dirname, 'public')));

// Enkelt hälsotest
app.get('/', (_, res) => {
  res.status(200).send('✅ Parse Server uppe och kör!');
});

app.get('/test', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/test.html'));
});

// Custom route för dashboard /parse/serverInfo
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

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Servern körs på http://localhost:${port}${mountPath}`);
});

ParseServer.createLiveQueryServer(httpServer);
