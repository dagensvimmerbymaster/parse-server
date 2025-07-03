
Parse.Cloud.beforeSave(Parse.Installation, (req) => {
  if (req.object.get('deviceType') === 'android') {
    req.object.set('pushType', 'fcm');
  }
});
