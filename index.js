const express = require('express');
const { ParseServer } = require('parse-server');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();

const port = process.env.PORT || 1337;
const mountPath = process.env.PARSE_MOUNT || '/parse';

const push = {
  ios: [
    {
      token: {
        key: fs.readFileSync(path.resolve(__dirname, './certificates/AuthKey_AT4486F4YN.p8')),
        keyId: 'AT4486F4YN',
        teamId: '5S4Z656PBW'
      },
      topic: 'com.dagensvimmerbyab.DV',
      production: true,
      connectionTimeout: 30000,
      maxConnections: 1,
      keepAlive: true
    }
  ]
};

const parseServer = new ParseServer({
  databaseURI: process.env.MONGODB_URI,
  cloud: path.resolve(__dirname, './cloud/main.js'),
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.PUBLIC_SERVER_URL,
  push: push,
  allowClientClassCreation: true,
  logLevel: 'info',
  masterKeyIps: ['0.0.0.0/0', '::/0'],
  liveQuery: {
    classNames: ['Posts', 'Comments'],
  }
});

app.use(mountPath, parseServer.app);

app.get('/', (req, res) => {
  res.status(200).send('🚀 Parse Server kör och svarar.');
});

app.get(`${mountPath}/health`, (_, res) => {
  res.status(200).send('OK');
});

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 Parse Server kör på http://localhost:${port}${mountPath}`);
});

ParseServer.createLiveQueryServer(httpServer);
