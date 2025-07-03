import express from 'express';
import { ParseServer } from 'parse-server';
import { ParsePushAdapter } from '@parse/push-adapter';
import * as fs from 'fs';

const app = express();

// Miljövariabler
const {
  DATABASE_URI,
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  CLOUD_CODE_MAIN,
  FCM_SERVICE_ACCOUNT,
  FCM_SENDER_ID,
  PORT,
} = process.env;

// ✅ Initierar Parse Server med push-stöd...
console.log('✅ Initierar Parse Server med push-stöd...');

// FCM-konfiguration
let fcmConfig = {};
if (FCM_SERVICE_ACCOUNT) {
  try {
    const fcmServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
    console.log('✅ FCM_SERVICE_ACCOUNT parsed (type:', fcmServiceAccount.type, ')');
    fcmConfig = {
      android: {
        senderId: FCM_SENDER_ID,
        apiKey: '', // inte nödvändigt för service_account
      },
      fcm: {
        serviceAccount: fcmServiceAccount,
      },
    };
  } catch (err) {
    console.error('❌ Fel vid parsing av FCM_SERVICE_ACCOUNT:', err);
  }
}

// APNs-konfiguration
let apnsConfig = {};
try {
  const apnsKeyPath = './certificates/AuthKey_AT4486F4YN.p8';
  if (fs.existsSync(apnsKeyPath)) {
    apnsConfig = {
      ios: [
        {
          pfx: apnsKeyPath,
          keyId: 'AT4486F4YN',
          teamId: '5S4Z656PBW',
          topic: 'com.dagensvimmerbyab.DV',
          production: false,
        },
      ],
    };
  } else {
    console.warn(`⚠️ APNs-certifikat hittades inte på sökvägen ${apnsKeyPath}`);
  }
} catch (err) {
  console.error('❌ Fel vid laddning av APNs-certifikat:', err);
}

// Initiera PushAdapter
let pushConfig = {};
try {
  pushConfig = {
    ...fcmConfig,
    ...apnsConfig,
  };
} catch (err) {
  console.error('❌ Fel vid initialisering av PushAdapter:', err);
}

// Starta Parse Server
const parseServer = await ParseServer.start({
  databaseURI: DATABASE_URI || 'mongodb://localhost:27017/dev',
  appId: APP_ID || 'myAppId',
  masterKey: MASTER_KEY || 'myMasterKey',
  serverURL: SERVER_URL || 'http://localhost:1337/parse',
  publicServerURL: PUBLIC_SERVER_URL || 'http://localhost:1337/parse',
  cloud: CLOUD_CODE_MAIN || './cloud/main.js',
  push: pushConfig,
  allowClientClassCreation: false,
});

app.use('/parse', parseServer.app);

const port = PORT || 1337;
app.listen(port, () => {
  console.log(`✅ Parse Server kör på port ${port}`);
});
