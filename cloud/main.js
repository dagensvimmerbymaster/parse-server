// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
	//this is a comment just to deploy test
	//just another comment to deploy
	response.success("Hello world!");
});

Parse.Cloud.define("UpdateInstallation", function(request, response) {
	// Set up to modify user data
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.Installation);
    query.equalTo("installationId", request.params.installationId);
    query.first({
        success: function(installation) {
            if  (installation) {
                // The object was found, update it.
                installation.set("GCMSenderId", request.params.GCMSenderId);
                installation.set("installationId", request.params.installationId);
                installation.set("deviceType", request.params.deviceType);
                installation.set("appName", request.params.appName);
                installation.set("appIdentifier", request.params.appIdentifier);
                installation.set("parseVersion", request.params.parseVersion);
                installation.set("deviceToken", request.params.deviceToken);
                installation.set("pushType", request.params.pushType);
                installation.set("timeZone", request.params.timeZone);
                installation.set("localeIdentifier", request.params.localeIdentifier);
                installation.set("appVersion", request.params.appVersion);

                installation.save(null, {
                    success: function(installation) {
                        response.success('Successfully updated installation table.');
                    }, error: function(installation, error) {
                        response.error("Could not save changes to installation.");
                    }
                });
            } else {
                createNewInstallation(request, { 
                    success: function(installation) {
                        response.success('Successfully updated installation table.');
                    }, error: function(installation, error) {
                        response.error("Could not save changes to installation.");
                    }
                });
            }
        }, error: function(error) {
            response.error('query error');
        }
    });
});

var createNewInstallation = function(request, response) {
    Parse.Cloud.useMasterKey();
    var installation = new Parse.Installation();
    installation.set("GCMSenderId", request.params.GCMSenderId);
    installation.set("installationId", request.params.installationId);
    installation.set("deviceType", request.params.deviceType);
    installation.set("appName", request.params.appName);
    installation.set("appIdentifier", request.params.appIdentifier);
    installation.set("parseVersion", request.params.parseVersion);
    installation.set("deviceToken", request.params.deviceToken);
    installation.set("pushType", request.params.pushType);
    installation.set("timeZone", request.params.timeZone);
    installation.set("localeIdentifier", request.params.localeIdentifier);
    installation.set("appVersion", request.params.appVersion);
	
    installation.save(null, {
        success: function(installation) {
            response.success(installation);
        }, error: function(installation, error) {
            response.error(installation, error);
        }
    });
}
