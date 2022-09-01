const {
  BACKOFF_TIMER_MILLISECONDS,
  MAX_RETRY_COUNT,
  TASKROUTER_WORKSPACE_SID
} = process.env;

const { sleep } = require('./utils');

const getTaskRouterEvents = async (client, eventType, startDate, endDate, retryCount) => {
  const eventsTimerLabelBase = 'Events retrieval duration';
  
  let currentRetry = retryCount ? retryCount : 0;

  const eventsTimerLabel = `${eventsTimerLabelBase}, retry ${currentRetry}`;
  console.time(eventsTimerLabel);

  console.log(`Retrieving ${eventType} events between ${startDate} and ${endDate ? endDate : 'now'}`);

  try {
    const events = await client.taskrouter
      .workspaces(TASKROUTER_WORKSPACE_SID)
      .events
      .list({
        pageSize: 1000,
        eventType,
        startDate,
        endDate
      });
    
    return events;
  } catch (error) {
    console.error('Error retrieving events.', error);

    currentRetry += 1;

    if (currentRetry <= MAX_RETRY_COUNT) {
      const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
      console.log(`Waiting for ${backoffTimer} milliseconds`);
      await sleep(backoffTimer);

      console.log('Retrying, retry attempt', currentRetry);
      const events = await getTaskRouterEvents(client, eventType, startDate, endDate, currentRetry);
      return events;
    } else {
      console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to retrieve events.`);
      throw error;
    }
  } finally {
    console.timeEnd(eventsTimerLabel);
  }
};

module.exports = getTaskRouterEvents;
