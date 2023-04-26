import { I2CAddressedBus } from '@johntalton/and-other-delights'
// import { BitSmush, SMUSH_MAP_8_BIT_NAMES } from '@johntalton/bitsmush'

import {
	ADT7410
} from '@johntalton/adt7410'


export class ADT7410Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new ADT7410Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}

	get title() { return 'ADT7410' }

	async open() {
		this.#device = ADT7410.from(this.#abus)

    const id = await this.#device.getId()
    // const status = await this.#device.getStatus()
    const config = await this.#device.getConfiguration()
    const temp = await this.#device.getTemperature()
    // const setpointH = await this.#device.getSetpointHigh()
    // const setpointL = await this.#device.getSetpointLow()
    // const setpointC = await this.#device.getSetpointCritical()
    // const setpointHyst = await this.#device.getSetpointHysteria()

    console.log({
      id,
      // status,
      config,
      temp,
      // setpoints: {
      //   high: setpointH,
      //   low: setpointL,
      //   critical: setpointC,
      //   hysteria: setpointHyst
      // }
    })

	}

	async close() { }

	signature() { }

	async buildCustomView() {
    const root = document.createElement('div')

    const resetButton = document.createElement('button')
    resetButton.innerText = 'reset ⚡️'
    resetButton.addEventListener('click', event => {
      event.preventDefault()
      resetButton.disabled = true

      this.#device.reset()
        .then(async () => {
          resetButton.disabled = false
          console.log('reset finished')

          await this.#device.setConfiguration({
            faultQueue: 3,
            CTPolarity: 0,
            INTPolarity: 0,
            INTCTMode: 0,
            OperationMode: 0,
            resolution: 1
          })

          const c = await this.#device.getConfiguration()
          console.log(c)
        })
        .catch(e => console.warn(e))
    })
    root.appendChild(resetButton)

		return root
	}
}

