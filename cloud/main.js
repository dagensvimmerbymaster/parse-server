// Modern Cloud Code for Parse Server v6+

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

  try {
    let installation = await query.first({ useMasterKey: true });

    if (!installation) {
      installation = new Installation();
      installation.set("installationId", installationId);
    }

    if (GCMSenderId !== undefined) installation.set("GCMSenderId", GCMSenderId);
    if (deviceType !== undefined) installation.set("deviceType", deviceType);
    if (appName !== undefined) installation.set("appName", appName);
    if (appIdentifier !== undefined) installation.set("appIdentifier", appIdentifier);
    if (parseVersion !== undefined) installation.set("parseVersion", parseVersion);
    if (deviceToken !== undefined) installation.set("deviceToken", deviceToken);
    if (timeZone !== undefined) installation.set("timeZone", timeZone);
    if (localeIdentifier !== undefined) installation.set("localeIdentifier", localeIdentifier);
    if (appVersion !== undefined) installation.set("appVersion", appVersion);

    // ✅ Viktigt: sätt pushType beroende på enhet
    if (deviceType === "android") {
      installation.set("pushType", "gcm");
    } else if (deviceType === "ios") {
      installation.set("pushType", "apn");
    }

    await installation.save(null, { useMasterKey: true });

    console.log("✅ Installation uppdaterad:", installation.id);
    return { success: true };
  } catch (error) {
    console.error("❌ UpdateInstallation error:", error);
    throw new Error("Kunde inte spara installation: " + error.message);
  }
});

// ✅ Lista de senaste 100 installationerna
Parse.Cloud.define("listInstallations", async (request) => {
  if (!request.master) throw new Error("Unauthorized: MasterKey krävs.");

  const query = new Parse.Query("_Installation");
  query.limit(100);
  query.descending("createdAt");
  return await query.find({ useMasterKey: true });
});

// ✅ Flagga installationer utan deviceToken/pushType som invalid
Parse.Cloud.define("flagInvalidInstallations", async (request) => {
  if (!request.master) throw new Error("⛔ MasterKey krävs.");

  const Installation = Parse.Object.extend("_Installation");
  const query = new Parse.Query(Installation);
  query.limit(1000);
  query.doesNotExist("deviceToken");
  query.doesNotExist("pushType");

  const results = await query.find({ useMasterKey: true });
  console.log(`🔍 Hittade ${results.length} utan deviceToken/pushType.`);

  let updated = 0;
  for (const install of results) {
    if (!install.get("invalid")) {
      install.set("invalid", true);
      await install.save(null, { useMasterKey: true });
      updated++;
    }
  }

  return {
    message: `✅ Markerade ${updated} som 'invalid'.`,
    totalFound: results.length
  };
});

// ✅ Analysfunktion av installationer
Parse.Cloud.define("analyzeInstallations", async (request) => {
  if (!request.master) throw new Error("⛔ MasterKey krävs.");

  const Installation = Parse.Object.extend("_Installation");
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const countQuery = async (query) => await query.count({ useMasterKey: true });

  const queries = {
    total: new Parse.Query(Installation),
    android: new Parse.Query(Installation).equalTo("deviceType", "android"),
    ios: new Parse.Query(Installation).equalTo("deviceType", "ios"),
    missingDeviceToken: new Parse.Query(Installation).doesNotExist("deviceToken"),
    oldInstallations: new Parse.Query(Installation).lessThan("updatedAt", oneYearAgo)
  };

  const results = {};
  for (const key in queries) {
    results[key] = await countQuery(queries[key]);
  }

  console.log("📊 Analysresultat:", results);
  return results;
});

// ✅ Fix: sätt pushType = 'apn' för iOS-installationer där det saknas
Parse.Cloud.define("fixIosPushType", async (request) => {
  if (!request.master) throw new Error("⛔ MasterKey krävs.");

  const Installation = Parse.Object.extend("_Installation");
  const query = new Parse.Query(Installation);
  query.equalTo("deviceType", "ios");
  query.doesNotExist("pushType");
  query.limit(1000);

  const results = await query.find({ useMasterKey: true });
  console.log(`🔧 Hittade ${results.length} iOS-installationer utan pushType.`);

  let updated = 0;
  for (const install of results) {
    install.set("pushType", "apn");
    await install.save(null, { useMasterKey: true });
    updated++;
  }

  return {
    message: `✅ Uppdaterade ${updated} iOS-installationer med pushType = 'apn'.`,
    totalFound: results.length
  };
});
