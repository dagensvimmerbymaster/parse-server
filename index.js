import express from 'express';
import { ParseServer } from 'parse-server';
import { ParsePushAdapter } from '@parse/push-adapter';

console.log('✅ Initierar Parse Server med push-stöd...');

// FCM-konfiguration
let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT JSON parsed OK');
} catch (e) {
  console.error('❌ FCM_SERVICE_ACCOUNT kunde inte parsas:', e);
  process.exit(1);
}

// Push-adapter
const pushAdapter = new ParsePushAdapter({
  android: {
    senderId: process.env.FCM_SENDER_ID,
    serviceAccount: fcmServiceAccount,
  },
  ios: {
    token: {
      key: process.env.APN_KEY_PATH,
      keyId: process.env.APN_KEY_ID,
      teamId: process.env.APN_TEAM_ID,
    },
    topic: process.env.APN_TOPIC,
  },
});

// Skapa Parse Server
const api = new ParseServer({
  databaseURI: process.env.MONGODB_URI,
  cloud: './cloud/main.js',
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  push: pushAdapter,
  allowClientClassCreation: false,
});

// Express-app
const app = express();
app.use('/parse', api.app);

// Starta servern
const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`✅ Parse Server kör på port ${port}`);
});
