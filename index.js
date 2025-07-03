import express from 'express';
import { ParseServer } from 'parse-server';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Läser och parser FCM-servicekontot
let pushConfig = {};
try {
  const fcmCredentials = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type:', fcmCredentials.type, ')');
  pushConfig = {
    android: {
      senderId: process.env.FCM_SENDER_ID,
      apiKey: fcmCredentials.private_key,
    },
    ios: {
      pfx: fs.readFileSync('./certificates/AuthKey_AT4486F4YN.p8'),
      topic: 'com.dagensvimmerbyab.DV',
      keyId: 'AT4486F4YN',
      teamId: '5S4Z656PBW',
      production: true,
    },
  };
} catch (e) {
  console.error('❌ Misslyckades läsa FCM_SERVICE_ACCOUNT:', e);
}

// Skapar Parse-serverinstansen
const parseServer = new ParseServer({
  databaseURI: process.env.DATABASE_URI || '',
  cloud: './cloud/main.js',
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  appName: 'DagensVimmerby',
  push: pushConfig,
  allowClientClassCreation: false,
});

// Startar Express + Parse
const app = express();
app.use('/parse', parseServer.app);

const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`✅ Parse Server kör på port ${port}`);
});
