class LastRunTimeHandler {
  _lastRunTimeMs = undefined;

  getLastRunTimeMs = () => {
    return this._lastRunTimeMs;
  }

  setLastRunTimeMs = (lastRunTime) => {
    this._lastRunTimeMs = lastRunTime;
  }
}

module.exports = new LastRunTimeHandler();
