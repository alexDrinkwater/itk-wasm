const InterfaceTypes = {
  // Todo: remove Interface prefix after IOTypes has been removed
  TextFile: 'InterfaceTextFile',
  BinaryFile: 'InterfaceBinaryFile',
  TextStream: 'InterfaceTextStream',
  BinaryStream: 'InterfaceBinaryStream',
  Image: 'InterfaceImage',
  Mesh: 'InterfaceMesh',
  PolyData: 'InterfacePolyData',
  JsonObject: 'InterfaceJsonObject'
} as const

export default InterfaceTypes
