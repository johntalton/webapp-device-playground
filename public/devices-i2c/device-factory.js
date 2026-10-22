/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */

import { ADT7410Builder } from './adt7410.js'
import { ADXL375Builder } from './adxl375.js'
// import { AGS02MABuilder } from './ags02ma.js'
import { AHT20Builder } from './aht20.js'
import { AW9523Builder } from './aw9523.js'
// import { BNO08XBuilder } from './bno08x.js'
import { BoschIEUBuilder } from './boschieu.js'
import { DRV2605Builder } from './drv2605.js'
import { DS1841Builder } from './ds1841.js'
import { DS3231Builder } from './ds3231.js'
import { DS3502Builder } from './ds3502.js'
import { EEPROMBuilder } from './eeprom.js'
import { HT16K33Builder } from './ht16k33.js'
import { MCP23Builder } from './mcp23.js'
import { PCA9536Builder} from './pca9536.js'
import { PCF8523Builder } from './pcf8523.js'
import { PCF8574Builder } from './pcf8574.js'
import { SI5351Builder } from './si5351.js'
import { SSD1306Builder } from './ssd1306.js'
import { ST25DVSystemBuilder, ST25DVUserBuilder } from './st25dv.js'
import { TCA9548Builder } from './tca9548a.js'
import { TSL2591Builder } from './tsl2591.js'
// import { TCS34725Builder } from './tcs34725.js'

import {
	ADT7410_INFO,
	ADXL375_INFO,
	// AGS02MA_INFO,
	AHT20_INFO,
	AW9523_INFO,
	// BNO_08X_INFO,
	BOSCH_IEU_INFO,
	DRV2605_INFO,
	DS1841_INFO,
	DS3231_INFO,
	DS3502_INFO,
	EEPROM_INFO,
	HT16K33_INFO,
	MCP23_INFO,
	PCA_9536_INFO,
	PCF_8523_INFO,
	PCF_8574_INFO,
	SI5351_INFO,
	SSD1306_INFO,
	ST25DV_SYSTEM_INFO,
	ST25DV_USER_INFO,
	TCA9548_INFO,
	// TCS_34725_INFO,
	TSL2591_INFO
} from './guesses.js'

/** @import { I2CBus, I2CAddress } from '@johntalton/and-other-delights' */

/**
 * @typedef {Object} I2CDefinition
 * @property {string} type
 * @property {I2CBus} bus
 * @property {I2CAddress} address
 * @property {MessagePort} port
 * @property {AbortSignal} signal
 */

/**
 * @typedef {{ type: string }} DefinitionWithType
 */

/**
 * @typedef {() => void} Builder
 */

/**
 * @template U
 * @typedef {(definition: I2CDefinition, ui: U) => Promise<Builder>} BuilderFn
 */

/**
 * @template U
 * @typedef {Record<string, BuilderFn<U>>} ByNameLookupTable
 */


/**
 * @template U
 * @type {ByNameLookupTable<U>}
 */
const BY_NAME = {
	'Adafruit 24LC32':  (definition, ui) => EEPROMBuilder.builder(definition, ui),
	[PCA_9536_INFO.name]: (definition, ui) => PCA9536Builder.builder(definition, ui),
	[TCA9548_INFO.name]: (definition, ui) => TCA9548Builder.builder(definition, ui),
	[DS3502_INFO.name]: (definition, ui) => DS3502Builder.builder(definition, ui),
	[BOSCH_IEU_INFO.name]: (definition, ui) => BoschIEUBuilder.builder(definition, ui),
	// [BNO_08X_INFO.name]: (definition, ui) => BNO08XBuilder.builder(definition, ui),
	[SSD1306_INFO.name]: (definition, ui) => SSD1306Builder.builder(definition, ui),
	[PCF_8574_INFO.name]: (definition, ui) => PCF8574Builder.builder(definition, ui),
	[PCF_8523_INFO.name]: (definition, ui) => PCF8523Builder.builder(definition, ui),
	[HT16K33_INFO.name]: (definition, ui) => HT16K33Builder.builder(definition, ui),
	[DS1841_INFO.name]: (definition, ui) => DS1841Builder.builder(definition, ui),
	[ADT7410_INFO.name]: (definition, ui) => ADT7410Builder.builder(definition, ui),
	// [AGS02MA_INFO.name]: (definition, ui) => AGS02MABuilder.builder(definition, ui),
	// [TCS_34725_INFO.name]: (definition, ui) => TCS34725Builder.builder(definition, ui),
	[MCP23_INFO.name]: (definition, ui) => MCP23Builder.builder(definition, ui),
	[EEPROM_INFO.name]: (definition, ui) => EEPROMBuilder.builder(definition, ui),
	[ADXL375_INFO.name]: (definition, ui) => ADXL375Builder.builder(definition, ui),
	[AHT20_INFO.name]: (definition, ui) => AHT20Builder.builder(definition, ui),
	[DRV2605_INFO.name]: (definition, ui) => DRV2605Builder.builder(definition, ui),
	[DS3231_INFO.name]: (definition, ui) => DS3231Builder.builder(definition, ui),
	[TSL2591_INFO.name]: (definition, ui) => TSL2591Builder.builder(definition, ui),
	[AW9523_INFO.name]: (definition, ui) => AW9523Builder.builder(definition, ui),

	[ST25DV_USER_INFO.name]: (definition, ui) => ST25DVUserBuilder.builder(definition, ui),
	[ST25DV_SYSTEM_INFO.name]: (definition, ui) => ST25DVSystemBuilder.builder(definition, ui),

	[SI5351_INFO.name]: (definition, ui) => SI5351Builder.builder(definition, ui),
}

export class I2CDeviceBuilderFactory {

	/**
	 * @template U
	 * @param {I2CDefinition} definition
	 * @param {U} ui
	 */
	static async from(definition, ui) {
		const { type } = definition

		const builderFn = BY_NAME[type]
		if(builderFn === undefined) { throw new Error(`unknown i2c device type: ${type}`) }

		return builderFn(definition, ui)
	}
}
