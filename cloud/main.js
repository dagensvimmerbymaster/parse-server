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

  const Installation = Parse.Object.extend("_Installation"); // ✅ Korrekt klass
  const query = new Parse.Query(Installation);
  query.equalTo("installationId", installationId);

  try {
    let installation = await query.first({ useMasterKey: true });

    if (!installation) {
      installation = new Installation(); // ✅ Korrekt skapande
    }

    installation.set("GCMSenderId", GCMSenderId);
    installation.set("installationId", installationId);
    installation.set("deviceType", deviceType);
    installation.set("appName", appName);
    installation.set("appIdentifier", appIdentifier);
    installation.set("parseVersion", parseVersion);
    installation.set("deviceToken", deviceToken);
    installation.set("pushType", "gcm");
    installation.set("timeZone", timeZone);
    installation.set("localeIdentifier", localeIdentifier);
    installation.set("appVersion", appVersion);

    await installation.save(null, { useMasterKey: true });
    return "Successfully updated installation table.";
  } catch (error) {
    throw new Error("Failed to update installation: " + error.message);
  }
});
