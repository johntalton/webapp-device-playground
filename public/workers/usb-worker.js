console.log('USB Worker')
const config = {
	deviceList: []
}

function handleUSBDeviceMessage(event) {
	console.log('device message', event)
}

//
async function addUSBDevice(device) {
	if(config.deviceList.find(item => item.device === device) !== undefined) {
		console.log('worker: device already paired ... ')
		return
	}

	console.log('opened?', device.opened)
	if(device.opened) { console.log() }

	const channel = new MessageChannel()
	const port = channel.port1
	channel.port2.onmessage = handleUSBDeviceMessage

	console.log('worker: adding new device')
	const info = {
		vendorId: device.vendorId,
		productId: device.productId,

		manufacturerName: device.manufacturerName,
		productName: device.productName,
		serialNumber: device.serialNumber
	}
	const item = { device, info, port: channel.port2 }
	config.deviceList = [ item, ...config.deviceList ]

	postMessage({ type: 'usb-added', info, port }, { transfer: [ port ]})
}

async function removeUSBDevice(device) {
	console.log('worker: remove')

	//
	const existingItem = config.deviceList.find(item => item.device === device)
	if(existingItem === undefined) { console.log('worker: removing unpaired device ...') }

	const info = existingItem.info

	//
	config.deviceList = config.deviceList.filter(item => item.device !== device)

	//
	existingItem.port.postMessage({ type: 'usb-device-removed', info })
	//existingItem.port.close()

	//
	postMessage({ type: 'usb-removed', info })
}

//
navigator.usb.addEventListener('connect', event => addUSBDevice(event.device)
	.then()
	.catch(e => console.log('worker: issue adding device', e.message)))

navigator.usb.addEventListener('disconnect', event => removeUSBDevice(event.device)
	.then()
	.catch(e => console.log('worker: issue removing device', e.message)))

//
async function scan() {
	console.log('usb worker: running scan...')
	const devices = await navigator.usb.getDevices()
	await Promise.all(devices.map(async d => {
		addUSBDevice(d)
	}))
}

//
onmessage = event => {
	const { data: message } = event
	const { type } = message

	console.log('usb worker: message', type)

	if(type === 'scan') { scan().then(() => console.log('usb worker: scan complete')).catch(e => console.warn); return }
}
