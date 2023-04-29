import { EXCAMERA_LABS_USB_FILTER } from '../devices-serial/exc-i2cdriver.js'

export const SUPPORTED_SERIAL_FILTER = [
	EXCAMERA_LABS_USB_FILTER,
	//FT232H_USB_FILTER
]

const handleSerialPortConnect = e => console.log('port connect', e)
function build_handleSerialPortDisconnect(controller) {
	return e => {
		console.log('port disconnect', e)
		controller.abort()
	}
}

async function hydrateSerialPortEvents(port, controller) {
	// port.addEventListener('connect', handleSerialPortConnect)
	port.addEventListener('disconnect', build_handleSerialPortDisconnect(controller))
}

async function addSerialPort(ui, port, portList) {
	if(portList.includes(port)) {
		console.log('re-adding existing paired port')
		return
	}

	console.log('new underlineing port')
	portList.push(port)

	const controller = new AbortController()
	const { signal } = controller

	await hydrateSerialPortEvents(port, controller)

	// const channel = new MessageChannel()
	// const serialPort = channel.port1
	// postMessage({ type: 'serial-added', info: {}, port: serialPort }, { transfer: [ serialPort ]})
	await ui.addSerialPort(port, signal)
}

async function requestSerialDevice(filters) {
	return navigator.serial.requestPort({ filters })
}

function requestSerialPortHandler(add, event) {
	const all = event?.altKey
	const filters = all ? [] : SUPPORTED_SERIAL_FILTER

	requestSerialDevice(filters)
		.then(add)
		.catch(e => console.log('issues requesting device', e.message))
}

async function hydrateSerialBackgroundPorts(add) {
	const ports = await navigator.serial.getPorts()
	return Promise.all(ports.map(add))
}

function build_handleSerialConnect(add) {
	return e => {
		// connect from previously requested port
		console.log('reconnect previous port')
		const { target: port } = e

		add(port)
			.catch(console.warn)
	}
}

function build_handleSerialDisconnect(add) {
	return e => {
		const { target: port } = e

	}
}

async function hydrateSerialEvents(add) {
	navigator.serial.addEventListener('connect', build_handleSerialConnect(add))
  navigator.serial.addEventListener('disconnect', build_handleSerialDisconnect(add))
}

const build_requestSerialPortHandler = add => event => requestSerialPortHandler(add, event)

async function hydrateSerialReqeustButton(requestSerialButton, add) {
	requestSerialButton.addEventListener('click', build_requestSerialPortHandler(add), { once: false })
	requestSerialButton.disabled = false
}

export async function hydrateSerial(requestSerialButton, ui) {
	const portList = []
	const add = async port => addSerialPort(ui, port, portList)

	return Promise.all([
		hydrateSerialBackgroundPorts(add),
		hydrateSerialEvents(add),
		hydrateSerialReqeustButton(requestSerialButton, add)
	])
}
