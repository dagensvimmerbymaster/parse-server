console.log('📦 main.js laddas...');

// Enkel testfunktion
Parse.Cloud.define("hello", async () => {
  return "Hello world!";
});

// ✅ beforeSave för _Installation – endast logg, inga ändringar
Parse.Cloud.beforeSave(Parse.Installation, async (req) => {
  try {
    console.log('📥 Incoming _Installation object:', JSON.stringify(req.object.toJSON(), null, 2));
    if (req.original) {
      console.log('📦 Original object:', JSON.stringify(req.original.toJSON(), null, 2));
    } else {
      console.log('🆕 Ny installation (ingen original finns)');
    }
  } catch (err) {
    console.error('❌ beforeSave error:', err);
    throw err;
  }
});

// ✅ Läs installation – ingen modifiering
Parse.Cloud.define("GetInstallation", async (request) => {
  try {
    const { installationId } = request.params;
    if (!installationId) throw new Error("⛔ installationId krävs.");

    const Installation = Parse.Object.extend("_Installation");
    const query = new Parse.Query(Installation);
    query.equalTo("installationId", installationId);

    const result = await query.first({ useMasterKey: true });
    if (!result) return { found: false };

    return {
      found: true,
      objectId: result.id,
      data: result.toJSON()
    };
  } catch (err) {
    console.error("❌ Fel i GetInstallation:", err);
    throw err;
  }
});

// ✅ Uppdatera eller skapa en installation
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
      throw new Error("installationId och deviceType krävs.");
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

    if (GCMSenderId) installation.set("GCMSenderId", GCMSenderId);
    if (deviceType) installation.set("deviceType", deviceType);
    if (appName) installation.set("appName", appName);
    if (appIdentifier) installation.set("appIdentifier", appIdentifier);
    if (parseVersion) installation.set("parseVersion", parseVersion);
    if (timeZone) installation.set("timeZone", timeZone);
    if (localeIdentifier) installation.set("localeIdentifier", localeIdentifier);
    if (appVersion) installation.set("appVersion", appVersion);

    if (deviceToken && (isNew || installation.get("deviceToken") !== deviceToken)) {
      installation.set("deviceToken", deviceToken);
    }

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

    // ✅ Lägg till korrekt ACL (public read/write)
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    installation.setACL(acl);

    await installation.save(null, { useMasterKey: true });
    return { success: true };

  } catch (err) {
    console.error("❌ Fel i UpdateInstallation:", err);
    throw err;
  }
});

// ✅ Skicka push till alla installationer i batchar
Parse.Cloud.define("sendPushToAll", async (request) => {
  try {
    if (!request.master) throw new Error("⛔ MasterKey krävs.");
    const { message, title, url } = request.params;
    if (!message) throw new Error("⛔ 'message' krävs.");

    const BATCH_SIZE = 50;

    const query = new Parse.Query("_Installation");
    query.equalTo("deviceType", "ios");
    query.equalTo("pushType", "apn");
    query.exists("deviceToken");

    const allInstallations = await query.find({ useMasterKey: true });
    console.log(`📦 Totalt ${allInstallations.length} enheter hittade.`);

    const batches = [];
    for (let i = 0; i < allInstallations.length; i += BATCH_SIZE) {
      batches.push(allInstallations.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let failCount = 0;

    for (const batch of batches) {
      const tokenList = batch.map(inst => inst.get("deviceToken"));
      const batchQuery = new Parse.Query("_Installation");
      batchQuery.containedIn("deviceToken", tokenList);

      try {
        await Parse.Push.send({
          where: batchQuery,
          data: {
            alert: message,
            title: title || "Meddelande",
            badge: "Increment",
            sound: "default",
            url: url || null,
          },
        }, { useMasterKey: true });

        successCount += tokenList.length;
        console.log(`✅ Push skickad till ${tokenList.length} enheter.`);
      } catch (err) {
        failCount += tokenList.length;
        console.error("❌ Push-fel:", err);
      }

      await new Promise(res => setTimeout(res, 500)); // throttling
    }

    return {
      success: true,
      sent: successCount,
      failed: failCount,
    };

  } catch (err) {
    console.error("🔥 Push-error:", err);
    throw err;
  }
});

// 🛠️ Global fångst av oväntade fel
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Ohanterat löfte-fel:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Ohanterat undantag:', err);
});
