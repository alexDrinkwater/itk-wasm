import WorkerPoolFunction from './WorkerPoolFunction.js'
import WorkerPoolProgressCallback from './WorkerPoolProgressCallback.js'
import WorkerPoolRunTasksResult from './WorkerPoolRunTasksResult.js'

interface RunInfo {
  taskQueue: any[]
  results: any[]
  addingTasks: boolean
  postponed: boolean
  runningWorkers: number
  index: number
  completedTasks: number
  progressCallback: WorkerPoolProgressCallback | null
  canceled: boolean | null
  resolve?: (results: any) => void
  reject?: (error: any) => void
}

class WorkerPool {
  fcn: WorkerPoolFunction

  workerQueue: Array<Worker | null>

  runInfo: RunInfo[]

  /* poolSize is the maximum number of web workers to create in the pool.
   *
   * The function, fcn, should accept null or an existing worker as its first argument.
   * It most also return and object with the used worker on the `webWorker`
   * property.  * Example: runPipelineBrowser.
   *
   **/
  constructor (poolSize: number, fcn: WorkerPoolFunction) {
    this.fcn = fcn

    this.workerQueue = new Array(poolSize)
    this.workerQueue.fill(null)

    this.runInfo = []
  }

  /*
   * Run the tasks specified by the arguments in the taskArgsArray that will
   * be passed to the pool fcn.
   *
   * An optional progressCallback will be called with the number of complete
   * tasks and the total number of tasks as arguments every time a task has
   * completed.
   *
   * Returns an object containing a promise ('promise') to communicate results
   * as well as an id ('runId') which can be used to cancel any remaining pending
   * tasks before they complete.
   */
  public runTasks (taskArgsArray: any[], progressCallback: WorkerPoolProgressCallback | null = null): WorkerPoolRunTasksResult {
    const info: RunInfo = {
      taskQueue: [],
      results: [],
      addingTasks: false,
      postponed: false,
      runningWorkers: 0,
      index: 0,
      completedTasks: 0,
      progressCallback: progressCallback,
      canceled: false
    }
    this.runInfo.push(info)
    info.index = this.runInfo.length - 1
    return {
      promise: new Promise((resolve, reject) => {
        info.resolve = resolve
        info.reject = reject

        info.results = new Array(taskArgsArray.length)
        info.completedTasks = 0

        info.addingTasks = true
        taskArgsArray.forEach((taskArg, index) => {
          this.addTask(info.index, index, taskArg)
        })
        info.addingTasks = false
      }),
      runId: info.index
    }
  }

  public terminateWorkers (): void {
    for (let index = 0; index < this.workerQueue.length; index++) {
      const worker = this.workerQueue[index]
      if (worker != null) {
        worker.terminate()
      }
      this.workerQueue[index] = null
    }
  }

  public cancel (runId: number) {
    const info = this.runInfo[runId]
    if (info) {
      info.canceled = true
    }
  }

  private addTask (infoIndex: number, resultIndex: number, taskArgs: []) {
    const info = this.runInfo[infoIndex]

    if (info && info.canceled) {
      this.clearTask(info.index)
      ;(info.reject != null) && info.reject('Remaining tasks canceled')
      return
    }

    if (this.workerQueue.length > 0) {
      const worker = this.workerQueue.pop() as Worker | null
      info.runningWorkers++
      this.fcn(worker, ...taskArgs).then(({ webWorker, ...result }) => {
        this.workerQueue.push(webWorker)
        // Check if this task was canceled while it was getting done
        if (this.runInfo[infoIndex] !== null) {
          info.runningWorkers--
          info.results[resultIndex] = result
          info.completedTasks++
          if (info.progressCallback != null) {
            info.progressCallback(info.completedTasks, info.results.length)
          }

          if (info.taskQueue.length > 0) {
            const reTask = info.taskQueue.shift() as any[]
            this.addTask(infoIndex, reTask[0], reTask[1])
          } else if (!info.addingTasks && !info.runningWorkers) {
            const results = info.results
            this.clearTask(info.index)
            ;(info.resolve != null) && info.resolve(results)
          }
        }
      }).catch((error) => {
        this.clearTask(info.index)
        ;(info.reject != null) && info.reject(error)
      })
    } else {
      if (info.runningWorkers || info.postponed) {
        // At least one worker is working on these tasks, and it will pick up
        // the next item in the taskQueue when done.
        info.taskQueue.push([resultIndex, taskArgs])
      } else {
        // Try again later.
        info.postponed = true
        setTimeout(() => {
          info.postponed = false
          this.addTask(info.index, resultIndex, taskArgs)
        }, 50)
      }
    }
  }

  private clearTask (clearIndex: number) {
    this.runInfo[clearIndex].results = []
    this.runInfo[clearIndex].taskQueue = []
    this.runInfo[clearIndex].progressCallback = null
    this.runInfo[clearIndex].canceled = null
  }
}

export default WorkerPool
