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

    installation.set("GCMSenderId", GCMSenderId);
    installation.set("deviceType", deviceType);
    installation.set("appName", appName);
    installation.set("appIdentifier", appIdentifier);
    installation.set("parseVersion", parseVersion);
    installation.set("deviceToken", deviceToken);
    installation.set("timeZone", timeZone);
    installation.set("localeIdentifier", localeIdentifier);
    installation.set("appVersion", appVersion);

    await installation.save(null, { useMasterKey: true });

    console.log("✅ Installation uppdaterad:", installation.id);
    return { success: true };
  } catch (error) {
    console.error("❌ UpdateInstallation error:", error);
    throw new Error("Kunde inte spara installation: " + error.message);
  }
});
