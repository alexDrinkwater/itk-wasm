import createWebWorkerPromise from '../core/createWebWorkerPromise.js'

import Image from '../core/Image.js'

import config from '../itkConfig.js'
import PipelineInput from '../pipeline/PipelineInput.js'
import PipelineOutput from '../pipeline/PipelineOutput.js'
import InterfaceTypes from '../core/InterfaceTypes.js'
import getTransferable from '../core/getTransferable.js'
import castImage from '../core/castImage.js'

import WriteImageOptions from './WriteImageOptions.js'
import WriteArrayBufferResult from './WriteArrayBufferResult.js'

async function writeImageArrayBuffer (webWorker: Worker | null, image: Image, fileName: string, options?: WriteImageOptions | string, useCompressionBackwardsCompatibility?: boolean
): Promise<WriteArrayBufferResult> {
  if (typeof image === 'boolean') {
    throw new Error('useCompression is now at the last argument position in itk-wasm')
  }

  let mimeType = ''
  if (typeof options === 'string') {
    mimeType = options
  }
  let useCompression = false
  if (typeof useCompressionBackwardsCompatibility === 'boolean') {
    useCompression = useCompressionBackwardsCompatibility
  }
  if (typeof options === 'object' && typeof options.useCompression !== 'undefined') {
    useCompression = options.useCompression
  }

  let worker = webWorker
  const { webworkerPromise, worker: usedWorker } = await createWebWorkerPromise(worker)
  worker = usedWorker

  const filePath = `./${fileName}`
  const args = ['0', filePath, '--memory-io', '--quiet']
  if (useCompression) {
    args.push('--use-compression')
  }
  const outputs = [
    { data: { path: filePath }, type: InterfaceTypes.BinaryFile }
  ] as PipelineOutput[]
  let inputImage = image
  if (typeof options === 'object' && (typeof options.componentType !== 'undefined' || typeof options.pixelType !== 'undefined')) {
    inputImage = castImage(image, options)
  }
  const inputs = [
    { type: InterfaceTypes.Image, data: inputImage }
  ] as PipelineInput[]

  const transferables: ArrayBuffer[] = []
  let transferable = getTransferable(image.data)
  if (transferable != null) {
    transferables.push(transferable)
  }
  transferable = getTransferable(image.direction)
  if (transferable != null) {
    transferables.push(transferable)
  }

  interface RunWriteImagePipelineResult {
    stdout: string
    stderr: string
    outputs: any[]
  }
  const result: RunWriteImagePipelineResult = await webworkerPromise.postMessage(
    {
      operation: 'writeImage',
      config: config,
      mimeType,
      fileName,
      pipelinePath: 'WriteImage', // placeholder
      args,
      outputs,
      inputs
    },
    transferables
  )
  return { arrayBuffer: result.outputs[0].data.data.buffer as ArrayBuffer, webWorker: worker }
}

export default writeImageArrayBuffer
