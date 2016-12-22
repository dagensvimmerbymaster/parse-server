// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}
var devCertPath = path.resolve(__dirname, './certificate/dagensvimmerby-dev-non.p12');
console.log(devCertPath);
var proCertPath = path.resolve(__dirname, './certificate/dagensvimmerby-pro-non.p12');
console.log(proCertPath);
var pushConfig = { 
    android: {
        senderId: '',
        apiKey: ''
    },
    ios: [
      {
        pfx: devCertPath, // P12 file only
        bundleId: '',
        production: false
      },
      {
        pfx: proCertPath, // P12 file only
        bundleId: '',
        production: true
      }
    ]
  };
var api = new ParseServer({
  databaseURI: databaseUri || '',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '',
  appId: process.env.APP_ID || '',
  masterKey: process.env.MASTER_KEY || '', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || '',  // Don't forget to change to https if needed
  push: pushConfig,
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey



var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('Dagens Vimmerby parse-server deployed successfully');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
