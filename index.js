import express from 'express';
import { ParseServer } from 'parse-server';
import fs from 'fs';
import http from 'http';

console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const app = express();
const port = process.env.PORT || 1337;

// Kontroll: FCM måste finnas
if (!process.env.FCM_SERVICE_ACCOUNT) {
  console.error('❌ Miljövariabeln FCM_SERVICE_ACCOUNT saknas!');
  process.exit(1);
}

// Parsea FCM JSON
let fcm;
try {
  fcm = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account )');
} catch (err) {
  console.error('❌ Fel vid parsing av FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

/* ----- Push-konfiguration ----- */
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

/* ----- Starta server ----- */
async function startServer() {
  const parseServer = new ParseServer({
    databaseURI: process.env.DATABASE_URI,
    cloud: './cloud/main.js',
    appId: process.env.APP_ID,
    masterKey: process.env.MASTER_KEY,
    serverURL: process.env.SERVER_URL,
    publicServerURL: process.env.PUBLIC_SERVER_URL,
    push,
    allowClientClassCreation: false,
  });

  await parseServer.start();

  app.use('/parse', parseServer.app);

  // Health endpoint
  app.get('/parse/health', (_, res) => res.json({ status: 'ok' }));

  const httpServer = http.createServer(app);
  httpServer.listen(port, () => {
    console.log(`🚀 Parse Server körs på port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Fel vid serverstart:', err);
});
