const moment = require('moment');

const getTaskRouterEvents = require('./getTaskRouterEvents');

const {
  EVENTS_DEFAULT_LOOKBACK_MINUTES,
  EVENTS_LOOKBACK_MAX_WRAPPING_MULTIPLE,
  MAX_RESERVATION_WRAPPING_SECONDS,
} = process.env;

const findLongWrappingReservations = async (client, lastRunTimeMs, currentMoment) => {
  try {
    const longWrappingReservations = [];

    const minutesToSubtract = lastRunTimeMs
      ? MAX_RESERVATION_WRAPPING_SECONDS * EVENTS_LOOKBACK_MAX_WRAPPING_MULTIPLE / 60
      : EVENTS_DEFAULT_LOOKBACK_MINUTES;

    console.log('minutesToSubtract:', minutesToSubtract);

    const startingMoment = lastRunTimeMs ? moment(lastRunTimeMs) : currentMoment.clone();

    const startDate = startingMoment.subtract(minutesToSubtract, 'minutes').format('YYYY-MM-DDTHH:mm:ssZ');
    const endDate = currentMoment.format('YYYY-MM-DDTHH:mm:ssZ');

    const reservationWrapupEvents = await getTaskRouterEvents(client, 'reservation.wrapup', startDate, endDate);
    const reservationCompletedEvents = await getTaskRouterEvents(client, 'reservation.completed', startDate, endDate);

    if (reservationWrapupEvents.length === 0) {
      console.log('No reservation wrapup events found. Nothing further to do.');
      return longWrappingReservations;
    } else {
      // console.log('Sample reservation wrapup event:', reservationWrapupEvents[0]);
    }

    const completedReservations = new Map();
    for (const event of reservationCompletedEvents) {
      completedReservations.set(event.resourceSid, { eventDateMs: event.eventDateMs });
    }

    for (const wrapupEvent of reservationWrapupEvents) {
      const matchingCompletedEvent = completedReservations.get(wrapupEvent.resourceSid);

      if (matchingCompletedEvent) continue;

      const wrappingTimeMs = Date.now() - wrapupEvent.eventDateMs;

      if (wrappingTimeMs > MAX_RESERVATION_WRAPPING_SECONDS * 1000) {
        const formattedWrappingTime = moment.utc(wrappingTimeMs).format('HH:mm:ss');
        console.log(`Reservation ${wrapupEvent.resourceSid} has been in wrapup for ${formattedWrappingTime} (HH:mm:ss)`);
        longWrappingReservations.push({
          wrapupTimestamp: wrapupEvent.eventDateMs,
          reservationSid: wrapupEvent.resourceSid,
          taskSid: wrapupEvent.eventData.task_sid,
          workerSid: wrapupEvent.eventData.worker_sid
        });
      }
    }

    return longWrappingReservations;
  } catch (error) {
    console.error('Error finding long wrapping reservations.', error);
    throw error;
  }
}

module.exports = findLongWrappingReservations;
