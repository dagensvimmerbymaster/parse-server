import express from 'express';
import { ParseServer } from 'parse-server';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const {
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  MONGODB_URI,
  FCM_SERVICE_ACCOUNT,
  FCM_SENDER_ID,
  APN_KEY_PATH,
  APN_KEY_ID,
  APN_TEAM_ID,
  APN_TOPIC
} = process.env;

// ✅ Läs och parsa FCM-nyckeln
let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed');
} catch (err) {
  console.error('❌ Failed to parse FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

// ✅ Push-konfiguration
const pushConfig = {
  android: {
    senderId: FCM_SENDER_ID,
    serviceAccount: fcmServiceAccount,
  },
  ios: {
    token: {
      key: APN_KEY_PATH,
      keyId: APN_KEY_ID,
      teamId: APN_TEAM_ID
    },
    topic: APN_TOPIC
  }
};

// ✅ Initiera Parse Server
const api = new ParseServer({
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  databaseURI: MONGODB_URI,
  cloud: './main.js',
  push: pushConfig,
  allowClientClassCreation: false
});

// ✅ Express-app med korrekt middleware
const app = express();
app.use('/parse', api.app);  // 🟢 VIKTIG FIX

// ✅ Starta server
const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`✅ Parse Server running on port ${port}`);
});
