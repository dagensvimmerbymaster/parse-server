
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

// ✅ Skicka push till alla installationer
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
      url: url || null,
    },
  }, { useMasterKey: true });

  return { success: true };
});

