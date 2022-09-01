const {
  BACKOFF_TIMER_MILLISECONDS,
  MAX_RETRY_COUNT,
  TASKROUTER_WORKSPACE_SID
} = process.env;

const { sleep } = require('./utils');

const getTaskRouterTasks = async (client, assignmentStatus, retryCount) => {
  const tasksTimerLabelBase = 'Tasks retrieval duration';
  
  let currentRetry = retryCount ? retryCount : 0;

  const tasksTimerLabel = `${tasksTimerLabelBase}, retry ${currentRetry}`;
  console.time(tasksTimerLabel);

  console.log(`Retrieving ${assignmentStatus} tasks`);

  try {
    const tasks = await client.taskrouter
      .workspaces(TASKROUTER_WORKSPACE_SID)
      .tasks
      .list({
        pageSize: 1000,
        assignmentStatus
      });
    
    return tasks;
  } catch (error) {
    console.error('Error retrieving tasks.', error);

    currentRetry += 1;

    if (currentRetry <= MAX_RETRY_COUNT) {
      const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
      console.log(`Waiting for ${backoffTimer} milliseconds`);
      await sleep(backoffTimer);

      console.log('Retrying, retry attempt', currentRetry);
      const tasks = await getTaskRouterTasks(client, assignmentStatus, currentRetry);
      return tasks;
    } else {
      console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to retrieve tasks.`);
      throw error;
    }
  } finally {
    console.timeEnd(tasksTimerLabel);
  }
};

module.exports = getTaskRouterTasks;
