
import express from 'express';
import { ParseServer } from 'parse-server';
import dotenv from 'dotenv';
import ParsePushAdapter from '@parse/push-adapter';
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

let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed');
} catch (err) {
  console.error('❌ Invalid FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

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

const api = new ParseServer({
  databaseURI: MONGODB_URI,
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  cloud: './main.js',
  push: pushConfig
});

const app = express();
app.use('/parse', api);

const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
