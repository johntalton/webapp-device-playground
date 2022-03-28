
import { TCA9548Builder } from './tca9548a.js'
import { DS3502Builder } from './ds3502.js'
import { BoschIEUBuilder } from './boschieu.js'
import { SSD1306Builder } from './ssd1306.js'

import {
	TCA9548_INFO,
	DS3502_INFO,
	BOSCH_IEU_INFO,
	SSD1306_INFO
} from './guesses.js'


const BY_NAME = {
	[TCA9548_INFO.name]: (definition, ui) => TCA9548Builder.builder(definition, ui),
	[DS3502_INFO.name]: (definition, ui) => DS3502Builder.builder(definition, ui),
	[BOSCH_IEU_INFO.name]: (definition, ui) => BoschIEUBuilder.builder(definition, ui),
	[SSD1306_INFO.name]: (definition, ui) => SSD1306Builder.builder(definition, ui),
}

export class I2CDeviceBuilderFactory {
	static async from(definition, ui) {
		const { type } = definition

		const builderFn = BY_NAME[type]
		if(builderFn === undefined) { throw new Error('unknown i2c devcie type: ' + type) }

		return builderFn(definition, ui)
	}
}
