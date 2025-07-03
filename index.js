console.log('✅ Initierar Parse Server med push-stöd enligt Parse standard...');

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const {
  APP_ID,
  MASTER_KEY,
  SERVER_URL,
  PUBLIC_SERVER_URL,
  MONGODB_URI,
  FCM_SERVICE_ACCOUNT,   // Hela JSON som sträng
  FCM_SENDER_ID,         // Din Firebase Sender ID (t.ex. 9966393092)
  APN_KEY_PATH,
  APN_KEY_ID,
  APN_TEAM_ID,
  APN_TOPIC
} = process.env;

// Kontrollera nödvändiga miljövariabler
if (!APP_ID || !MASTER_KEY || !SERVER_URL || !MONGODB_URI) {
  console.error("❌ En eller flera viktiga miljövariabler saknas (APP_ID, MASTER_KEY, SERVER_URL, MONGODB_URI).");
  process.exit(1);
}

if (!APN_KEY_PATH || !fs.existsSync(APN_KEY_PATH)) {
  console.error('❌ APNs-certifikat saknas eller sökvägen är felaktig:', APN_KEY_PATH);
  process.exit(1);
}

if (!FCM_SERVICE_ACCOUNT) {
  console.error('❌ Miljövariabeln FCM_SERVICE_ACCOUNT saknas!');
  process.exit(1);
}

if (!FCM_SENDER_ID) {
  console.error('❌ Miljövariabeln FCM_SENDER_ID saknas!');
  process.exit(1);
}

// Skriv ut FCM-service account JSON till temporär fil
const fcmKeyPath = path.join(__dirname, 'temp-fcm-service-account.json');
fs.writeFileSync(fcmKeyPath, FCM_SERVICE_ACCOUNT);

// Läs in JSON-objektet från miljövariabeln
let fcmServiceAccountJson;
try {
  fcmServiceAccountJson = JSON.parse(FCM_SERVICE_ACCOUNT);
  console.log("✅ FCM_SERVICE_ACCOUNT JSON parsed OK");
} catch (err) {
  console.error("❌ Fel vid parse av FCM_SERVICE_ACCOUNT JSON:", err);
  process.exit(1);
}

// Kontrollera att filen är läsbar och logga en del av innehållet
try {
  const content = fs.readFileSync(fcmKeyPath, 'utf-8');
  console.log("✅ FCM service account fil sparad på:", fcmKeyPath);
  console.log("✅ FCM service account filinnehåll (första 200 tecken):", content.substring(0, 200));
} catch (err) {
  console.error("❌ Kunde inte läsa FCM service account fil:", err);
  process.exit(1);
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Parse-Application-Id, X-Parse-Master-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

app.get(`${mountPath}/serverInfo`, (req, res) => {
  return res.json({
    parseServerVersion: ParseServer.version,
    features: {
      globalConfig: true,
      hooks: true,
      logs: true,
      push: true,
      schemas: true,
      cloudCode: true,
      logsViewer: true
    }
  });
});

app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (_, res) => {
  res.status(200).send('✅ Parse Server uppe och kör!');
});

async function startServer() {

  const pushConfig = {
    android: {
      serviceAccount: fcmServiceAccountJson,
      senderId: FCM_SENDER_ID
    },
    ios: [
      {
        token: {
          key: fs.readFileSync(APN_KEY_PATH),
          keyId: APN_KEY_ID,
          teamId: APN_TEAM_ID,
        },
        topic: APN_TOPIC,
        production: true,
      }
    ]
  };

  console.log('🧩 Push-konfiguration:', pushConfig);

  const parseServer = new ParseServer({
    databaseURI: MONGODB_URI,
    cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, 'cloud/main.js'),
    appId: APP_ID,
    masterKey: MASTER_KEY,
    serverURL: SERVER_URL,
    publicServerURL: PUBLIC_SERVER_URL,

    push: pushConfig,

    masterKeyIps: ['0.0.0.0/0', '::/0'],
    allowClientClassCreation: true,
    liveQuery: {
      classNames: ['Posts', 'Comments']
    }
  });

  await parseServer.start();

  app.use(mountPath, parseServer.app);

  const httpServer = http.createServer(app);
  httpServer.listen(port, () => {
    console.log(`🚀 Servern körs på http://localhost:${port}${mountPath}`);
  });

  ParseServer.createLiveQueryServer(httpServer);
}

startServer().catch((err) => {
  console.error('❌ Fel vid serverstart:', err);
});
