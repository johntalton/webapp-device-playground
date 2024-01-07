
import { TCA9548Builder } from './tca9548a.js'
import { DS3502Builder } from './ds3502.js'
import { DS1841Builder } from './ds1841.js'
import { BoschIEUBuilder } from './boschieu.js'
// import { BNO08XBuilder } from './bno08x.js'
// import { SSD1306Builder } from './ssd1306.js'
// import { PCA9536Builder} from './pca9536.js'
import { PCF8574Builder } from './pcf8574.js'
import { PCF8523Builder } from './pcf8523.js'
import { HT16K33Builder } from './ht16k33.js'
import { ADT7410Builder } from './adt7410.js'
import { AGS02MABuilder } from './ags02ma.js'
import { TCS34725Builder } from './tcs34725.js'
import { MCP23Builder } from './mcp23.js'
import { EEPROMBuilder } from './eeprom.js'
import { ADXL375Builder } from './adxl375.js'
import { AHT20Builder } from './aht20.js'

import {
	HT16K33_INFO,
	TCA9548_INFO,
	DS3502_INFO,
	DS1841_INFO,
	BOSCH_IEU_INFO,
	BNO_08X_INFO,
	SSD1306_INFO,
	PCA_9536_INFO,
	PCF_8574_INFO,
	PCF_8523_INFO,
	ADT7410_INFO,
	AGS02MA_INFO,
	TCS_34725_INFO,
	MCP23_INFO,
	EEPROM_INFO,
	ADXL375_INFO,
	AHT20_INFO
} from './guesses.js'

const BY_NAME = {
	'Adafruit 24LC32':  (definition, ui) => EEPROMBuilder.builder(definition, ui),
	// [PCA_9536_INFO.name]: (definition, ui) => PCA9536Builder.builder(definition, ui),
	[TCA9548_INFO.name]: (definition, ui) => TCA9548Builder.builder(definition, ui),
	[DS3502_INFO.name]: (definition, ui) => DS3502Builder.builder(definition, ui),
	[BOSCH_IEU_INFO.name]: (definition, ui) => BoschIEUBuilder.builder(definition, ui),
	// [BNO_08X_INFO.name]: (definition, ui) => BNO08XBuilder.builder(definition, ui),
	// [SSD1306_INFO.name]: (definition, ui) => SSD1306Builder.builder(definition, ui),
	[PCF_8574_INFO.name]: (definition, ui) => PCF8574Builder.builder(definition, ui),
	[PCF_8523_INFO.name]: (definition, ui) => PCF8523Builder.builder(definition, ui),
	[HT16K33_INFO.name]: (definition, ui) => HT16K33Builder.builder(definition, ui),
	[DS1841_INFO.name]: (definition, ui) => DS1841Builder.builder(definition, ui),
	[ADT7410_INFO.name]: (definition, ui) => ADT7410Builder.builder(definition, ui),
	[AGS02MA_INFO.name]: (definition, ui) => AGS02MABuilder.builder(definition, ui),
	[TCS_34725_INFO.name]: (definition, ui) => TCS34725Builder.builder(definition, ui),
	[MCP23_INFO.name]: (definition, ui) => MCP23Builder.builder(definition, ui),
	[EEPROM_INFO.name]: (definition, ui) => EEPROMBuilder.builder(definition, ui),
	[ADXL375_INFO.name]: (definition, ui) => ADXL375Builder.builder(definition, ui),
	[AHT20_INFO.name]: (definition, ui) => AHT20Builder.builder(definition, ui),
}

export class I2CDeviceBuilderFactory {
	static async from(definition, ui) {
		const { type } = definition

		const builderFn = BY_NAME[type]
		if(builderFn === undefined) { throw new Error('unknown i2c device type: ' + type) }

		return builderFn(definition, ui)
	}
}
