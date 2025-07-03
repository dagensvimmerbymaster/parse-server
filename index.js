import express from 'express';
import { ParseServer } from 'parse-server';
import fs from 'fs';
import { createServer } from 'http';
import path from 'path';

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

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

// ----- Skapa ParseServer-instans -----
const parseServer = new ParseServer({
  databaseURI: process.env.MONGODB_URI,
  cloud: path.resolve('./main.js'), // OBS: rätt sökväg
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  push,
  allowClientClassCreation: false,
  liveQuery: {
    classNames: ['Posts', 'Comments'],
  },
});

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

// ----- /serverInfo endpoint (för t.ex. Parse Dashboard) -----
const serverInfoHandler = (req, res) => {
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
};

app.get(`${mountPath}/serverInfo`, serverInfoHandler);
app.post(`${mountPath}/serverInfo`, serverInfoHandler);

// ----- Health-check (måste sättas innan Parse mountas) -----
app.get(`${mountPath}/health`, (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// ----- Mounta Parse Server -----
app.use(mountPath, parseServer.app);

// ----- Starta HTTP-server + LiveQuery -----
const httpServer = createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Parse Server körs på http://localhost:${port}${mountPath}`);
});

// ----- Starta LiveQuery Server -----
ParseServer.createLiveQueryServer(httpServer);
