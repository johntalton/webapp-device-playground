
import { TCA9548Builder } from './tca9548a.js'
import { DS3502Builder } from './ds3502.js'
import { BoschIEUBuilder } from './boschieu.js'
import {
	TCA9548_INFO,
	DS3502_INFO,
	BOSCH_IEU_INFO,
	SSD1306_INFO
} from './guesses.js'

export class I2CDeviceBuilderFactory {
	static async from(definition, ui) {
		const { type } = definition

		if(type === TCA9548_INFO.name) {
			return TCA9548Builder.builder(definition, ui)
		}

		if(type === DS3502_INFO.name) {
			return DS3502Builder.builder(definition, ui)
		}

		if(type === BOSCH_IEU_INFO.name) {
			return BoschIEUBuilder.builder(definition, ui)
		}

		if(type === SSD1306_INFO.name) {
			return SSD1306Builder.builder(definition, ui)
		}


		throw new Error('unknown i2c devcie type: ' + type)
	}
}
