// import { ADT7410 } from '@johntalton/adt7410'
// import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { BIT_MODE, FT232H, FT232HBus, PIN_STATE_COMMANDS } from '@johntalton/ft232h'
import { delayMs } from '../util/delay.js'
// import { dumpUSBDevice } from '../util/usb-info.js'

/// <reference types="w3c-web-usb" />

// export function isBitSet(value, bitToCheck) {
// 	return ((value >> bitToCheck) & 0b1) === 0b1
// }

export const FT232H_PRODUCT_ID = 0x6014
export const FT232H_VENDOR_ID = 0x0403






// export const OP_CODE_GPIO_SET_BITS_LOW = 0x80
// export const OP_CODE_GPIO_GET_BITS_LOW = 0x81
// export const OP_CODE_GPIO_SET_BITS_HIGH = 0x82
// export const OP_CODE_GPIO_GET_BITS_HIGH = 0x83
// export const OP_CODE_ENABLE_LOOPBACK = 0x84
// export const OP_CODE_DISABLE_LOOPBACK = 0x85
// export const OP_CODE_TCK_DIVISOR = 0x86
// export const OP_CODE_SEND_IMMEDIATE = 0x87 // flush read buffer
// export const OP_CODE_WAIT_UNTIL_HIGH = 0x88
// export const OP_CODE_WAIT_UNTIL_LOW = 0x89
// export const OP_CODE_DISABLE_CLOCK_DIV_BY_5 = 0x8A
// export const OP_CODE_ENABLE_CLOCK_DIV_BY_5 = 0x8B
// export const OP_CODE_ENABLE_3_PHASE_CLOCK = 0x8C
// export const OP_CODE_DISABLE_3_PHASE_CLOCK = 0x8D
// export const OP_CODE_CLOCK_N_BITS = 0x8E
// export const OP_CODE_CLOCK_N_BYTES = 0x8F


// export const OP_CODE_GPIO_CLOCK_UNTIL_HIGH = 0x94
// export const OP_CODE_GPIO_CLOCK_UNTIL_LOW = 0x95
// export const OP_CODE_ENABLE_ADAPTIVE_CLOCKING = 0x96
// export const OP_CODE_DISABLE_ADAPTIVE_CLOCKING = 0x97
// export const OP_CODE_GPIO_CLOCK_N_BYTES_UNTIL_HIGH = 0x9C
// export const OP_CODE_GPIO_CLOCK_N_BYTES_UNTIL_LOW = 0x9D
// export const OP_CODE_ENABLE_OPEN_DRAIN = 0x9E






// export const MPSSE_WRITE_NEG = 0x01
// export const MPSSE_BITMODE = 0x02
// export const MPSSE_READ_NEG = 0x04
// export const MPSSE_LSB = 0x08
// export const MPSSE_DO_WRITE = 0x10
// export const MPSSE_DO_READ = 0x20
// export const MPSSE_WRITE_TMS = 0x40



// export const FTDI_SIO_RESET_REQUEST = 0x00
// #define FTDI_SIO_RESET_REQUEST			0x00
// #define FTDI_SIO_SET_MODEM_CTRL_REQUEST		0x01
// #define FTDI_SIO_SET_FLOW_CTRL_REQUEST		0x02
// #define FTDI_SIO_SET_BAUDRATE_REQUEST		0x03
// #define FTDI_SIO_SET_DATA_REQUEST		0x04
// export const  FTDI_SIO_GET_MODEM_STATUS_REQUEST = 0x05
// #define FTDI_SIO_SET_LATENCY_TIMER_REQUEST	0x09
// #define FTDI_SIO_GET_LATENCY_TIMER_REQUEST	0x0a
// export const FTDI_SIO_SET_BITMODE_REQUEST = 0x0B
// #define FTDI_SIO_SET_BITMODE_REQUEST		0x0b
// #define FTDI_SIO_READ_PINS_REQUEST		0x0c
// #define FTDI_SIO_READ_EEPROM_REQUEST		0x90





/**
 * @param {FT232H} driver
 * @param {AbortSignal} signal
 */
async function addADT(driver, ui, signal) {
	await driver.setBitMode(BIT_MODE.MPSSE)

	await FT232HBus.init(driver)
	const bus = new FT232HBus(driver)

	ui.addI2CDevice({
		type: 'adt7410',
		bus: bus,
		address: 0x48,

		port: undefined,
		signal
	})
}

/**
 * @param {FT232H} driver
 * @param {AbortSignal} signal
 */
async function addPCF(driver, ui, signal) {
	await driver.setBitMode(BIT_MODE.MPSSE)

	await FT232HBus.init(driver)
	const bus = new FT232HBus(driver)

	ui.addI2CDevice({
		type: 'pcf8523 (RTC)',
		bus: bus,
		address: 0x68,

		port: undefined,
		signal
	})
}

// async function runTest(device, endpointIn, endpointOut) {

// 	// soft reset
// 	const resetResult = await device.controlTransferOut({
// 		requestType: 'vendor',
// 		recipient: 'device',
// 		request: FTDI_SIO_SET_BITMODE_REQUEST,
// 		value: 0x0000,
// 		index: 0x0001
// 	})
// 	console.log(resetResult.status, resetResult.bytesWritten)

// 	// enable MPSSE mode
// 	const result = await device.controlTransferOut({
// 		requestType: 'vendor',
// 		recipient: 'device',
// 		request: FTDI_SIO_SET_BITMODE_REQUEST,
// 		value: 0x0200, // MPSSE
// 		index: 0x0001 // Channel A / Interface 0
// 	})
// 	console.log(result.status, result.bytesWritten)


// 	// test for Bad Command detection
// 	const bar = await device.transferOut(endpointOut, Uint8Array.from([ 0xAA, OP_CODE_SEND_IMMEDIATE ]))
// 	console.log(bar)

// 	let packet = undefined
// 	for(let i = 0; i < 10; i += 1) {
// 		const length = 64
// 		const foo = await device.transferIn(endpointIn, length)
// 		console.log(foo.status, new Uint8Array(foo.data.buffer))
// 		if(foo.status !== 'ok') { break }
// 		if(foo.data.byteLength <= 2) { continue }

// 		packet = foo.data
// 		break
// 	}

// 	console.log('packet', packet)

// 	const code = packet.getUint8(2)
// 	const echo = packet.getUint8(3)

// 	console.log('code 0xFA', code.toString(16))
// 	console.log('echo 0xAA', echo.toString(16))
// }

/**
 * @param {FT232H} driver
 */
async function runBlink(driver) {
	console.log('run Blink')

	await driver.setBitMode(BIT_MODE.MPSSE)

	for(let i = 0; i < 10; i+=1) {
		console.log(i)

		await driver.sendData(Uint8Array.from([
			PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE, 0b0000_0000, 0b1000_0000
		]))

		await delayMs(500)

		await driver.sendData(Uint8Array.from([
			PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE, 0b1000_0000, 0b1000_0000
		]))

		await delayMs(50)

		// const result = await device.transferIn(endpointIn, 64)
		// const modemStatus = result.data.getUint8(0)
		// const lineStatus = result.data.getUint8(1)
		// logStatus(modemStatus, lineStatus)
	}

}


export class FT232HUIBuilder {
	/** @type {USBDevice} */
	#device

	/** @type {FT232H|undefined} */
	#driver = undefined
	#ui

	/** @type {AbortController} */
	#controller = new AbortController()

	/**
	 * @param {USBDevice} device
	 */
	static async builder(device, ui) {
		return new FT232HUIBuilder(device, ui)
	}

	/**
	 * @param {USBDevice} device
	 */
	constructor(device, ui) {
		this.#device = device
		this.#ui = ui
	}

	get title() {
		return 'FT232H'
	}

	async open() {
		console.log('open FT232H')
		//dumpUSBDevice(this.#device)

		await this.#device.open()

		this.#driver = await FT232H.from(this.#device)
	}

	async close() {
		this.#controller.abort('close')

		if(this.#device.opened) {
			return this.#device.close()
		}
	}

	signature() {
		return 'FT232H'

	}

	async buildCustomView() {
		const response = await fetch('./custom-elements/ft232H.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('ft232H-config')
		if (root === null) { throw new Error('no root for template') }



		const testButton = root.querySelector('button[command="--test"]')
		if(!(testButton instanceof HTMLButtonElement)) { throw new Error('invalid test button') }
		testButton.addEventListener('click', event => {
			const command = testButton.getAttribute('command')
			console.log('Command', command)
			if(command !== '--test') { throw new Error('not a test') }

			if(this.#driver === undefined) { throw new Error('driver not defined') }

			// runTest(this.#device, this.#endpointBulkIn.endpointNumber, this.#endpointBulkOut.endpointNumber)
			runBlink(this.#driver)
		})



		const resetButton = root.querySelector('button[command="--reset"]')
		if(!(resetButton instanceof HTMLButtonElement)) { throw new Error('invalid reset button') }
		resetButton.addEventListener('click', event => {
			const command = resetButton.getAttribute('command')
			console.log('Command', command)
			if(command !== '--reset') { throw new Error('not a reset') }

			this.#device.reset()
				.then(() => console.log('device reset'))
				.catch(e => console.log('device reset error', e))
		})

		const addADTButton = root.querySelector('button[command="--add-adt"]')
		if(!(addADTButton instanceof HTMLButtonElement)) { throw new Error('invalid add button') }
		addADTButton.addEventListener('click', event => {
			const command = addADTButton.getAttribute('command')
			console.log('Command', command)
			if(command !== '--add-adt') { throw new Error('not a add') }

			if(this.#driver === undefined) { throw new Error('driver not defined') }

			addADT(this.#driver, this.#ui, this.#controller.signal)
		})

		const addPCFButton = root.querySelector('button[command="--add-pcf"]')
		if(!(addPCFButton instanceof HTMLButtonElement)) { throw new Error('invalid add button') }
		addPCFButton.addEventListener('click', event => {
			const command = addPCFButton.getAttribute('command')
			console.log('Command', command)
			if(command !== '--add-pcf') { throw new Error('not a add') }

			if(this.#driver === undefined) { throw new Error('driver not defined') }

			addPCF(this.#driver, this.#ui, this.#controller.signal)
		})

		return root
  }
}