export const REPORT_ID = 0

function getReadStream(hid) {
	return new ReadableStream({
		type: 'bytes',
		start(controller) {
			hid.addEventListener('inputreport', event => {
				const { reportId, data, device } = event

				// for now only report zero, until we return in buffer
				if(reportId !== REPORT_ID) { controller.error('report id miss-match') }

				if (controller.byobRequest !== null) {
					const { view } = controller.byobRequest
					const bytesRead = data.byteLength

					// normalize data from a DataView to Uint8Array
					const input = ArrayBuffer.isView(data) ?
						new Uint8Array(data.buffer, data.byteOffset, data.byteLength) :
						new Uint8Array(data)

					// copy-into
					view.set(input)

					controller.byobRequest.respond(bytesRead)
				}
				else {
					controller.enqueue(data)
				}
			})
		},
		cancel() {

		}
	}, {})
}

function getWriteStream(hid) {
	return new WritableStream({
		start(controller) {},
    write(chunk, controller) {
			// console.log('send report')
			return hid.sendReport(REPORT_ID, chunk)
		},
    close(controller) {},
    abort(reason) {}
	}, {
		// highWaterMark: 1,
		// size: () => 1
	})
}


export class HIDStreamSource {
	#r
	#w
	#hid

	constructor(hid) { this.#hid = hid }

	get readable() {
		if(this.#r === undefined) {
			this.#r = getReadStream(this.#hid)
		}

		return this.#r
	}

	get writable() {
		if(this.#w === undefined) {
			this.#w = getWriteStream(this.#hid)
		}

		return this.#w
	}
}

