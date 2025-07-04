const express = require('express');
const parseServerPkg = require('parse-server');
const fs = require('fs');
const http = require('http');
const path = require('path');

const { ParseServer } = parseServerPkg;

console.log('✅ Initierar Parse Server med push-stöd...');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const databaseURI = process.env.MONGODB_URI;
const appId = process.env.APP_ID;
const masterKey = process.env.MASTER_KEY;
const serverURL = process.env.SERVER_URL;
const publicServerURL = process.env.PUBLIC_SERVER_URL;

console.log('📦 APP_ID:', appId);
console.log('📦 MASTER_KEY:', masterKey);
console.log('🌍 SERVER_URL:', serverURL);

app.enable('trust proxy'); // Heroku-proxy stöd

// ----- Kontrollera FCM -----
let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account)');
} catch (err) {
  console.error('❌ FCM_SERVICE_ACCOUNT parsing misslyckades:', err);
  process.exit(1);
}

// ----- Push-inställningar -----
const push = {
  android: {
    senderId: process.env.FCM_SENDER_ID,
    serviceAccount: fcmServiceAccount,
    type: 'fcm',
  },
  ios: [
    {
      token: {
        key: fs.readFileSync('./certificates/AuthKey_AT4486F4YN.p8'),
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW',
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: false,
    },
  ],
};

// ----- Middleware: CORS -----
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Application-Id, X-Parse-Master-Key'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// ----- serverInfo -----
app.get(`${mountPath}/serverInfo`, (req, res) => {
  return res.json({
    parseServerVersion: ParseServer.version,
    features: {
      globalConfig: true,
      hooks: true,
      logs: true,
      push: true,
      schemas: true,
      cloudCode: true,
      logsViewer: true,
    },
  });
});

// ----- Health-check -----
app.get(`${mountPath}/health`, (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// ----- Starta server (async för ParseServer v8+) -----
async function startServer() {
  const parseServer = new ParseServer({
    databaseURI,
    cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, 'cloud/main.js'),
    appId,
    masterKey,
    serverURL,
    publicServerURL,
    push,
    allowClientClassCreation: true,
    liveQuery: {
      classNames: ['Posts', 'Comments'],
    },
    logLevel: 'info',
    verbose: true,
  });

  await parseServer.start(); // 💥 Obligatoriskt i Parse Server 8+

  app.use(mountPath, parseServer.app);

  const httpServer = http.createServer(app);
  httpServer.listen(port, () => {
    console.log(`🚀 Parse Server körs på http://localhost:${port}${mountPath}`);
  });

  ParseServer.createLiveQueryServer(httpServer);
}

startServer().catch((err) => {
  console.error('❌ Fel vid start av Parse Server:', err);
});

// ----- Global felhantering -----
process.on('unhandledRejection', (reason, promise) => {
  console.error('🧨 Ohanterat Promise-fel:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🔥 Ohanterat fel:', err);
});
