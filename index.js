// index.js – För Parse Server v6+ med korrekt initiering

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
  console.warn('⚠️ DATABASE_URI not specified, falling back to localhost.');
}

const appId = process.env.APP_ID || 'id-FAoIJ78ValGFwYdBWfxch7Fm';

// 🔐 iOS push key path
const pushKeyPath = '/Users/elham/Documents/certificates/AuthKey_AT4486F4YN.p8 (kopia)';
console.log('🔐 Push key path:', pushKeyPath);

// 📦 Android push config
const androidPushConfigs = {
  'id-FAoIJ78ValGFwYdBWfxch7Fm': {
    senderId: '9966393092',
    apiKey: 'AAAAAlILFwQ:APA91bFc35odIRUsaAFv58wDbO_3ram_yFk92npV9HfD3T-eT7rRXMsrq8601-Y6b4RPA44KcgQe8ANGoSucIImdIs0ZlLBYPyQzVBD3s5q8C9Wj5T-Fnk684Kl1I_iWxTJyrWoim8sr'
  }
};

// ✅ Kombinerad push-konfiguration
const pushConfig = {
  android: androidPushConfigs[appId],
  ios: [
    {
      p8: fs.readFileSync(pushKeyPath),
      keyId: 'AT4486F4YN',
      teamId: '5S4Z656PBW',
      bundleId: 'com.dagensvimmerbyab.DH',
      production: true,
      type: 'p8'
    }
  ]
};

const herokuURL = 'https://dagensvimmerby.herokuapp.com' + mountPath;
const serverURL = process.env.SERVER_URL || herokuURL;
const publicServerURL = process.env.PUBLIC_SERVER_URL || herokuURL;

const parseServer = new ParseServer({
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, '/cloud/main.js'),
  appId,
  masterKey: process.env.MASTER_KEY,
  serverURL,
  publicServerURL,
  push: pushConfig,
  liveQuery: {
    classNames: ['Posts', 'Comments']
  }
});

app.use(mountPath, parseServer.app);
app.use('/public', express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.status(200).send('✅ Parse Server deployed successfully.');
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}${mountPath}`);
});

ParseServer.createLiveQueryServer(httpServer);
