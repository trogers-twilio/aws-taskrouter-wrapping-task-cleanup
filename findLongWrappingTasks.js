const moment = require('moment');

const getTaskRouterTasks = require('./getTaskRouterTasks');

const {
  MAX_RESERVATION_WRAPPING_SECONDS,
} = process.env;

const findLongWrappingTasks = async (client) => {
  try {
    const longWrappingTasks = [];

    const wrappingTasks = await getTaskRouterTasks(client, 'wrapping');

    if (wrappingTasks.length === 0) {
      console.log('No wrapping tasks found. Nothing further to do.');
      return longWrappingTasks;
    }

    for (const task of wrappingTasks) {
      const dateUpdatedMs = moment(task.dateUpdated).valueOf();

      const wrappingTimeMs = Date.now() - dateUpdatedMs;

      if (wrappingTimeMs > MAX_RESERVATION_WRAPPING_SECONDS * 1000) {
        const formattedWrappingTime = moment.utc(wrappingTimeMs).format('HH:mm:ss');
        console.log(`Task ${task.sid} has been in wrapup for ${formattedWrappingTime} (HH:mm:ss)`);
        longWrappingTasks.push({
          taskSid: task.sid,
        });
      }
    }

    return longWrappingTasks;
  } catch (error) {
    console.error('Error finding long wrapping tasks.', error);
    throw error;
  }
}

module.exports = findLongWrappingTasks;
