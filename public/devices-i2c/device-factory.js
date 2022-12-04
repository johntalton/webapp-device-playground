
import { TCA9548Builder } from './tca9548a.js'
import { DS3502Builder } from './ds3502.js'
import { DS1841Builder } from './ds1841.js'
import { BoschIEUBuilder } from './boschieu.js'
import { SSD1306Builder } from './ssd1306.js'
import { PCA9536Builder} from './pca9536.js'
import { PCF8574Builder } from './pcf8574.js'
import { HT16K33Builder } from './ht16k33.js'

import {
	HT16K33_INFO,
	TCA9548_INFO,
	DS3502_INFO,
	DS1841_INFO,
	BOSCH_IEU_INFO,
	SSD1306_INFO,
	PCA_9536_INFO,
	PCF_8574_INFO
} from './guesses.js'


const BY_NAME = {
	[PCA_9536_INFO.name]: (definition, ui) => PCA9536Builder.builder(definition, ui),
	[TCA9548_INFO.name]: (definition, ui) => TCA9548Builder.builder(definition, ui),
	[DS3502_INFO.name]: (definition, ui) => DS3502Builder.builder(definition, ui),
	[BOSCH_IEU_INFO.name]: (definition, ui) => BoschIEUBuilder.builder(definition, ui),
	[SSD1306_INFO.name]: (definition, ui) => SSD1306Builder.builder(definition, ui),
	[PCF_8574_INFO.name]: (definition, ui) => PCF8574Builder.builder(definition, ui),
	[HT16K33_INFO.name]: (definition, ui) => HT16K33Builder.builder(definition, ui),
	[DS1841_INFO.name]: (definition, ui) => DS1841Builder.builder(definition, ui)
}

export class I2CDeviceBuilderFactory {
	static async from(definition, ui) {
		const { type } = definition

		const builderFn = BY_NAME[type]
		if(builderFn === undefined) { throw new Error('unknown i2c devcie type: ' + type) }

		return builderFn(definition, ui)
	}
}
