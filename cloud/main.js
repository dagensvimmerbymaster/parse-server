// Modern Cloud Code for Parse Server v6+

Parse.Cloud.define("hello", async (request) => {
  return "Hello world!";
});

// ✅ Uppdaterar eller skapar en installation
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

    await installation.save(null, { useMasterKey: true });

    console.log("✅ Installation uppdaterad:", installation.id);
    return { success: true };
  } catch (error) {
    console.error("❌ UpdateInstallation error:", error);
    throw new Error("Kunde inte spara installation: " + error.message);
  }
});

// ✅ Hämta installationsdata (max 100 rader)
Parse.Cloud.define("listInstallations", async (request) => {
  if (!request.master) {
    throw new Error("Unauthorized: MasterKey krävs.");
  }

  const query = new Parse.Query("_Installation");
  query.limit(100);
  query.descending("createdAt");
  return await query.find({ useMasterKey: true });
});

// ✅ Flagga installationer utan deviceToken/pushType
Parse.Cloud.define("flagInvalidInstallations", async (request) => {
  if (!request.master) {
    throw new Error("⛔ MasterKey krävs.");
  }

  const Installation = Parse.Object.extend("_Installation");
  const query = new Parse.Query(Installation);
  query.limit(1000);
  query.doesNotExist("deviceToken");
  query.doesNotExist("pushType");

  const results = await query.find({ useMasterKey: true });
  console.log(`🔍 Hittade ${results.length} installationer utan deviceToken eller pushType.`);

  let updated = 0;

  for (const install of results) {
    if (!install.get("invalid")) {
      install.set("invalid", true);
      await install.save(null, { useMasterKey: true });
      updated++;
    }
  }

  return {
    message: `✅ Markerade ${updated} installationer som 'invalid'.`,
    totalFound: results.length
  };
});

// ✅ Analysfunktion för _Installation-tabellen
Parse.Cloud.define("analyzeInstallations", async (request) => {
  if (!request.master) {
    throw new Error("⛔ MasterKey krävs.");
  }

  const Installation = Parse.Object.extend("_Installation");

  const countQuery = async (query) => await query.count({ useMasterKey: true });

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

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

  console.log("📊 Installation-analysresultat:", results);
  return results;
});
