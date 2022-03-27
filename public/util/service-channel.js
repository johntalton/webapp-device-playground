

export class ServiceChannel {
	constructor(name) {
		this.#name = name
		this.#bc = new BroadcastChannel(name)
	}

	get name() { return this.#name }

	set onmessage(callback) {
		this.#bc.onmessage = callback
	}
	set onmessageerror(callback) {
		this.#bc.onmessageerror = callback
	}

	close() {
		this.#bc.close()
	}

	postMessage(message) {
		this.#bc.postMessage(message)
	}


}