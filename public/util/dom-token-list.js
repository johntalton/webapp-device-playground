const SINGLE_SPACE = ' '
const EMPTY_SPACE = ''

export class DOMTokenListLike {
	#set
	#attr

	/**
	 * @param {Attr} attr
	 */
	constructor(attr) {
		this.#set = new Set(attr.value.split(SINGLE_SPACE).filter(v => v !== EMPTY_SPACE))
		this.#attr = attr
	}

	_update() {
		this.#attr.value = this.value
	}

	toString() {
		return [ ...this.#set.values() ].join(SINGLE_SPACE)
	}

	get value() { return this.toString() }

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
			if(token === EMPTY_SPACE) { throw new SyntaxError('token empty') }
			if(token.includes(SINGLE_SPACE)) { throw new InvalidCharacterError('token whitespace') }
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
			if(token === EMPTY_SPACE) { throw new SyntaxError('token empty') }
			if(token.includes(SINGLE_SPACE)) { throw new InvalidCharacterError('token whitespace') }
		}

		for(const token of tokens) {
			this.#set.delete(token)
		}

		this._update()
	}

	/**
	 * @param {String} token
	 * @param {Boolean} force
	 */
	toggle(token, force) {
		if(token === EMPTY_SPACE) { throw new SyntaxError('token empty') }
		if(token.includes(SINGLE_SPACE)) { throw new InvalidCharacterError('token whitespace') }

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