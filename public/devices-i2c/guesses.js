import { range } from '../util/range.js'

export const AGS02MA_INFO = {
	addresses: [ 0x1A, /*...range(0x08, 0x77)*/ ], name: 'ags02ma'
}

export const ADT7410_INFO = {
	addresses: [ ...range(0x48, 0x4b) ], name: 'adt7410'
}

export const HT16K33_INFO = {
	addresses: [ ...range(0x70, 0x77) ], name: 'ht16k33'
}

export const TCA9548_INFO = {
	addresses: [ ...range(0x70, 0x77) ], name: 'tca9548a (Multiplexer)'
}

export const DS3502_INFO = {
	addresses: [ ...range(0x28, 0x2b) ], name: 'ds3502 (Pot)'
}

export const DS1841_INFO = {
	addresses: [ ...range(0x28, 0x2b) ], name: 'ds1841 (Pot)'
}

export const BOSCH_IEU_INFO = {
	addresses: [ 0x76, 0x77 ], name: 'boschIEU'
}

export const BNO_08X_INFO = {
	addresses: [ 0x4a, 0x4b ], name: 'bno085'
}

export const SSD1306_INFO = {
	addresses: [ 0x3c, 0x3d ], name: 'ssd1306'
}

export const PCA_9536_INFO = {
	addresses: [ 0x41 ], name: 'pca9536 (4-pin gpio)'
}

export const PCF_8574_INFO = {
	addresses: [ 0x20, 0x21 ], name: 'pcf8574 (Gpio)'
}

export const PCF_8523_INFO = {
	addresses: [ 0x68 ], name: 'pcf8523 (RTC)'
}

export const TCS_34725_INFO = {
	addresses: [ 0x29 ], name: 'tcs34725 (RGB Light)'
}

export const TSL2591_INFO = {
	addresses: [ 0x29 ], name: 'tsl2591 (Light)'
}

export const MCP23_INFO = {
	addresses: [ ...range(0x20, 0x27) ], name: 'mcp230xx (Gpio)'
}

export const EEPROM_INFO = {
	addresses: [ ...range(0x50, 0x57) ], name: 'Generic EEPROM'
}

export const ADXL375_INFO = {
	addresses: [ 0x53 ], name: 'ADXL375 (Accelerometer)'
}

export const DS3231_INFO = {
	addresses: [ 0x68 ], name: 'DS3231 (RTC)'
}

export const AHT20_INFO = { addresses: [ 0x38 ], name: 'AHT20' }

export const DRV2605_INFO = { addresses: [ 0x5a ], name: 'DRV2605' }

export const AW9523_INFO = { addresses: [ 0x58 ], name: 'AW9523 (LED/GPIO)' }


export const ST25DV_USER_INFO = { addresses: [ 0x53 ], name: 'st25dv16k-user' }
export const ST25DV_SYSTEM_INFO = { addresses: [ 0x57 ], name: 'st25dv16k-system' }

export const SI5351_INFO = { addresses: [ 0x60 ], name: 'SI5351 Clock' }


export const I2C_GUESSES = [
	// 0x00
	// 0x10
	{ addresses: [ ...range(0x18, 0x1F) ], name: 'mcp9808' },
	// 0x20
	PCF_8574_INFO,
	MCP23_INFO,
	DS1841_INFO,
	DS3502_INFO,
	ST25DV_USER_INFO,
	ST25DV_SYSTEM_INFO,
	TCS_34725_INFO,
	// 0x30
	{ addresses: [ 0x30 ], name: 'Trust M' },
	SSD1306_INFO,
	{ addresses: [ 0x3c, 0x3d ], name: 'adxl375' },
	AHT20_INFO,
	// 0x40
	PCA_9536_INFO,
	{ addresses: [ ...range(0x48, 0x4b) ], name: 'ads1115' },
	BNO_08X_INFO,
	{ addresses: [ ...range(0x40,  0x4f), ], name: 'ina219' },
	// 0x50
	ADXL375_INFO,
	{ addresses: [ 0x5c ], name: 'am2320' },
	{ addresses: [ 0x5c ], name: 'am2315' },
	AW9523_INFO,
	EEPROM_INFO,
	{ addresses: [ ...range(0x50, 0x57) ], name: 'Adafruit 24LC32' },
	{ addresses: [ ...range(0x50, 0x57) ], name: 'mb85rc' },
	// 0x60
	SI5351_INFO,
	{ addresses: [ 0x62, 0x63 ], name: 'mcp4725a1'},
	DS3231_INFO,
	PCF_8523_INFO,
	// 0x70
	TCA9548_INFO,
	TSL2591_INFO,
	BOSCH_IEU_INFO,
	HT16K33_INFO,
	ADT7410_INFO,
	AGS02MA_INFO,
	DRV2605_INFO
]

export function deviceGuessByAddress(address) {
	return I2C_GUESSES
		.sort((a, b) => a.addresses.length < b.addresses.length ? -1 : 1)
		.filter(item => item.addresses.includes(address))
}