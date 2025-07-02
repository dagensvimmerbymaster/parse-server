console.log('✅ Initierar Parse Server med Firebase Cloud Messaging och APNs...');

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
  MONGODB_URI
} = process.env;

if (!APP_ID || !MASTER_KEY || !SERVER_URL || !MONGODB_URI) {
  console.error("❌ En eller flera viktiga miljövariabler saknas.");
  process.exit(1);
}

// ✅ APNs-certifikat för iOS
const pushKeyPath = path.join(__dirname, 'certificates', 'AuthKey_AT4486F4YN.p8');
if (!fs.existsSync(pushKeyPath)) {
  console.error('❌ APNs-certifikat saknas:', pushKeyPath);
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

    // ✅ NY KORREKT PUSH-KONFIGURATION
    push: {
      android: {
        apiKey: 'AAAAAlILFwQ:APA91bFc35odIRUsaAFv58wDbO_3ram_yFk92npV9HfD3T-eT7rRXMsrq8601-Y6b4RPA44KcgQe8ANGoSucIImdIs0ZlLBYPyQzVBD3s5q8C9Wj5T-Fnk684Kl1I_iWxTJyrWoim8sr'
      },
      ios: {
        token: {
          key: fs.readFileSync(pushKeyPath),
          keyId: 'AT4486F4YN',
          teamId: '5S4Z656PBW'
        },
        topic: 'com.dagensvimmerbyab.DV',
        production: true
      }
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
