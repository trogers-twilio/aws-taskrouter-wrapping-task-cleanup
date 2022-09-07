const completeReservation = require('./completeReservation');
const setHoldTime = require('./setHoldTime');

const cleanupLongWrappingReservations = async (client, longWrappingReservations) => {
  try {
    for (const reservation of longWrappingReservations) {
      await setHoldTime(client, reservation.reservationSid, reservation.taskSid, reservation.timestamp);
      await completeReservation(client, reservation.reservationSid, reservation.workerSid);
    }
  } catch (error) {
    throw error;
  }
}

module.exports = cleanupLongWrappingReservations;
