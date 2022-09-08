const {
  BACKOFF_TIMER_MILLISECONDS,
  MAX_RETRY_COUNT,
  ACCOUNT_SID,
  AUTH_TOKEN,
  TASKROUTER_WORKSPACE_SID
} = process.env;

const axios = require('axios');
const { merge } = require("lodash");
const { sleep } = require('./utils');

const updateTaskAttributes = async (reservationSid, taskSid, attributesUpdate, retryCount) => {
  
  let currentRetry = retryCount ? retryCount : 0;

  console.log('Updating hold time task attribute for reservation', reservationSid);

  try {
    // courtesy https://github.com/twilio-professional-services/twilio-proserv-flex-project-template/blob/main/serverless-functions/src/functions/common/twilio-wrappers/taskrouter.private.js
    const taskContextURL = `https://taskrouter.twilio.com/v1/Workspaces/${TASKROUTER_WORKSPACE_SID}/Tasks/${taskSid}`;
    let config = {
        auth: {
            username: ACCOUNT_SID,
            password: AUTH_TOKEN
        }
    }
    
    // we need to fetch the task using a rest API because
    // we need to examine the headers to get the ETag
    const getResponse = await axios.get(taskContextURL, config);
    let task = getResponse.data;
    task.attributes = JSON.parse(getResponse.data.attributes);
    task.revision = JSON.parse(getResponse.headers.etag);
    
    // merge the objects
    let updatedTaskAttributes = merge({}, task.attributes, attributesUpdate);
    
    if (attributesUpdate === updatedTaskAttributes) {
      // same attributes, no need to update
      console.log('Hold time task attribute already correct for reservation, skipping update', reservationSid);
      return;
    }
    
    // if-match the revision number to ensure
    // no update collisions
    config.headers = {
        'If-Match': task.revision,
        'content-type': 'application/x-www-form-urlencoded'
    }
    
    data = new URLSearchParams({
        Attributes: JSON.stringify(updatedTaskAttributes)
    })
    
    task = (await axios.post(taskContextURL, data, config)).data;
    
  } catch (error) {
    console.error('Error updating hold time task attribute.', error);

    currentRetry += 1;

    if (currentRetry < MAX_RETRY_COUNT) {
      const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
      console.log(`Waiting for ${backoffTimer} milliseconds`);
      await sleep(backoffTimer);

      console.log('Retrying, retry attempt', currentRetry);
      await updateTaskAttributes(reservationSid, taskSid, attributesUpdate, currentRetry);
    } else {
      console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to update hold time task attribute.`);
      throw error;
    }
  }
}

module.exports = updateTaskAttributes;
