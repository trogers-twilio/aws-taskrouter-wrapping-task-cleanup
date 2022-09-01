const {
  BACKOFF_TIMER_MILLISECONDS,
  MAX_RETRY_COUNT,
  TASKROUTER_WORKSPACE_SID
} = process.env;

const { sleep } = require('./utils');

const completeTask = async (client, taskSid, retryCount) => {
  let currentRetry = retryCount ? retryCount : 0;

  console.log('Completing task', taskSid);

  try {
    await client.taskrouter
      .workspaces(TASKROUTER_WORKSPACE_SID)
      .tasks(taskSid)
      .update({
        assignmentStatus: 'completed'
      });
  } catch (error) {
    console.error('Error completing task.', error);

    currentRetry += 1;

    if (currentRetry < MAX_RETRY_COUNT) {
      const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
      console.log(`Waiting for ${backoffTimer} milliseconds`);
      await sleep(backoffTimer);

      console.log('Retrying, retry attempt', currentRetry);
      await completeTask(client, taskSid, currentRetry);
    } else {
      console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to complete task.`);
      throw error;
    }
  }
}

module.exports = completeTask;
