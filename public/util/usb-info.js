
export function dumpUSBDevice(device) {
  console.log(device.manufacturerName)
  console.log(device.productName)
  console.log(device.serialNumber)
  console.log()
  device.configurations.forEach(c => {
    const defaultConfig = c === device.configuration ? '*' : '-'
    console.log(defaultConfig, 'Config: ', c.configurationValue, c.configurationName)
    c.interfaces.forEach(i => {
      const defaultInt = i === c.interface ? '*' : '-'
      console.log('\t', defaultInt, i.claimed ? '(' : '', 'Interface', i.claimed ? '): ' : ': ', i.interfaceNumber)
      i.alternates.forEach(a => {
        const defaultAlt = a === i.alternate ? '*' : ''
        const aClass = a.interfaceClass === 10 ? '"CDC-Data"' :
          a.interfaceClass === 2 ? '"Com / CDC-Ctrl"' :
          a.interfaceClass === 3 ? '"HID"' :
          a.interfaceClass
        console.log('\t\t', defaultAlt, 'Alternate: ', a.interfaceName, 'class', aClass, 'protocol', a.interfaceProtocol)
        a.endpoints.forEach(e => {
          const defaultEp = e === a.endpoint ? '*' : ''
          console.log('\t\t\t', defaultEp, 'Endpoint: ', e.endpointNumber, e.direction, e.type)
        })
      })
    })
  })
}