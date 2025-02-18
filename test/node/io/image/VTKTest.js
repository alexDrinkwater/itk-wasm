import test from 'ava'
import path from 'path'

import { IntTypes, PixelTypes, getMatrixElement, readImageLocalFile, writeImageLocalFile } from '../../../../dist/index.js'

const testInputFilePath = path.resolve('build-emscripten', 'ExternalData', 'test', 'Input', 'ironProt.vtk')
const testOutputFilePath = path.resolve('build-emscripten', 'Testing', 'Temporary', 'VTKTest-ironProt.vtk')

const verifyImage = (t, image) => {
  t.is(image.imageType.dimension, 3, 'dimension')
  t.is(image.imageType.componentType, IntTypes.UInt8, 'componentType')
  t.is(image.imageType.pixelType, PixelTypes.Scalar, 'pixelType')
  t.is(image.imageType.components, 1, 'components')
  t.is(image.origin[0], 0.0, 'origin[0]')
  t.is(image.origin[1], 0.0, 'origin[1]')
  t.is(image.origin[2], 0.0, 'origin[2]')
  t.is(image.spacing[0], 1.0, 'spacing[0]')
  t.is(image.spacing[1], 1.0, 'spacing[1]')
  t.is(image.spacing[2], 1.0, 'spacing[2]')
  t.is(getMatrixElement(image.direction, 3, 0, 0), 1.0, 'direction (0, 0)')
  t.is(getMatrixElement(image.direction, 3, 0, 1), 0.0, 'direction (0, 1)')
  t.is(getMatrixElement(image.direction, 3, 0, 2), 0.0, 'direction (0, 2)')
  t.is(getMatrixElement(image.direction, 3, 1, 0), 0.0, 'direction (1, 0)')
  t.is(getMatrixElement(image.direction, 3, 1, 1), 1.0, 'direction (1, 1)')
  t.is(getMatrixElement(image.direction, 3, 1, 2), 0.0, 'direction (1, 2)')
  t.is(getMatrixElement(image.direction, 3, 2, 0), 0.0, 'direction (2, 0)')
  t.is(getMatrixElement(image.direction, 3, 2, 1), 0.0, 'direction (2, 1)')
  t.is(getMatrixElement(image.direction, 3, 2, 2), 1.0, 'direction (2, 2)')
  t.is(image.size[0], 68, 'size[0]')
  t.is(image.size[1], 68, 'size[1]')
  t.is(image.size[2], 68, 'size[2]')
  t.is(image.data.length, 314432, 'data.length')
  t.is(image.data[1000], 0, 'data[1000]')
}

test('Test reading a VTK legacy file', t => {
  return readImageLocalFile(testInputFilePath).then(function (image) {
    verifyImage(t, image)
  })
})

test('Test writing a BioRad file', t => {
  return readImageLocalFile(testInputFilePath).then(function (image) {
    const useCompression = false
    return writeImageLocalFile(image, testOutputFilePath, useCompression)
  })
    .then(function () {
      return readImageLocalFile(testOutputFilePath).then(function (image) {
        verifyImage(t, image)
      })
    })
})
