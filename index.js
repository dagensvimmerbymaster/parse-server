const express = require('express');
const parseServerPkg = require('parse-server');
const fs = require('fs');
const http = require('http');
const path = require('path');

const { ParseServer } = parseServerPkg;

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

app.enable('trust proxy');

// ----- Kontrollera FCM -----
let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account)');
} catch (err) {
  console.error('❌ FCM_SERVICE_ACCOUNT parsing misslyckades:', err);
  process.exit(1);
}

// ----- Kontrollera att APNS-filen finns -----
const apnsKeyPath = path.resolve(__dirname, './certificates/AuthKey_AT4486F4YN.p8');
if (!fs.existsSync(apnsKeyPath)) {
  console.error('❌ Hittar inte APNS .p8-filen på:', apnsKeyPath);
  process.exit(1);
}
console.log('✅ APNS .p8 hittades:', apnsKeyPath);

// ----- (Tillfällig) loggning av .p8-innehåll -----
try {
  const apnsKeyContent = fs.readFileSync(apnsKeyPath, 'utf8');
  console.log('🧾 .p8-filen laddades, första 200 tecken:\n', apnsKeyContent.substring(0, 200));
} catch (e) {
  console.error('❌ Kunde inte läsa .p8-filen:', e);
  process.exit(1);
}

// ----- Push-inställningar -----
const push = {
  ios: [
    {
      token: {
        key: fs.readFileSync(apnsKeyPath, 'utf8'),
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW',
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: true,
      maxConnections: 1,
      connectionRetryLimit: 10,
      connectionTimeout: 120000,
      keepAlive: true,
      batchSize: 5,    // Om din version av parse-server stödjer detta
      batchWait: 5000, // Om din version av parse-server stödjer detta
    },
  ],
};

console.log('✅ APNS push-adapter initieras med maxConnections = 1');

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

// ----- serverInfo endpoint -----
app.get(`${mountPath}/serverInfo`, (req, res) => {
  return res.json({
    parseServerVersion: ParseServer.version || 'unknown',
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

// ----- Starta Parse Server -----
async function startServer() {
  const parseServer = new ParseServer({
    databaseURI: process.env.MONGODB_URI,
    cloud: path.resolve(__dirname, 'cloud/main.js'),
    appId: process.env.APP_ID,
    masterKey: process.env.MASTER_KEY,
    serverURL: process.env.SERVER_URL,
    publicServerURL: process.env.PUBLIC_SERVER_URL,
    javascriptKey: process.env.JAVASCRIPT_KEY || '',
    restAPIKey: process.env.REST_API_KEY || '',
    dotNetKey: process.env.DOTNET_KEY || '',
    clientKey: process.env.CLIENT_KEY || '',
    push,
    masterKeyIps: ['0.0.0.0/0', '::/0'],
    allowClientClassCreation: true,
    liveQuery: {
      classNames: ['Posts', 'Comments'],
    },
    logLevel: 'info',
    verbose: true,
  });

  await parseServer.start();

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
