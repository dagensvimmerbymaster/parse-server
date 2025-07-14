const Parse = require('parse/node');

// Initiera Parse SDK med miljövariabler
Parse.initialize(process.env.APP_ID, process.env.JAVASCRIPT_KEY || '', process.env.MASTER_KEY);
Parse.serverURL = process.env.SERVER_URL;

console.log('🚀 PushWorker startar...');

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;
const JOB_POLL_INTERVAL = 5000;

async function processJobs() {
  try {
    const query = new Parse.Query('PushJobs');
    query.equalTo('status', 'pending');
    query.ascending('createdAt');
    const jobs = await query.find({ useMasterKey: true });
    if (jobs.length === 0) {
      // Inga jobb just nu
      return;
    }
    for (const job of jobs) {
      console.log(`⏳ Bearbetar push-jobb: ${job.id}`);
      try {
        await job.set('status', 'processing').save(null, { useMasterKey: true });
        const message = job.get('message');
        const title = job.get('title');
        const url = job.get('url');

        // Hämta alla iOS-installationer
        const instQuery = new Parse.Query('_Installation');
        instQuery.equalTo('deviceType', 'ios');
        instQuery.equalTo('pushType', 'apn');
        instQuery.exists('deviceToken');
        const allInstallations = await instQuery.find({ useMasterKey: true });
        console.log(`📦 Totalt ${allInstallations.length} enheter hittade.`);

        let successCount = 0;
        let failCount = 0;
        let failedTokens = [];

        // Skicka i batchar
        for (let i = 0; i < allInstallations.length; i += BATCH_SIZE) {
          const batch = allInstallations.slice(i, i + BATCH_SIZE);
          const tokenList = batch.map(inst => inst.get('deviceToken'));
          const batchQuery = new Parse.Query('_Installation');
          batchQuery.containedIn('deviceToken', tokenList);
          let retry = 0;
          let sent = false;
          while (!sent && retry < 3) {
            try {
              await Parse.Push.send({
                where: batchQuery,
                data: {
                  alert: message,
                  title: title || 'Meddelande',
                  badge: 'Increment',
                  sound: 'default',
                  url: url || null,
                },
              }, { useMasterKey: true });
              successCount += tokenList.length;
              sent = true;
              console.log(`✅ Push skickad till ${tokenList.length} enheter.`);
            } catch (err) {
              retry++;
              if (retry >= 3) {
                failCount += tokenList.length;
                failedTokens.push(...tokenList);
                console.error('❌ Push-fel (batch):', err && err.stack ? err.stack : err);
                console.error('❌ Misslyckade deviceTokens:', tokenList);
              } else {
                console.warn(`⚠️ Push-fel, försöker igen (${retry}/3)...`);
                await new Promise(res => setTimeout(res, 5000));
              }
            }
          }
          await new Promise(res => setTimeout(res, BATCH_DELAY_MS));
        }

        job.set('status', 'done');
        job.set('sent', successCount);
        job.set('failed', failCount);
        job.set('failedTokens', failedTokens);
        await job.save(null, { useMasterKey: true });
        console.log(`🏁 Push-jobb ${job.id} klart. Lyckade: ${successCount}, Misslyckade: ${failCount}`);
      } catch (err) {
        job.set('status', 'failed');
        job.set('error', err && err.stack ? err.stack : err);
        await job.save(null, { useMasterKey: true });
        console.error(`🔥 Fel i push-jobb ${job.id}:`, err);
      }
    }
  } catch (err) {
    console.error('🔥 Fel vid hämtning av push-jobb:', err);
  }
}

// Poll-loop
setInterval(processJobs, JOB_POLL_INTERVAL);
processJobs(); 