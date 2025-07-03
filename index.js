import express from 'express';
import { createServer } from 'http';
import { ParseServer } from 'parse-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname i ES-moduler
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const {
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  DATABASE_URI,
  FCM_SERVICE_ACCOUNT,
} = process.env;

// Kontrollera miljövariabler
if (!APP_ID || !MASTER_KEY || !SERVER_URL || !DATABASE_URI) {
  console.error("❌ En eller flera viktiga miljövariabler saknas (APP_ID, MASTER_KEY, SERVER_URL, DATABASE_URI).");
  process.exit(1);
}

if (!FCM_SERVICE_ACCOUNT) {
  console.error('❌ Miljövariabeln FCM_SERVICE_ACCOUNT saknas!');
  process.exit(1);
}

// Parsea FCM-tjänstnyckel
let fcm;
try {
  fcm = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account )');
} catch (err) {
  console.error('❌ Fel vid parsing av FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

// Push-konfiguration
const push = {
  android: {
    senderId: process.env.FCM_SENDER_ID,
    serviceAccount: fcm,
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

// Tillåt CORS och headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Application-Id, X-Parse-Master-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Health-check
app.get(`${mountPath}/health`, (_, res) => {
  res.json({ status: 'ok' });
});

// Public endpoint
app.use('/public', express.static(path.join(__dirname, 'public')));

// Root-endpoint
app.get('/', (_, res) => {
  res.status(200).send('✅ Parse Server uppe och kör!');
});

// Initiera Parse Server
const parseServer = new ParseServer({
  databaseURI: DATABASE_URI,
  cloud: './cloud/main.js',
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  push,
  allowClientClassCreation: false,
  liveQuery: {
    classNames: ['Posts', 'Comments'],
  },
});

// Mounta servern
app.use(mountPath, parseServer.app);

// Starta HTTP-servern
const httpServer = createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Servern körs på http://localhost:${port}${mountPath}`);
});

// LiveQuery
ParseServer.createLiveQueryServer(httpServer);
