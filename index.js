import express from 'express';
import { ParseServer } from 'parse-server';
import { ParsePushAdapter } from '@parse/push-adapter';

console.log('✅ Initierar Parse Server med push-stöd...');

// 1. Läs och parsa FCM-servicekontot
let fcmCred;
try {
  fcmCred = JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type:', fcmCred.type, ')');
} catch (e) {
  console.error('❌ Ogiltig JSON i FCM_SERVICE_ACCOUNT:', e);
  process.exit(1);
}

// 2. Skapa PushAdapter med firebaseServiceAccount enligt dokumentation
let pushAdapter;
try {
  pushAdapter = new ParsePushAdapter({
    android: {
      firebaseServiceAccount: fcmCred,
      // Om du får HTTP/1.1-relaterade varningar kan du lägga till:
      // fcmEnableLegacyHttpTransport: true,
    },
    ios: {
      token: {
        key: process.env.APN_KEY_PATH,
        keyId: process.env.APN_KEY_ID,
        teamId: process.env.APN_TEAM_ID,
      },
      topic: process.env.APN_TOPIC,
    },
    resolveUnhandledClientError: true
  });
  console.log('✅ PushAdapter initierad');
} catch (err) {
  console.error('❌ Fel vid initialisering av PushAdapter:', err);
  process.exit(1);
}

// 3. Initiera Parse Server
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

// 4. Express-app
const app = express();
app.use('/parse', api.app);

// 5. Starta servern
const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`✅ Parse Server kör på port ${port}`);
});
