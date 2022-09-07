const {
  BACKOFF_TIMER_MILLISECONDS,
  MAX_RETRY_COUNT,
  ACCOUNT_SID,
  API_KEY,
  API_SECRET,
  TASKROUTER_WORKSPACE_SID,
  SYNC_SERVICE_SID
} = process.env;

const { SyncClient } = require('twilio-sync');
const Twilio = require('twilio');
const { sleep } = require('./utils');

const setHoldTime = async (client, reservationSid, taskSid, timestamp, retryCount) => {
  let currentRetry = retryCount ? retryCount : 0;

  console.log('Checking hold time for reservation', reservationSid);

  try {
    // Check for hold time sync doc for this reservation
    // First, generate an access token for Sync
    const AccessToken = Twilio.jwt.AccessToken;
    const SyncGrant = AccessToken.SyncGrant;
    
    const token = new AccessToken(
      ACCOUNT_SID,
      API_KEY,
      API_SECRET
    );
    
    token.identity = 'TaskWrapService';
    
    const syncGrant = new SyncGrant({
      serviceSid: SYNC_SERVICE_SID || 'default'
    });
    
    token.addGrant(syncGrant);
    const tokenStr = token.toJwt();
    
    const syncClient = new SyncClient(tokenStr);
    const docName = `${reservationSid}_HoldTime`;
    let holdTime = 0;
    
    try {
      // Attempt to open the Sync doc
      let doc = await syncClient.document({ id: docName, mode: 'open_existing' });
      let { data } = doc;
      
      if (!data.holdTime) {
        // no holds
        holdTime = 0;
      } else {
        holdTime = data.holdTime;
      }
      
      if (!isNaN(data.currentHoldStart) && data.currentHoldStart > 0) {
        // hold in progress, add to existing hold time
        const currentHoldDuration = (timestamp - data.currentHoldStart) / 1000;
        
        if (currentHoldDuration > 0) {
          holdTime = holdTime + currentHoldDuration;
          console.log(`Adding ${currentHoldDuration} seconds of outstanding hold time found for reservation`, reservationSid);
        }
      }
      
    } catch (error) {
      if (error.status === 404) {
        // doc didn't exist
        console.log(`No hold time doc found for reservation`, reservationSid);
      } else {
        console.error(`Error getting hold time doc for reservation ${reservationSid}`, error);
      }
    }
    
    // get attributes for the task, update if hold time differs
    console.log('Checking conversations.hold_time task attribute for reservation', reservationSid);
    const task = await client.taskrouter
      .workspaces(TASKROUTER_WORKSPACE_SID)
      .tasks(taskSid)
      .fetch();
    
    let { attributes: attributesStr } = task;
    let attributes = {};
    
    if (attributesStr) {
      attributes = JSON.parse(attributesStr);
    }
    
    if (!attributes.conversations || isNaN(attributes.conversations.hold_time) || attributes.conversations.hold_time !== holdTime) {
      console.log(`Updating conversations.hold_time task attribute to ${holdTime} seconds on task ${taskSid} from reservation`, reservationSid);
      
      attributes = {
        ...attributes,
        conversations: {
          ...attributes.conversations,
          hold_time: holdTime
        }
      };
      
      await client.taskrouter
        .workspaces(TASKROUTER_WORKSPACE_SID)
        .tasks(taskSid)
        .update({
          attributes: JSON.stringify(attributes)
        });
      
      console.log(`Completed updating conversations.hold_time task attribute from reservation`, reservationSid);
    } else {
      console.log('Task attribute conversations.hold_time already correct for reservation', reservationSid);
    }
    
  } catch (error) {
    console.error('Error updating hold time.', error);

    currentRetry += 1;

    if (currentRetry < MAX_RETRY_COUNT) {
      const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
      console.log(`Waiting for ${backoffTimer} milliseconds`);
      await sleep(backoffTimer);

      console.log('Retrying, retry attempt', currentRetry);
      await setHoldTime(client, reservationSid, taskSid, timestamp, currentRetry);
    } else {
      console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to update hold time.`);
      throw error;
    }
  }
}

module.exports = setHoldTime;
