import { I2CAddressedBus } from '@johntalton/and-other-delights'

/** @template T */
export class BasicBuilder {
	#title
	#clazz
	#element
	#abus
	#device

	/**
	 * @param {string} title
	 * @param {string} element
	 * @param {typeof T} clazz
	 */
	constructor(title, element, clazz, definition, ui) {
		this.#element = element
		this.#clazz = clazz
		this.#title = title
		const { bus, address } = definition
		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return this.#title }

	async open() {
		this.#device = new this.#clazz(this.#abus)
	}

	async close() { }

	signature() { }

	/** @returns {T} */
	get device() { return this.#device }
	set device(d) { this.#device = d }

	async bindCustomView(root) {
		//
	}

	async buildCustomView(selectionElem) {
		const response = await fetch(`./custom-elements/${this.#element}.html`)
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector(`${this.#element}-config`)
		if (root === null) { throw new Error('no root for template') }

		await this.bindCustomView(root)

		return root
	}
}
