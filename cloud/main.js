Parse.Cloud.define("UpdateInstallation", async (request) => {
  const params = request.params;
  console.log("📥 Incoming UpdateInstallation params:", JSON.stringify(params));

  const requiredFields = [
    "installationId",
    "deviceType",
    "appIdentifier",
    "deviceToken",
    "GCMSenderId"
  ];

  // Kontrollera obligatoriska fält
  for (const field of requiredFields) {
    if (!params[field]) {
      throw new Error(`Missing required parameter: ${field}`);
    }
  }

  const Installation = Parse.Object.extend("_Installation");
  const query = new Parse.Query(Installation);
  query.equalTo("installationId", params.installationId);

  try {
    let installation = await query.first({ useMasterKey: true });

    if (!installation) {
      installation = new Installation();
      installation.set("installationId", params.installationId);
      installation.set("deviceType", params.deviceType);
    }

    installation.set("GCMSenderId", params.GCMSenderId);
    installation.set("appName", params.appName || "Unknown");
    installation.set("appIdentifier", params.appIdentifier);
    installation.set("parseVersion", params.parseVersion || "unknown");
    installation.set("deviceToken", params.deviceToken);
    installation.set("pushType", "gcm");
    installation.set("timeZone", params.timeZone || "Europe/Stockholm");
    installation.set("localeIdentifier", params.localeIdentifier || "sv_SE");
    installation.set("appVersion", params.appVersion || "unknown");

    await installation.save(null, { useMasterKey: true });
    console.log("✅ Installation saved:", installation.id);
    return "Successfully updated installation table.";
  } catch (error) {
    console.error("❌ Failed to update installation:", error.message);
    throw new Error("Failed to update installation: " + error.message);
  }
});
