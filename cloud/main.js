const fs = require("fs");
const path = require("path");

// Enkel testfunktion
Parse.Cloud.define("hello", async () => {
  return "Hello world!";
});

// ✅ Uppdatera eller skapa en installation
Parse.Cloud.define("UpdateInstallation", async (request) => {
  const {
    installationId,
    GCMSenderId,
    deviceType,
    appName,
    appIdentifier,
    parseVersion,
    deviceToken,
    timeZone,
    localeIdentifier,
    appVersion
  } = request.params;

  if (!installationId || !deviceType) {
    throw new Error("installationId och deviceType krävs.");
  }

  const Installation = Parse.Object.extend("_Installation");
  const query = new Parse.Query(Installation);
  query.equalTo("installationId", installationId);

  let installation = await query.first({ useMasterKey: true });

  if (!installation) {
    installation = new Installation();
    installation.set("installationId", installationId);
  }

  if (GCMSenderId) installation.set("GCMSenderId", GCMSenderId);
  if (deviceType) installation.set("deviceType", deviceType);
  if (appName) installation.set("appName", appName);
  if (appIdentifier) installation.set("appIdentifier", appIdentifier);
  if (parseVersion) installation.set("parseVersion", parseVersion);
  if (deviceToken) installation.set("deviceToken", deviceToken);
  if (timeZone) installation.set("timeZone", timeZone);
  if (localeIdentifier) installation.set("localeIdentifier", localeIdentifier);
  if (appVersion) installation.set("appVersion", appVersion);

  // Viktigt: ändra pushType till fcm för Android
  if (deviceType === "android") {
    installation.set("pushType", "fcm");
  } else if (deviceType === "ios") {
    installation.set("pushType", "apn");
  }

  const channels = installation.get("channels") || [];
  if (!channels.includes("global")) {
    channels.push("global");
    installation.set("channels", channels);
  }

  await installation.save(null, { useMasterKey: true });
  return { success: true };
});

// ✅ Skicka push till ALLA installationer (utan batch)
Parse.Cloud.define("sendPushToAll", async (request) => {
  const { message, title, url } = request.params;

  if (!request.master) throw new Error("⛔ MasterKey krävs.");
  if (!message) throw new Error("⛔ 'message' krävs.");

  const query = new Parse.Query("_Installation");
  query.exists("deviceToken");
  query.exists("pushType");

  await Parse.Push.send({
    where: query,
    data: {
      alert: message,
      title: title || "Meddelande",
      badge: "Increment",
      sound: "default",
      url: url || null
    }
  }, { useMasterKey: true });

  return { success: true };
});

// 🔧 Direkt push-test till specifik enhet via APNs
Parse.Cloud.define("directApnPushTest", async (request) => {
  if (!request.master) throw new Error("⛔ MasterKey krävs.");

  const { deviceToken, alert } = request.params;
  if (!deviceToken || !alert) throw new Error("⛔ Både deviceToken och alert krävs.");

  const apn = require("@parse/node-apn");

  const keyPath = path.resolve(__dirname, "../certificates/AuthKey_AT4486F4YN.p8");
  const key = fs.readFileSync(keyPath);

  const options = {
    token: {
      key,
      keyId: "AT4486F4YN",
      teamId: "5S4Z656PBW"
    },
    production: true,
    connectionRetryLimit: 5,
    connectionTimeout: 30000
  };

  const apnProvider = new apn.Provider(options);

  const note = new apn.Notification();
  note.alert = alert;
  note.sound = "default";
  note.topic = "com.dagensvimmerbyab.DV";
  note.payload = { source: "manual test" };

  try {
    const result = await apnProvider.send(note, deviceToken);
    console.log("📨 Push-resultat:", result);
    return result;
  } catch (error) {
    console.error("❌ APN-testfel:", error);
    throw error;
  } finally {
    apnProvider.shutdown();
  }
});
