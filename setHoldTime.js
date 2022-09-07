const {
  BACKOFF_TIMER_MILLISECONDS,
  MAX_RETRY_COUNT,
  TASKROUTER_WORKSPACE_SID,
  SYNC_SERVICE_SID
} = process.env;

const updateTaskAttributes = require('./updateTaskAttributes');
const { sleep } = require('./utils');

const setHoldTime = async (client, reservationSid, taskSid, wrapupTimestamp, retryCount) => {
  let currentRetry = retryCount ? retryCount : 0;

  console.log('Checking hold time for reservation', reservationSid);

  try {
    // Check for hold time sync doc for this reservation
    const docName = `${reservationSid}_HoldTime`;
    let holdTime = 0;
    
    try {
      // Attempt to open the Sync doc
      let doc = await client.sync.v1.services(SYNC_SERVICE_SID)
        .documents(docName)
        .fetch();
      let { data } = doc;
      
      if (!data.holdTime) {
        // no holds
        holdTime = 0;
      } else {
        holdTime = data.holdTime;
      }
      
      if (!isNaN(data.currentHoldStart) && data.currentHoldStart > 0) {
        // hold in progress, add to existing hold time
        const currentHoldDuration = (wrapupTimestamp - data.currentHoldStart) / 1000;
        
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
        
        currentRetry += 1;
        
        if (currentRetry < MAX_RETRY_COUNT) {
          const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
          console.log(`Waiting for ${backoffTimer} milliseconds`);
          await sleep(backoffTimer);
        
          console.log('Retrying, retry attempt', currentRetry);
          await setHoldTime(client, reservationSid, taskSid, wrapupTimestamp, currentRetry);
        } else {
          console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to get hold time.`);
          throw error;
        }
        
        return;
      }
    }
    
    // update task attribute accordingly
    const newAttributes = {
      conversations: {
        hold_time: holdTime
      }
    };
    await updateTaskAttributes(reservationSid, taskSid, newAttributes);
    
  } catch (error) {
    console.error('Error updating hold time.', error);

    currentRetry += 1;

    if (currentRetry < MAX_RETRY_COUNT) {
      const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
      console.log(`Waiting for ${backoffTimer} milliseconds`);
      await sleep(backoffTimer);

      console.log('Retrying, retry attempt', currentRetry);
      await setHoldTime(client, reservationSid, taskSid, wrapupTimestamp, currentRetry);
    } else {
      console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to update hold time.`);
      throw error;
    }
  }
}

module.exports = setHoldTime;
