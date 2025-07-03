import express from 'express';
import { ParseServer } from 'parse-server';
import fs from 'fs';

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const port = process.env.PORT || 1337;

/* ----- Kontroll av miljövariabler ----- */
const {
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  MONGODB_URI,
  FCM_SENDER_ID,
  FCM_SERVICE_ACCOUNT
} = process.env;

if (!APP_ID || !MASTER_KEY || !SERVER_URL || !MONGODB_URI) {
  console.error('❌ En eller flera viktiga miljövariabler saknas (APP_ID, MASTER_KEY, SERVER_URL, MONGODB_URI).');
  process.exit(1);
}

if (!FCM_SERVICE_ACCOUNT) {
  console.error('❌ Miljövariabeln FCM_SERVICE_ACCOUNT saknas!');
  process.exit(1);
}

let fcm;
try {
  fcm = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account )');
} catch (err) {
  console.error('❌ Fel vid parsing av FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

/* ----- Push-konfiguration ----- */
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
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW',
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: false,
    },
  ],
};

/* ----- Skapa Parse-instansen ----- */
const parseServer = new ParseServer({
  databaseURI: MONGODB_URI,
  cloud: './cloud/main.js',
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  push,
  allowClientClassCreation: false,
});

/* ----- Middleware ----- */
app.use('/parse', parseServer.app);

/* ----- Health-endpoint ----- */
app.get('/parse/health', (_, res) => res.json({ status: 'ok' }));

/* ----- Starta server ----- */
app.listen(port, () => {
  console.log(`🚀 Parse Server körs på port ${port}`);
});
