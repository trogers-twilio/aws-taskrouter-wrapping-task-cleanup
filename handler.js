'use strict';

const moment = require('moment');
const Twilio = require('twilio');

const findLongWrappingReservations = require('./findLongWrappingReservations');
const cleanupLongWrappingReservations = require('./cleanupLongWrappingReservations');
const findLongWrappingTasks = require('./findLongWrappingTasks');
const cleanupLongWrappingTasks = require('./cleanupLongWrappingTasks');
const lastRunTimeHandler = require('./lastRunTimeHandler');

const {
  ACCOUNT_SID,
  AUTH_TOKEN,
  MONITOR_ONLY
} = process.env;

module.exports.run = async (event, context) => {
  const client = Twilio(ACCOUNT_SID, AUTH_TOKEN);

  const monitorOnly = MONITOR_ONLY && MONITOR_ONLY.toLowerCase() === 'true';

  const scriptTimerLabel = 'Script duration';
  console.time(scriptTimerLabel);
  try {  
    const lastRunTimeMs = lastRunTimeHandler.getLastRunTimeMs();
    console.log('lastRunTimeMs:', lastRunTimeMs);

    const currentMoment = moment();
    const longWrappingReservations = await findLongWrappingReservations(client, lastRunTimeMs, currentMoment);
  
    if (longWrappingReservations.length > 0) {
      const count = longWrappingReservations.length;
      console.log(`Found ${count} long wrapping reservation${count > 1 ? 's' : ''} to be cleaned up`);
      if (monitorOnly) {
        console.log('MONITOR_ONLY set to true. Not cleaning up long wrapping reservations.');
      } else {
        await cleanupLongWrappingReservations(client, longWrappingReservations);
      }
    } else {
      console.log('No long wrapping reservations found');
    }
  
    lastRunTimeHandler.setLastRunTimeMs(currentMoment.valueOf());

    const longWrappingTasks = await findLongWrappingTasks(client);

    if (longWrappingTasks.length > 0) {
      const count = longWrappingTasks.length;
      console.log(`Found ${count} long wrapping task${count > 1 ? 's' : ''} to be cleaned up`);
      if (monitorOnly) {
        console.log('MONITOR_ONLY set to true. Not cleaning up long wrapping tasks.');
      } else {
        await cleanupLongWrappingTasks(client, longWrappingTasks);
      }
    } else {
      console.log('No long wrapping tasks found');
    }
  } catch (error) {
    console.error('Error during this interval run.', error);
  } finally {
    console.timeEnd(scriptTimerLabel);
  }
};
