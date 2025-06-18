// Modern Cloud Code for Parse Server v6+

Parse.Cloud.define("hello", async (request) => {
  return "Hello world!";
});

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

    // Sätt endast värden om de är definierade
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

// ✅ Ny funktion för att hämta installationsdata (max 100 rader)
Parse.Cloud.define("listInstallations", async (request) => {
  if (!request.master) {
    throw new Error("Unauthorized: MasterKey krävs.");
  }

  const query = new Parse.Query("_Installation");
  query.limit(100);
  query.descending("createdAt"); // Valfritt: sortera senaste först
  return await query.find({ useMasterKey: true });
});