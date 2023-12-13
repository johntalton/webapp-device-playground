import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { PCF8523 } from '@johntalton/pcf8523'

export class PCF8523Builder {
	#abus
	#device

	static async builder(definition, ui) {
		return new PCF8523Builder(definition, ui)
	}

	constructor(definition, ui) {
		const { bus, address } = definition

		this.#abus = new I2CAddressedBus(bus, address)
	}


	get title() { return 'PCF8523 (RTC)' }

	async open() {
		this.#device = await PCF8523.from(this.#abus)
	}

	async close() { }

	signature() { }

	async buildCustomView(selectionElem) {
    const root = document.createElement('div')


    // await this.#device.setControl3({
    //   pmBatteryLowDetectionEnabled: true,
		// 	pmSwitchoverEnabled: true,
		// 	pmDirectSwitchingEnabled: false,

		// 	clearBatterSwitchoverFlag: false,
		// 	switchoverEnabled: true,
		// 	batteryLowEnabled: true
    // })

    const profile = await this.#device.getProfile()
    console.log(profile)

   // await this.#device.setTime()


    const button = document.createElement('button')
    button.innerText = '🧭 Time'
    root.appendChild(button)

    button.addEventListener('click', async event => {
      const time = await this.#device.getTime()

      const { year, month, monthsValue, day, hour, minute, second, weekday } = time
      //
      //
      const date = new Date(
        year,
        monthsValue - 1,
        day,
        hour, minute, second)

      // const plainDateTime = (typeof Temporal === 'undefined') ? undefined : Temporal.PlainDateTime.from({
      //     year,
      //     monthsValue,
      //     day,
      //     hour,
      //     minute,
      //     second
      // })

      console.log(time.integrity ? '👍' : '👎')
      console.log(date)
      console.log(`${weekday} ${month} ${day} ${year} - ${hour}:${minute}:${second}`)
    })

    return root
	}
}

