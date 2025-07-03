import express from 'express';
import { ParseServer } from 'parse-server';
import fs from 'fs';
import http from 'http';

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

// Kontrollera miljövariabler
const {
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  FCM_SENDER_ID,
  FCM_SERVICE_ACCOUNT,
  APN_KEY_ID,
  APN_TEAM_ID,
} = process.env;

const DATABASE_URI = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!APP_ID || !MASTER_KEY || !SERVER_URL || !DATABASE_URI) {
  console.error('❌ En eller flera viktiga miljövariabler saknas (APP_ID, MASTER_KEY, SERVER_URL, DATABASE_URI).');
  process.exit(1);
}

if (!FCM_SERVICE_ACCOUNT) {
  console.error('❌ Miljövariabeln FCM_SERVICE_ACCOUNT saknas!');
  process.exit(1);
}

// Parsea FCM JSON
let fcm;
try {
  fcm = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log(`✅ FCM_SERVICE_ACCOUNT parsed (type: ${fcm.type})`);
} catch (err) {
  console.error('❌ Fel vid parsing av FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

// Push-konfiguration
const push = {
  android: {
    senderId: FCM_SENDER_ID,
    serviceAccount: fcm,
    type: 'fcm',
  },
  ios: [
    {
      token: {
        key: fs.readFileSync('./certificates/AuthKey_AT4486F4YN.p8'),
        keyId: APN_KEY_ID,
        teamId: APN_TEAM_ID,
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: false,
    },
  ],
};

const parseServer = new ParseServer({
  databaseURI: DATABASE_URI,
  cloud: './cloud/main.js',
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  push,
  allowClientClassCreation: false,
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Application-Id, X-Parse-Master-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

app.use(mountPath, parseServer.app);
app.use('/public', express.static('public'));

app.get('/', (_, res) => {
  res.status(200).send('✅ Parse Server uppe och kör!');
});

app.get(`${mountPath}/health`, (_, res) => res.json({ status: 'ok' }));

// Starta servern
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Parse Server körs på http://localhost:${port}${mountPath}`);
});

// Om du använder LiveQuery (annars kan du ta bort den här raden)
ParseServer.createLiveQueryServer(httpServer);
