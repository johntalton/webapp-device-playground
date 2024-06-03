
import {
	BANK_0,
	BANK_1,
	DEFAULT,
	DIRECTION,
	HIGH,
	INTERRUPT_CONTROL,
	LOW,
	MCP23,
	MODE,
	PORT
} from '@johntalton/mcp23'
import { I2CAddressedTransactionBus } from '@johntalton/and-other-delights'
import { range } from '../util/range.js'
import { delayMs} from '../util/delay.js'
import { asyncEvent } from '../util/async-event.js'

// import { data } from '../custom-elements/mcp23.html' with { type: 'html' }



class InvalidModeError extends Error {}

function percentDifferentFromDefault(portCache, pin) {
	// return Math.random() * 100

	const tests = [
		portCache.direction[pin] !== DEFAULT.DIRECTION,
		portCache.polarity[pin] !== DEFAULT.POLARITY,
		portCache.interrupt[pin] !== DEFAULT.INTERRUPT,
		portCache.defaultValue[pin] !== DEFAULT.DEFAULT_VALUE,
		portCache.interruptControl[pin] !== DEFAULT.INPUT_CONTROL,
		portCache.pullUp[pin] !== DEFAULT.PULL_UP,
		portCache.outputLatchValue[pin] !== DEFAULT.OUTPUT_LATCH_VALUE
	]

	return tests.reduce((acc, value) => acc + (value ? 1 : 0), 0) / tests.length * 100
}

function modeMatch(mode, bank, sequential) {
	if(bank && mode.bank !== bank) { return false }
	if(sequential && mode.sequential !== sequential) { return false }
	return true
}

function assertMode(mode, bank, sequential) {
	if(!modeMatch(mode, bank, sequential)) { throw new InvalidModeError() }
	return mode
}

const assertModeBank0 = mode => assertMode(mode, BANK_0)
const assertModeBank0Sequential = mode => assertMode(mode, BANK_0, true)
const assertModeBank1Sequential = mode => assertMode(mode, BANK_1, true)

class MCP23GuardedMode {
	#mode
	#mcp23

	constructor(host, mode = MODE.INTERLACED_BLOCK) {
		this.#mcp23 = host
		this.#mode = mode
	}

	get mode() { return this.#mode }
	set mode(mode) {
		console.log('change cached mode', this.#mode, mode)
		this.#mode = mode
	}

	async getControl() { return this.#mcp23.getControl(this.#mode) }
	async setControl(control) {
		await this.#mcp23.setControl(this.#mode, control)
		this.mode = control.mode
	}

	async getDirection(port) { return this.#mcp23.getDirection(this.#mode, port) }
	async setDirection(port, direction) { return this.#mcp23.setDirection(this.#mode, port, direction) }

	async getPolarity(port) { return this.#mcp23.getPolarity(this.#mode, port) }
	async setPolarity(port, polarity) { return this.#mcp23.setPolarity(this.#mode, port, polarity) }

	async getInterrupt(port) { return this.#mcp23.getInterrupt(this.#mode, port) }
	async setInterrupt(port, interrupt) { return this.#mcp23.setInterrupt(this.#mode, port, interrupt) }

	async getDefaultValue(port) { return this.#mcp23.getDefaultValue(this.#mode, port) }
	async setDefaultValue(port, defaultValue) { return this.#mcp23.setDefaultValue(this.#mode, port, defaultValue) }

	async getInterruptControl(port) { return this.#mcp23.getInterruptControl(this.#mode, port) }
	async setInterruptControl(port, interruptControl) { return this.#mcp23.setInterruptControl(this.#mode, port, interruptControl) }

	async getPullUp(port) { return this.#mcp23.getPullUp(this.#mode, port) }
	async setPullUp(port, pullUp) { return this.#mcp23.setPullUp(this.#mode, port, pullUp) }

	async getInterruptFlag(port) { return this.#mcp23.getInterruptFlag(this.#mode, port) }

	async getInterruptCaptureValue(port) { return this.#mcp23.getInterruptCaptureValue(this.#mode, port) }

	async getOutputValue(port) { return this.#mcp23.getOutputValue(this.#mode, port) }
	async setOutputValue(port, outputValue) { return this.#mcp23.setOutputValue(this.#mode, port, outputValue) }

	async getOutputLatchValue(port) { return this.#mcp23.getOutputLatchValue(this.#mode, port) }
	async setOutputLatchValue(port, latchValue) { return this.#mcp23.setOutputLatchValue(this.#mode, port, latchValue) }

	// Bank 0
	async getDirections() { return this.#mcp23.getDirections(assertModeBank0(this.#mode)) }
	async getPolarities() { return this.#mcp23.getPolarities(assertModeBank0(this.#mode)) }
	async getInterrupts() { return this.#mcp23.getInterrupts(assertModeBank0(this.#mode)) }
	async getDefaultValues() { return this.#mcp23.getDefaultValues(assertModeBank0(this.#mode)) }
	async getInterruptControls() { return this.#mcp23.getInterruptControls(assertModeBank0(this.#mode)) }
	async getPullUps() { return this.#mcp23.getPullUps(assertModeBank0(this.#mode)) }
	async getInterruptFlags() { return this.#mcp23.getInterruptFlags(assertModeBank0(this.#mode)) }
	async getInterruptCaptureValues() { return this.#mcp23.getInterruptCaptureValues(assertModeBank0(this.#mode)) }
	async getOutputValues() { return this.#mcp23.getOutputValues(assertModeBank0(this.#mode)) }
	async getOutputLatchValues() { return this.#mcp23.getOutputLatchValues(assertModeBank0(this.#mode)) }

	// Bank 0 sequential True
	async getPorts() { return this.#mcp23.getPorts(assertModeBank0Sequential(this.#mode)) }

	// Bank 1 sequential True
	async getPort(port) { return this.#mcp23.getPort(assertModeBank1Sequential(this.#mode), port) }

}

export class MCP23GuardedModeTransactional extends MCP23GuardedMode {
	constructor(host, mode = MODE.INTERLACED_BLOCK) {
		super(host, mode)
	}

	async _getPort(port) {
		console.log('getPort fallback transaction')
		const [
			direction,
			polarity,
			interrupt,
			defaultValue,
			interruptControl,
			pullUp,
			outputLatchValue
		] = await Promise.all([
			this.getDirection(port),
			this.getPolarity(port),
			this.getInterrupt(port),
			this.getDefaultValue(port),
			this.getInterruptControl(port),
			this.getPullUp(port),
			this.getOutputLatchValue(port)
		])

		return {
			direction,
			polarity,
			interrupt,
			defaultValue,
			interruptControl,
			pullUp,
			outputLatchValue
		}
	}

	async getPort(port) {
		if(modeMatch(this.mode, BANK_1, true)) { return super.getPort(port) }
		return this._getPort(port)
	}
}


export class MCP23Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new MCP23Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition
		this.#abus = new I2CAddressedTransactionBus(bus, address)
	}


	get title() { return 'MCP230xx GPIO' }


	async open() {
		this.#device = new MCP23GuardedModeTransactional(new MCP23(this.#abus), MODE.INTERLACED_BLOCK)
	}

	async close() {}

	signature() {}

	async buildCustomView(selectionElem) {
		const response = await fetch('./custom-elements/mcp23.html')
		if (!response.ok) { throw new Error('no html for view') }
		const view = await response.text()
		const doc = (new DOMParser()).parseFromString(view, 'text/html')

		const root = doc?.querySelector('mcp23-config')
		if (root === null) { throw new Error('no root for template') }

		// const template = doc.querySelector('template[data-gpio]')

		const refreshControl = async () => {
			const {
				mode,
				interrupt,
				slew,
				hardwareAddress
			} = await this.#device.getControl()
			const {
				mirror, openDrain, interruptPolarityHigh
			} = interrupt

			const configForm = root.querySelector('form[data-config]')
			const bankSelect = configForm.querySelector('select[name="bank"]')
			const sequentialCheckbox = configForm.querySelector('input[name="sequential"]')
			const slewCheckbox = configForm.querySelector('input[name="slew"]')
			const hardwareAddressCheckbox = configForm.querySelector('input[name="hardwareAddress"]')
			const mirrorCheckbox = configForm.querySelector('input[name="mirror"]')
			const interruptModeSelect = configForm.querySelector('select[name="interruptMode"]')

			bankSelect.value = mode.bank
			sequentialCheckbox.checked = mode.sequential
			slewCheckbox.checked = slew
			hardwareAddressCheckbox.checked = hardwareAddress
			mirrorCheckbox.checked = mirror

			const key = openDrain ? 'O-D' : interruptPolarityHigh ? 'A-H' : 'A-L'
			interruptModeSelect.value = key
		}

		const refreshDeviceCacheIfNeeded = async (port, loading) => {
			if(loading) { root.toggleAttribute('data-loading', true) }

			let temp = undefined
			try { temp = JSON.parse(root.dataset.cache) } catch(e) {}
			const currentCache = temp

			const valid = currentCache !== undefined && currentCache  !== null && currentCache !== ''
			const hasA = valid && (currentCache[PORT.A] !== undefined)
			const hasB = valid && (currentCache[PORT.B] !== undefined)

			if(hasA && hasB) { return }
			if(hasA && (port === PORT.A)) { return }
			if(hasB && (port === PORT.B)) { return }

			console.log('refresh cache from device', port)

			const {
				direction,
				polarity,
				interrupt,
				defaultValue,
				interruptControl,
				pullUp,
				outputLatchValue
		 } = await this.#device.getPort(port)

			const update = {
				...currentCache,
				[port]: {
					direction,
					polarity,
					interrupt,
					defaultValue,
					interruptControl,
					pullUp,
					outputLatchValue
				}
			}

			root.dataset.cache = JSON.stringify(update)
		}

		const refreshForm = async () => {
			const port = root.getAttribute('port')
			const pinStr = root.getAttribute('pin')
			const pin = parseInt(pinStr)

			const cache = JSON.parse(root.dataset.cache)
			const portCache = cache[port]

			for(const pin of range(0, 7)) {
				const percent = percentDifferentFromDefault(portCache, pin)
				const badgeDiv = root.querySelector(`:has(> button[data-gpio="${pin}"]) > [data-badge]`)
				badgeDiv.style.setProperty('--percent-accent', percent)
			}


			const direction = portCache.direction[pin]
			const polarity = portCache.polarity[pin]
			const interrupt = portCache.interrupt[pin]
			const defaultValue = portCache.defaultValue[pin]
			const interruptControl = portCache.interruptControl[pin]
			const pullUp = portCache.pullUp[pin]
			const outputLatchValue = portCache.outputLatchValue[pin]

			const gpioForm = root.querySelector('form[data-gpio]')
			const directionSelect = gpioForm?.querySelector('select[name="direction"]')
			const polarityCheckbox = gpioForm?.querySelector('input[name="enableInversePolarity"]')
			const pullUpCheckbox = gpioForm?.querySelector('input[name="pullUp"]')
			const outputLatchSelect = gpioForm?.querySelector('select[name="outputLatchValue"]')
			const enableInterruptCheckbox = gpioForm?.querySelector('input[name="enableInterrupt"]')
			const interruptControlSelect = gpioForm?.querySelector('select[name="inputControl"]')
			const defaultValueSelect = gpioForm?.querySelector('select[name="defaultValue"]')

			directionSelect.value = direction === DIRECTION.IN ? 'in' : 'out'
			polarityCheckbox.checked = polarity
			enableInterruptCheckbox.checked = interrupt
			defaultValueSelect.value = defaultValue === HIGH ? 'high' : 'low'
			interruptControlSelect.value = interruptControl === INTERRUPT_CONTROL.DEFAULT_VALUE ? 'default' : 'previous'
			pullUpCheckbox.checked = pullUp
			outputLatchSelect.value = outputLatchValue === HIGH ? 'high' : 'low'

			// root.toggleAttribute('data-loading', false)
			if (!document.startViewTransition) {
				root.toggleAttribute('data-loading', false)
			} else {
				const transition = document.startViewTransition(() => {
					root.toggleAttribute('data-loading', false)
				})
			}
		}


		const configForm = root.querySelector('form[data-config]')
		configForm?.addEventListener('change', asyncEvent(async event => {

			const configForm = root.querySelector('form[data-config]')
			const bankSelect = configForm.querySelector('select[name="bank"]')
			const sequentialCheckbox = configForm.querySelector('input[name="sequential"]')
			const slewCheckbox = configForm.querySelector('input[name="slew"]')
			const hardwareAddressCheckbox = configForm.querySelector('input[name="hardwareAddress"]')
			const mirrorCheckbox = configForm.querySelector('input[name="mirror"]')
			const interruptModeSelect = configForm.querySelector('select[name="interruptMode"]')


			await this.#device.setControl({
				mode: {
					bank: parseInt(bankSelect.value),
					sequential: sequentialCheckbox.checked
				},
				interrupt: {
					mirror: mirrorCheckbox.checked,
					openDrain: interruptModeSelect.value === 'O-D',
					interruptPolarityHigh: interruptModeSelect.value === 'A-H'
				},
				slew: slewCheckbox.checked,
				hardwareAddress: hardwareAddressCheckbox.checked
			})


			await refreshControl()
		}))

		const useButton = root.querySelector('button[data-use]')
		useButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			useButton.disabled = true

			const assumedModeForm = root.querySelector('form[data-pre-config]')
			const assumedBankSelect = assumedModeForm?.querySelector('select[name="bank"]')
			const assumedSequentialCheckbox = assumedModeForm?.querySelector('input[name="sequential"]')

			this.#device.mode = {
				bank: parseInt(assumedBankSelect.value),
				sequential: assumedSequentialCheckbox.checked
			}

			root.dataset.cache = undefined // root.removeAttribute('data-cache')

			await refreshControl()

			// spoof click to select tab
			const b = root.querySelector('button[data-tab="config"]')
			b?.dispatchEvent(new Event('click'))

			useButton.disabled = false
		}))

		const gpioButtons = root.querySelectorAll('button[data-gpio]')
		for(const gpioButton of gpioButtons) {
			gpioButton.addEventListener('click', asyncEvent(async event => {

				const { target } = event
				const parent = target.closest('ul')
				const buttons = parent.querySelectorAll('button[data-gpio]')
				buttons.forEach(b => b.toggleAttribute('data-active', false))

				target.toggleAttribute('data-active', true)

				const pin = target.getAttribute('data-gpio')

				const currentPortTab = root.querySelector('button[data-tab][data-port][data-active]')
				currentPortTab?.setAttribute('data-preferred-pin', pin)

				root.setAttribute('pin', pin)
			}))
		}

		const abTabObserver = new MutationObserver(mutations => {
			const activityChange = mutations.reduce((acc, value) => {
				return acc || (value.attributeName === 'data-active')
			}, false)
			if(!activityChange) { return }

			const currentActive = root.querySelector('button[data-port][data-tab][data-active]')
			if(currentActive === null) { return }

			const port = currentActive.getAttribute('data-port')
			root.setAttribute('port', port)

			const preferredPinStr = currentActive.getAttribute('data-preferred-pin')
			const preferredPin = parseInt(preferredPinStr)

			const gpioButtons = root.querySelectorAll('button[data-gpio]')
			gpioButtons.forEach(b => b.toggleAttribute('data-active', b.getAttribute('data-gpio') === preferredPinStr))

			root.setAttribute('pin', preferredPin)
		})
		const buttonTabA = root.querySelector('button[data-port="A"]')
		const buttonTabB = root.querySelector('button[data-port="B"]')
		abTabObserver.observe(buttonTabA, { attributes: true })
		abTabObserver.observe(buttonTabB, { attributes: true })

		const portPinObserver = new MutationObserver(mutations => {
			const port = root.getAttribute('port')
			const pinStr = root.getAttribute('pin')
			const pin = parseInt(pinStr)

			if(port === null || ![PORT.A, PORT.B].includes(port)) {
				console.warn('unknown port selection')
				return
			}

			if(pin === null || isNaN(pin) || (pin < 0)) {
				console.warn('unknown pin selection')
				return
			}

			refreshDeviceCacheIfNeeded(port, true)
				.then(refreshForm)
				.catch(e => console.warn('error refreshing cache', e))
		})
		portPinObserver.observe(root, { attributes: true, attributeFilter: [ 'port', 'pin' ]})


		const gpioForm = root.querySelector('form[data-gpio]')
		gpioForm?.addEventListener('change', asyncEvent(async event => {
			event.preventDefault()

			const port = root.getAttribute('port')
			const pinStr = root.getAttribute('pin')
			const pin = parseInt(pinStr)


			const cache = JSON.parse(root.dataset.cache)
			const portCache = cache[port]


			console.log('old port value', portCache)
			// await delayMs(1000)


			const whatChanged = event.target.getAttribute('name')
			if(whatChanged === 'direction') {
				const dir = event.target.value === 'in' ? DIRECTION.IN : DIRECTION.OUT
				portCache.direction[pin] = dir
				await this.#device.setDirection(port, portCache.direction)
			}
			else if(whatChanged === 'enableInversePolarity') {
				portCache.polarity[pin] = event.target.checked
				await this.#device.setPolarity(port, portCache.polarity)
			}
			else if(whatChanged === 'pullUp') {
				portCache.pullUp[pin] = event.target.checked
				await this.#device.setPullUp(port, portCache.pullUp)
			}
			else if(whatChanged === 'outputLatchValue') {
				portCache.outputLatchValue[pin] = event.target.value === 'high' ? HIGH : LOW
				await this.#device.setOutputLatchValue(port, portCache.outputLatchValue)
			}
			else if(whatChanged === 'enableInterrupt') {
				portCache.interrupt[pin] = event.target.checked
				await this.#device.setInterrupt(port, portCache.interrupt)
			}
			else if(whatChanged === 'inputControl') {
				portCache.outputLatchValue[pin] = event.target.value === 'default' ? INTERRUPT_CONTROL.DEFAULT_VALUE : INTERRUPT_CONTROL.PREVIOUS_VALUE
				await this.#device.setInterruptControl(port, portCache.outputLatchValue)
			}
			else if(whatChanged === 'defaultValue') {
				portCache.defaultValue[pin] = event.target.value === 'high' ? HIGH : LOW
				await this.#device.setDefaultValue(port, portCache.defaultValue)
			}
			else {
				console.warn('unhandled whatChanged', whatChanged)
			}


			// clear port cache
			cache[port] = undefined
			root.dataset.cache = JSON.stringify(cache)

			refreshDeviceCacheIfNeeded(port, false)
				.then(refreshForm)
				.catch(e => console.warn('refreshing port error', e))
		}))


		const refreshPollButton = root.querySelector('button[data-refresh]')
		const refreshPollRateSelect = root.querySelector('select[name="refreshRate"]')
		const refreshPollCounter = root.querySelector('output[name="counter"]')
		const refreshPollProgress = root.querySelector('progress[name="progress"]')
		refreshPollButton?.addEventListener('click', asyncEvent(async event => {
			event.preventDefault()

			const cacheMap = {  }

			const pollSingle = async () => {

				for (const port of [PORT.A, PORT.B]) {
					const flags = await this.#device.getInterruptFlag(port)
					const caps = await this.#device.getInterruptCaptureValue(port)
					const outs = await this.#device.getOutputValue(port)

					for(const pin of range(0, 7)) {

						if(cacheMap[`out${port}${pin}`] === undefined) {
							cacheMap[`out${port}${pin}`] = root.querySelector(`output[name="port${port}pin${pin}"]`)
						}
						const output = cacheMap[`out${port}${pin}`]

						if(cacheMap[`outCap${port}${pin}`] === undefined) {
							cacheMap[`outCap${port}${pin}`] = root.querySelector(`output[name="port${port}pin${pin}Capture"]`)
						}
						const outputCapture = cacheMap[`outCap${port}${pin}`]

						outputCapture?.setAttribute('data-flag', flags[pin])
						outputCapture.innerText = caps[pin] === HIGH ? '🔔 (High)' : '🔔 (Low)'

						output?.toggleAttribute('data-high', outs[pin])
						output.innerText = outs[pin] === HIGH ? 'High' : 'Low'
					}
				}
			}

			const timeoutStr = refreshPollRateSelect.value

			if(timeoutStr === 'once') {
				refreshPollButton.disabled = true
				refreshPollProgress.max = 100
				refreshPollProgress.value = 0

				await pollSingle()

				refreshPollButton.disabled = false
				refreshPollProgress.value = 100

				return
			}

			const timeout = parseInt(timeoutStr)
			var counter = 0
			const POLL_RATE_S = 0.5

			refreshPollButton.disabled = true
			refreshPollRateSelect.disabled = true
			refreshPollCounter.innerText = ''

			refreshPollProgress.disabled = false
			refreshPollProgress.value = counter
			refreshPollProgress.max = timeout

			//
			const poller = setInterval(async () =>  {
				counter += POLL_RATE_S
				refreshPollProgress.value = counter

				await pollSingle()

			}, 1000 * POLL_RATE_S)
			setTimeout(() => {
				clearInterval(poller)

				refreshPollRateSelect.disabled = false
				refreshPollButton.disabled = false

				refreshPollProgress.disabled = true
				refreshPollProgress.value = 100
				refreshPollProgress.max = 100
			}, 1000 * timeout)
		}))

		const tabButtons = root.querySelectorAll('button[data-tab]')
		for (const tabButton of tabButtons) {
			tabButton.addEventListener('click', event => {
				event.preventDefault()

				const { target } = event
				const parent = target?.parentNode
				const grandParent = parent.parentNode

				const tabName = target.getAttribute('data-tab')

				// remove content active
				const activeOthers = grandParent.querySelectorAll(':scope > [data-active]')
				activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

				// remove tab button active
				const activeOthersTabsButtons = parent.querySelectorAll(':scope > button[data-tab]')
				activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

				const tabContentElem = grandParent.querySelector(`:scope > [data-for-tab="${tabName}"]`)
				if(tabContentElem === null) { console.warn('tab content not found', tabName) }
				else {
					tabContentElem.toggleAttribute('data-active', true)
				}

				tabButton.toggleAttribute('data-active', true)
			})
		}

		await refreshControl()

		return root
	}
}
