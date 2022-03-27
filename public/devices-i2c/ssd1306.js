

export class SSD1306Builder {
	#definition

	static async builder(definition, ui) {
		return SSD1306Builder(definition, ui)
	}

	constructor(definition, ui) {
		this.#definition = definition
	}

	get title() { return 'SSD 1306 Display' }

	signature() {}

	async buildCustomView(selectionElem) {
		const root = document.createElement('ssd1306-config')

		root.textContent = 'My Little Display'

		return root
	}
}
