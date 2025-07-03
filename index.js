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
  FCM_SENDER_ID,
  APN_KEY_PATH,
  APN_KEY_ID,
  APN_TEAM_ID,
  APN_TOPIC
} = process.env;

// Kontrollera att nödvändiga miljövariabler finns
if (!APP_ID || !MASTER_KEY || !SERVER_URL || !MONGODB_URI) {
  console.error("❌ En eller flera viktiga miljövariabler saknas (APP_ID, MASTER_KEY, SERVER_URL, MONGODB_URI).");
  process.exit(1);
}

// Kontrollera APNs-nyckelfil
if (!APN_KEY_PATH || !fs.existsSync(APN_KEY_PATH)) {
  console.error('❌ APNs-certifikat saknas eller sökvägen är felaktig:', APN_KEY_PATH);
  process.exit(1);
}

// Kontrollera FCM Sender ID
if (!FCM_SENDER_ID) {
  console.error('❌ Miljövariabeln FCM_SENDER_ID saknas!');
  process.exit(1);
}

// FCM service account JSON-fil (ligger i ./certificates/)
const FCM_SERVICE_ACCOUNT_PATH = path.join(__dirname, 'certificates', 'dagensvimmerby-android-69b66-d92c3490c40f.json');
if (!fs.existsSync(FCM_SERVICE_ACCOUNT_PATH)) {
  console.error('❌ FCM service account JSON saknas:', FCM_SERVICE_ACCOUNT_PATH);
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
  const parseServer = new ParseServer({
    databaseURI: MONGODB_URI,
    cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, 'cloud/main.js'),
    appId: APP_ID,
    masterKey: MASTER_KEY,
    serverURL: SERVER_URL,
    publicServerURL: PUBLIC_SERVER_URL,

    push: {
      android: {
        senderId: FCM_SENDER_ID,
        serviceAccount: require(FCM_SERVICE_ACCOUNT_PATH)
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
    },

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
