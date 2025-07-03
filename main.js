// Enkel testfunktion
Parse.Cloud.define("hello", async () => {
  return "Hello world!";
});

// 🛠 Cloud Function för att skapa/uppdatera en installation
Parse.Cloud.define("UpdateInstallation", async (request) => {
  try {
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
      throw new Error("⛔ Både installationId och deviceType krävs.");
    }

    const Installation = Parse.Object.extend("_Installation");
    const query = new Parse.Query(Installation);
    query.equalTo("installationId", installationId);

    let installation = await query.first({ useMasterKey: true });

    const isNew = !installation;
    if (isNew) {
      installation = new Installation();
      installation.set("installationId", installationId);
    }

    // Sätt alla relevanta fält (endast om tillgängliga)
    if (GCMSenderId) installation.set("GCMSenderId", GCMSenderId);
    if (deviceType) installation.set("deviceType", deviceType);
    if (appName) installation.set("appName", appName);
    if (appIdentifier) installation.set("appIdentifier", appIdentifier);
    if (parseVersion) installation.set("parseVersion", parseVersion);
    if (timeZone) installation.set("timeZone", timeZone);
    if (localeIdentifier) installation.set("localeIdentifier", localeIdentifier);
    if (appVersion) installation.set("appVersion", appVersion);

    // Endast sätt deviceToken om det är nytt eller förändrat
    if (deviceToken && (isNew || installation.get("deviceToken") !== deviceToken)) {
      installation.set("deviceToken", deviceToken);
    }

    // PushType
    if (deviceType === "android") {
      installation.set("pushType", "fcm");
    } else if (deviceType === "ios") {
      installation.set("pushType", "apn");
    }

    // Lägg till 'global' channel
    const channels = installation.get("channels") || [];
    if (!channels.includes("global")) {
      channels.push("global");
      installation.set("channels", channels);
    }

    await installation.save(null, { useMasterKey: true });

    console.log("✅ Installation sparad:", installation.id);
    return { success: true, id: installation.id };

  } catch (err) {
    console.error("❌ Fel i UpdateInstallation:", err);
    throw err;
  }
});

// Global felhantering
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Ohanterat löfte-fel:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Ohanterat undantag:", err);
});
