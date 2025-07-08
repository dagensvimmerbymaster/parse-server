const express = require('express');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

// 🧾 Push-config (enbart iOS för nu)
const pushConfig = {
  ios: [{
    token: {
      key: fs.readFileSync(path.resolve(__dirname, './certificates/AuthKey_AT4486F4YN.p8')),
      keyId: 'AT4486F4YN',
      teamId: '5S4Z656PBW'
    },
    topic: 'com.dagensvimmerbyab.DV',
    production: true,
    connectionTimeout: 30000, // Extra skydd mot write timeout
    maxConnections: 1,
    keepAlive: true
  }]
};

// ✅ Initiera Parse Server
const api = new ParseServer({
  databaseURI: process.env.MONGODB_URI,
  cloud: path.resolve(__dirname, './cloud/main.js'),
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  push: pushConfig,
  allowClientClassCreation: true,
  logLevel: 'info',
  verbose: true,
  // 👇 Rekommenderat i Parse 6+ för säker access
  masterKeyIps: ['0.0.0.0/0', '::/0'],
});

// 🔌 Middleware
app.use(mountPath, api.app);

// 🔁 Health check
app.get(`${mountPath}/health`, (_, res) => {
  res.status(200).send('OK');
});

// 🚀 Starta servern
app.listen(port, () => {
  console.log(`🚀 Parse Server kör på http://localhost:${port}${mountPath}`);
});
