import express from 'express';
import { ParseServer } from 'parse-server';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ParsePushAdapter } from '@parse/push-adapter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('✅ Initierar Parse Server med push-stöd...');

let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT || '{}');
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type:', fcmServiceAccount.type, ')');
} catch (error) {
  console.error('❌ Fel: Kunde inte parsa FCM_SERVICE_ACCOUNT JSON:', error);
  process.exit(1);
}

// Kontrollera att APNs-certifikatet finns
const apnsKeyPath = path.join(__dirname, 'certificates', 'AuthKey_AT4486F4YN.p8');
if (!fs.existsSync(apnsKeyPath)) {
  console.error(`❌ APNs .p8-certifikat saknas: ${apnsKeyPath}`);
  process.exit(1);
}

// Pushadapter-konfiguration
const pushAdapter = new ParsePushAdapter({
  android: {
    senderId: process.env.FCM_SENDER_ID,
    apiKey: fcmServiceAccount.private_key ? fcmServiceAccount.private_key : 'saknas',
    options: {
      credentials: {
        client_email: fcmServiceAccount.client_email,
        private_key: fcmServiceAccount.private_key,
        project_id: fcmServiceAccount.project_id,
      },
    },
  },
  ios: [
    {
      token: {
        key: fs.readFileSync(apnsKeyPath),
        keyId: 'AT4486F4YN',
        teamId: 'YOUR_TEAM_ID', // ⚠️ Ersätt med ditt riktiga Apple team-id
      },
      bundleId: 'com.dagensvimmerby.ios',
      production: false,
    },
  ],
});

const api = new ParseServer({
  databaseURI: process.env.DATABASE_URI || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || './cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || 'myMasterKey',
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',
  publicServerURL: process.env.PUBLIC_SERVER_URL || 'http://localhost:1337/parse',
  push: pushAdapter,
});

const app = express();
app.use('/parse', api.app);

const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`✅ Parse Server kör på port ${port}`);
});
