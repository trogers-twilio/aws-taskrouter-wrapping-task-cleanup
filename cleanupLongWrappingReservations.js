const completeReservation = require('./completeReservation');

const cleanupLongWrappingReservations = async (client, longWrappingReservations) => {
  try {
    for (const reservation of longWrappingReservations) {
      await completeReservation(client, reservation.reservationSid, reservation.workerSid);
    }
  } catch (error) {
    throw error;
  }
}

module.exports = cleanupLongWrappingReservations;
