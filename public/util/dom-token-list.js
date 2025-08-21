const SINGLE_SPACE = ' '
const EMPTY_SPACE = ''

export class DOMTokenListLike {
	#set
	#attr
	// #observer

	static fromValue(value) {
		return new Set(value.split(SINGLE_SPACE).filter(v => v !== EMPTY_SPACE))
	}

	/**
	 * @param {Attr} attr
	 */
	constructor(attr) {
		this.#set = DOMTokenListLike.fromValue(attr.value)
		this.#attr = attr

		// this.#observer = new MutationObserver(mutations => {
		// 	console.log('ATTR', mutations)
		// })
		// this.#observer.observe(attr.ownerElement, { attributeFilter: [ attr.name ], attributes: true })
	}

	_update() {
		this.#attr.value = this.value
	}

	toString() {
		return [ ...this.#set.values() ].join(SINGLE_SPACE)
	}

	get value() { return this.toString() }
	set value(value) { this.#set = DOMTokenListLike.fromValue(value) }

	/**
	 * @param {String} token
	 * @returns {Boolean}
	 */
	contains(token) {
		return this.#set.has(token)
	}

	/**
	 * @param {Array<String>} tokens
	 */
	add(...tokens) {
		for(const token of tokens) {
			if(token === EMPTY_SPACE) { throw new DOMException('token empty', 'SyntaxError') }
			if(token.includes(SINGLE_SPACE)) { throw new DOMException('token whitespace', 'InvalidCharacterError') }
		}

		for(const token of tokens) {
			this.#set.add(token)
		}

		this._update()
	}

	/**
	 * @param {Array<String>} tokens
	 */
	remove(...tokens) {
		for(const token of tokens) {
			if(token === EMPTY_SPACE) { throw new DOMException('token empty', 'SyntaxError') }
			if(token.includes(SINGLE_SPACE)) { throw new DOMException('token whitespace', 'InvalidCharacterError') }
		}

		for(const token of tokens) {
			this.#set.delete(token)
		}

		this._update()
	}

	/**
	 * @param {String} token
	 * @param {Boolean|undefined} force
	 */
	toggle(token, force = undefined) {
		if(token === EMPTY_SPACE) { throw new DOMException('token empty', 'SyntaxError') }
		if(token.includes(SINGLE_SPACE)) { throw new DOMException('token whitespace', 'InvalidCharacterError') }

		if(this.#set.has(token)) {
			if(force === undefined || force === false) {
				this.#set.delete(token)
				this._update()
				return false
			}

			return true
		}

		if(force === undefined || force === true) {
			this.#set.add(token)
			this._update()
			return true
		}

		return false
	}
}