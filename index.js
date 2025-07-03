import express from 'express';
import http from 'http';
import { ParseServer } from 'parse-server';
import { ParsePushAdapter } from '@parse/push-adapter';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

console.log('✅ Initierar Parse Server med push-stöd...');

const {
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  DATABASE_URI,
  FCM_SERVICE_ACCOUNT,
  APN_KEY_PATH,
  APN_KEY_ID,
  APN_TEAM_ID,
  APN_TOPIC
} = process.env;

// Kontrollera att nödvändiga miljövariabler finns
if (!APP_ID || !MASTER_KEY || !SERVER_URL || !DATABASE_URI) {
  console.error("❌ En eller flera viktiga miljövariabler saknas.");
  process.exit(1);
}

if (!FCM_SERVICE_ACCOUNT) {
  console.error('❌ FCM_SERVICE_ACCOUNT saknas!');
  process.exit(1);
}

let fcmServiceAccount;
try {
  fcmServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log('✅ FCM_SERVICE_ACCOUNT parsed (type: service_account )');
} catch (err) {
  console.error('❌ Fel vid parsing av FCM_SERVICE_ACCOUNT:', err);
  process.exit(1);
}

if (!APN_KEY_PATH || !fs.existsSync(APN_KEY_PATH)) {
  console.error('❌ APNs-certifikat saknas eller sökvägen är felaktig:', APN_KEY_PATH);
  process.exit(1);
}

const pushAdapter = new ParsePushAdapter({
  android: {
    serviceAccount: fcmServiceAccount,
  },
  ios: [{
    token: {
      key: fs.readFileSync(APN_KEY_PATH),
      keyId: APN_KEY_ID,
      teamId: APN_TEAM_ID
    },
    topic: APN_TOPIC,
    production: true,
  }]
});

const parseServer = new ParseServer({
  databaseURI: DATABASE_URI,
  cloud: path.join(__dirname, 'cloud', 'main.js'),
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: PUBLIC_SERVER_URL,
  push: pushAdapter,
  masterKeyIps: ['0.0.0.0/0', '::/0'],
  allowClientClassCreation: false,
  liveQuery: {
    classNames: ['Posts', 'Comments']
  }
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Application-Id, X-Parse-Master-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

app.get('/', (_, res) => {
  res.status(200).send('✅ Parse Server uppe och kör!');
});

app.get(`${mountPath}/health`, (_, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  await parseServer.start(); // Viktigt: starta Parse först
  app.use(mountPath, parseServer.app); // Använd sedan Express

  const httpServer = http.createServer(app);
  httpServer.listen(port, () => {
    console.log(`🚀 Servern körs på http://localhost:${port}${mountPath}`);
  });

  ParseServer.createLiveQueryServer(httpServer);
}

startServer().catch((err) => {
  console.error('❌ Fel vid serverstart:', err);
});
