import express from 'express';
import { createServer } from 'http';
import { ParseServer } from 'parse-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix för __dirname i ES-modulmiljö
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const {
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  MONGODB_URI,
  FCM_SERVICE_ACCOUNT,
} = process.env;

// Kontrollera miljövariabler
if (!APP_ID || !MASTER_KEY || !SERVER_URL || !MONGODB_URI) {
  console.error('❌ En eller flera viktiga miljövariabler saknas (APP_ID, MASTER_KEY, SERVER_URL, MONGODB_URI).');
  process.exit(1);
}

if (!FCM_SERVICE_ACCOUNT) {
  console.error('❌ Miljövariabeln FCM_SERVICE_ACCOUNT saknas!');
  process.exit(1);
}

let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account)');
} catch (err) {
  console.error('❌ Fel vid parsing av FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

// Push-konfiguration
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

// Starta ParseServer
const parseServer = new ParseServer({
  databaseURI: MONGODB_URI,
  cloud: path.join(__dirname, 'main.js'),
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  push,
  masterKeyIps: ['0.0.0.0/0', '::/0'],
  allowClientClassCreation: false,
  liveQuery: {
    classNames: ['Posts', 'Comments'],
  },
});

// CORS och headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Application-Id, X-Parse-Master-Key'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Mounta Parse
app.use(mountPath, parseServer.app);

// Health endpoint
app.get(`${mountPath}/health`, (_, res) => res.json({ status: 'ok' }));

// Root info route
app.get('/', (_, res) => {
  res.status(200).send('✅ Parse Server uppe och kör!');
});

// Starta HTTP-server
httpServer.listen(port, () => {
  console.log(`🚀 Parse Server körs på http://localhost:${port}${mountPath}`);
});

// Starta LiveQuery-server
ParseServer.createLiveQueryServer(httpServer);
