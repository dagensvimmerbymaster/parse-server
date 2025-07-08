const express = require('express');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const cloudCodePath = path.resolve(__dirname, 'cloud/main.js');
console.log("🧠 Cloud code path:", cloudCodePath);

// Push config
const pushConfig = {
  ios: [{
    token: {
      key: fs.readFileSync(path.resolve(__dirname, 'certificates/AuthKey_AT4486F4YN.p8')),
      keyId: 'AT4486F4YN',
      teamId: '5S4Z656PBW'
    },
    topic: 'com.dagensvimmerbyab.DV',
    production: true,
    connectionTimeout: 30000,
    maxConnections: 1,
    keepAlive: true
  }]
};

// Init Parse Server
const api = new ParseServer({
  databaseURI: process.env.MONGODB_URI,
  cloud: cloudCodePath,
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  push: pushConfig,
  allowClientClassCreation: true,
  logLevel: 'debug',
  masterKeyIps: ['0.0.0.0/0', '::/0'],
});

// ✅ Viktigt: denna rad var korrekt tidigare
app.use(mountPath, api);

// Healthcheck
app.get(`${mountPath}/health`, (_, res) => res.status(200).send('OK'));

// Starta server
app.listen(port, () => {
  console.log(`🚀 Parse Server kör på http://localhost:${port}${mountPath}`);
});
