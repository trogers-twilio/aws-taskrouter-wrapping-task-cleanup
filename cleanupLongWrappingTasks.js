const completeTask = require('./completeTask');

const cleanupLongWrappingTasks = async (client, longWrappingTasks) => {
  try {
    for (const task of longWrappingTasks) {
      await completeTask(client, task.taskSid);
    }
  } catch (error) {
    throw error;
  }
}

module.exports = cleanupLongWrappingTasks;
