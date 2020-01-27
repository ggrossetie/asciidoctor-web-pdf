const { EventEmitter } = require('events')

class Lock {
  constructor () {
    this._queueSize = 0
    this._locked = false
    this._ee = new EventEmitter()
  }

  async acquire () {
    this._queueSize += 1
    return new Promise(resolve => {
      // If nobody has the lock, take it and resolve immediately
      if (!this._locked) {
        // Safe because JS doesn't interrupt you on synchronous operations,
        // so no need for compare-and-swap or anything like that.
        this._locked = true
        return resolve(false)
      }

      // Otherwise, wait until somebody releases the lock and try again
      const tryAcquire = () => {
        if (!this._locked) {
          this._locked = true
          this._ee.removeListener('release', tryAcquire)
          // If there's more than one queued event, returns true
          return resolve(this._queueSize > 2)
        }
      }
      this._ee.on('release', tryAcquire)
    })
  }

  release () {
    // Release the lock immediately
    this._locked = false
    this._queueSize -= 1
    setImmediate(() => this._ee.emit('release'))
  }
}
module.exports = Lock
