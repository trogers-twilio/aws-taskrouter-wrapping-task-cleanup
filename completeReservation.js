const {
  BACKOFF_TIMER_MILLISECONDS,
  MAX_RETRY_COUNT,
  TASKROUTER_WORKSPACE_SID
} = process.env;

const { sleep } = require('./utils');

const completeReservation = async (client, reservationSid, workerSid, retryCount) => {
  let currentRetry = retryCount ? retryCount : 0;

  console.log('Completing reservation', reservationSid);

  try {
    await client.taskrouter
      .workspaces(TASKROUTER_WORKSPACE_SID)
      .workers(workerSid)
      .reservations(reservationSid)
      .update({
        reservationStatus: 'completed'
      });
  } catch (error) {
    console.error('Error completing reservation.', error);

    currentRetry += 1;

    if (currentRetry < MAX_RETRY_COUNT) {
      const backoffTimer = currentRetry * BACKOFF_TIMER_MILLISECONDS;
      console.log(`Waiting for ${backoffTimer} milliseconds`);
      await sleep(backoffTimer);

      console.log('Retrying, retry attempt', currentRetry);
      await completeReservation(client, reservationSid, workerSid, currentRetry);
    } else {
      console.log(`Max retry count (${MAX_RETRY_COUNT}) reached. Unable to complete reservation.`);
      throw error;
    }
  }
}

module.exports = completeReservation;
