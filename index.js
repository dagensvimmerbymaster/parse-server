// index.js – För Parse Server v6+ med push-adapter v3.4.1 override

console.log('✅ Using push-adapter version:', require('@parse/push-adapter/package.json').version);

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');
const PushAdapter = require('@parse/push-adapter').default;

console.log('📦 Loaded push-adapter version:', require('@parse/push-adapter/package.json').version);

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
  console.warn('⚠️ DATABASE_URI not specified, falling back to localhost.');
}

const appId = process.env.APP_ID || 'id-FAoIJ78ValGFwYdBWfxch7Fm';
const masterKey = process.env.MASTER_KEY || 'key-8uNA4ZslCgVoqFeuy5epBntj';

// 🔐 Använder .p8-nyckeln – om du vill byta till .pem, uppdatera filnamnet nedan
const pushKeyPath = path.resolve(__dirname, 'certificates/AuthKey_AT4486F4YN.p8');
console.log('🔐 Push key path:', pushKeyPath);

const androidPushConfigs = {
  'id-FAoIJ78ValGFwYdBWfxch7Fm': {
    senderId: '9966393092',
    apiKey: 'AAAAAlILFwQ:APA91bFc35odIRUsaAFv58wDbO_3ram_yFk92npV9HfD3T-eT7rRXMsrq8601-Y6b4RPA44KcgQe8ANGoSucIImdIs0ZlLBYPyQzVBD3s5q8C9Wj5T-Fnk684Kl1I_iWxTJyrWoim8sr'
  }
};

const pushAdapter = new PushAdapter({
  android: androidPushConfigs[appId],
  ios: [
    {
      token: {
        key: fs.readFileSync(pushKeyPath),
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW'
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: true
    }
  ]
});

const serverURL = 'https://dagensvimmerby.herokuapp.com/parse';
const publicServerURL = 'https://dagensvimmerby.herokuapp.com/parse';

const parseServer = new ParseServer({
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, '/cloud/main.js'),
  appId,
  masterKey,
  serverURL,
  publicServerURL,
  verifyUserEmails: false,
  verbose: true,
  healthCheckPath: '/parse/health',
  push: { adapter: pushAdapter },
  liveQuery: {
    classNames: ['Posts', 'Comments']
  },
  // ✅ Fix: explicit healthCheck så dashboard fungerar
  healthCheck: async () => {
    return { success: true };
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
