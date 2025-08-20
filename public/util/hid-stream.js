import { delayMs } from "./delay.js"

export const REPORT_ID = 0

function makeHandler(controller, supportBYOB = false) {
	return event => {
		const { reportId, data, device } = event

		// for now only report zero, until we return in buffer
		if(reportId !== REPORT_ID) { controller.error('report id miss-match') }

		if (supportBYOB && controller.byobRequest !== null) {
			const { view } = controller.byobRequest
			const bytesRead = data.byteLength

			// normalize data from a DataView to Uint8Array
			const input = ArrayBuffer.isView(data) ?
				new Uint8Array(data.buffer, data.byteOffset, data.byteLength) :
				new Uint8Array(data)

			// copy-into
			// console.log('hidStream: copy into byob request buffer')
			view.set(input)

			controller.byobRequest.respond(bytesRead)
		}
		else {
			// console.log('hidStream: queuing data in readable hid stream', data)
			controller.enqueue(data)
		}
	}
}

/**
 * @implements UnderlyingSource
 */
export class ReadableStreamUnderlyingSourceWebHID {
	/** @type {ReadableStreamType} */
	type = 'bytes'
	autoAllocateChunkSize = undefined

	#hid
	#handler
	#closed = false

	get closed() { return this.#closed }

	constructor(hid) {
		this.#hid = hid
	}

	async start(controller) {
		if(this.#handler === undefined) {
			this.#handler = makeHandler(controller, true)
			this.#hid.addEventListener('inputreport', this.#handler)
		}
	}

	// async pull(controller) {
	// 	console.log(Date.now(), 'no pull', controller.desiredSize)
	// }

	async cancel(reason) {
		console.log('hid stream canceled', reason)
		this.#hid.removeEventListener('inputreport', this.#handler)
		this.#closed = true
	}
}

/**
 * @implements UnderlyingSink
 */
export class WritableStreamUnderlyingSourceWebHID {
	// type = 'bytes'

	#hid
	#closed = false

	get closed() { return this.#closed }

	constructor(hid) {
		this.#hid = hid
	}

	start(controller) {}

	write(chunk, controller) { return this.#hid.sendReport(REPORT_ID, chunk) }

	async close(controller) {
		console.log('hid stream writer close')
		this.#closed = true
	}

	async abort(reason) {
		console.log('hid stream writer abort', reason)
		this.#closed = true
	}
}



/**
 * @implements ReadableWritablePair
 */
export class WebHIDStreamSource {
	#hid
	#readableUS
	#writableUS
	#readable
	#writable
	#queuingStrategy

	/** @param {HIDDevice} hid  */
	constructor(hid) {
		this.#hid = hid
		this.#queuingStrategy = new ByteLengthQueuingStrategy({
			highWaterMark: 1
		})

		// this.#readableUS = new ReadableStreamUnderlyingSourceWebHID(hid)
		// this.#writable = new WritableStream(new WritableStreamUnderlyingSourceWebHID(hid), queuingStrategy)
	}

	get readable() {
		if(this.#readableUS === undefined || this.#readableUS.closed) {
			this.#readableUS = new ReadableStreamUnderlyingSourceWebHID(this.#hid)
			this.#readable = new ReadableStream(this.#readableUS)
		}

		return this.#readable
	}
	get writable() {
		if(this.#writableUS === undefined || this.#writableUS.closed) {
			this.#writableUS = new WritableStreamUnderlyingSourceWebHID(this.#hid)
			this.#writable = new WritableStream(this.#writableUS, this.#queuingStrategy)
		}

		return this.#writable
	}
}


/**
 * @implements ReadableWritablePair
 */
export class _WebHIDStreamSource {
	#r = null
	#ur = null
	#w = null
	#uw = null
	#hid

	constructor(hid) {
		this.#hid = hid

		// allocate and thus start reader
		if(this.readable === null) {}
	}


	get readable() {
		if(this.#ur !== null && this.#ur.closed) {
			this.#ur = null
			this.#r = null
		}

		if(this.#r !== null) {
			return this.#r
		}

		// because this is a 'bytes' stream, this queuing strategy
		// is always ByteLengthQueuingStrategy (https://streams.spec.whatwg.org/#blqs-class)
		const queuingStrategy = {
			highWaterMark: 1
		}

		this.#ur = new ReadableStreamUnderlyingSourceWebHID(this.#hid)
		this.#r = new ReadableStream(this.#ur, queuingStrategy)

		return this.#r
	}

	get writable() {
		if(this.#uw !== null && this.#uw.closed) {
			this.#uw = null
			this.#w = null
		}

		if(this.#w !== null) {
			return this.#w
		}

		const queuingStrategy = new ByteLengthQueuingStrategy({
			highWaterMark: 1
		})

		this.#uw = new WritableStreamUnderlyingSourceWebHID(this.#hid)
		this.#w = new WritableStream(this.#uw, queuingStrategy)

		return this.#w
	}
}

