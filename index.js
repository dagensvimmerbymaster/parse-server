// index.js – Uppgraderad för Parse Server v6.4.0 med dynamisk push config

const express = require('express');
const http = require('http');
const { ParseServer } = require('parse-server');
const path = require('path');

// Hämta databas-URL från miljövariabler
const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
  console.log('⚠️ DATABASE_URI not specified, falling back to localhost.');
}

// Push key path för ev. iOS
const pushKeyPath = path.resolve(__dirname, './certificate/AuthKey-<keyID>.p8');
console.log('Push key path:', pushKeyPath);

// Push-konfiguration för Android (enligt appId)
const androidPushConfigs = {
  'id-FAoIJ78ValGFwYdBWfxch7Fm': {
    senderId: '9966393092',
    apiKey: 'AAAAAlILFwQ:APA91bFc35odIRUsaAFv58wDbO_3ram_yFk92npV9HfD3T-eT7rRXMsrq8601-Y6b4RPA44KcgQe8ANGoSucIImdIs0ZlLBYPyQzVBD3s5q8C9Wj5T-Fnk684Kl1I_iWxTJyrWoim8sr'
  },
  'id-dagenshultsfred': {
    senderId: '725739666496',
    apiKey: 'AAAAqPl0fEA:APA91bHp38ZbLlJSDBdv6t1_J_gXjpnMeaBOFPXu2sAG8qXoGIyXjf_NYafkhRiAvw7tqsIQmHm8BWxh7yM6X6O3ZjkoWWrfDp7TQ6X9_73edu9Ym-ENo1yPGmhbaSyeMJyMqQeimCGz'
  },
  'id-dagenskalmar': {
    senderId: '400358993081',
    apiKey: 'AAAAXTdBbLk:APA91bHU1sIB-7N_oC0fFhBd35eeGnzAiYIWD976qUJC3DMOy1iIgOHq-b-Wf49hSyFyr4wsspVrzQJv5lfibhsemza7uIBUti4k90W-UvWgOo5QUPi1u9q_fhV2rGL5Fb9ot6Vyfwnz'
  },
  'id-dagensvastervik': {
    senderId: '259065804121',
    apiKey: 'AAAAPFGGdVk:APA91bHAMUl0wuPGVHTk_Ynhsfb8hRYlclMgOnGWcXoiml5tfzKlJFS6_qhbfBOE8vuEft204ZWPj625I3wtW9LCxugaWs0cm710nUN88jJeXoph2cBJVPsiPcGmQ2NcEstHp7WRjnbW_d82395S-hUj0TKFnkOviQ'
  }
};

// App ID från miljö eller fallback
const appId = process.env.APP_ID || 'id-FAoIJ78ValGFwYdBWfxch7Fm';

// Push-config (endast Android just nu)
const pushConfig = androidPushConfigs[appId]
  ? { android: androidPushConfigs[appId] }
  : undefined;

// Skapa Parse Server-instansen
const parseServer = new ParseServer({
  databaseURI: databaseUri,
  cloud: process.env.CLOUD_CODE_MAIN || path.join(__dirname, '/cloud/main.js'),
  appId,
  masterKey: process.env.MASTER_KEY || 'key-<ParseMasterKey>',
  serverURL: `http://localhost:${port}${mountPath}`,
  publicServerURL: process.env.PUBLIC_SERVER_URL || 'http://<heroku-app>.herokuapp.com/parse',
  push: pushConfig,
  liveQuery: {
    classNames: ['Posts', 'Comments']
  }
});

// Initiera Express
const app = express();

// Servera statiskt innehåll
app.use('/public', express.static(path.join(__dirname, '/public')));

// Mounta Parse API korrekt
const mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, parseServer.app); // 💡 Rätt metod för ParseServer v6.x

// Test-rutter
app.get('/', (req, res) => {
  res.status(200).send('<AppName> parse-server deployed successfully');
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

// Starta servern
const port = process.env.PORT || 1337;
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`✅ Parse Server is running on port ${port}`);
});

// Aktivera Live Query-server
ParseServer.createLiveQueryServer(httpServer);
