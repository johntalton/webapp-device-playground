import { ST25DVUser, ST25DVSystem, I2C_SECURITY_STATUS, LENGTH_I2C_PASSWORD, IC_REFERENCE, UID_PRODUCT_CODE, UID_MANUFACTURE_CODE_ST } from '@johntalton/st25dv'
import { CapabilityContainer } from '@johntalton/st25dv/ndef'

import { bindTabRoot } from '../util/tabs.js'
import { asyncEvent } from '../util/async-event.js'
import { range } from '../util/range.js'
import { BasicBuilder } from './builder.js'
import { delayMs } from '../util/delay.js'

const UNIT_SUFFIX_US = 'µs'
const UNIT_SUFFIX_MS = 'ms'

const BASE_10 = 10

function round2(f) {
	return Math.trunc(f * 100) / 100
}

/** @extends {BasicBuilder<ST25DVUser>} */
export class ST25DVUserBuilder extends BasicBuilder {
	static async builder(definition, ui) {
		return new ST25DVUserBuilder(definition, ui)
	}

	constructor(definition, ui) {
		super('ST25DV User', 'st25dv-user', ST25DVUser, definition, ui)
	}

	async bindCustomView(root) {
		const refreshStatusButton = root.querySelector('button[command="--refresh-status"]')

		// status
		// i2c
		const i2cSecurityStatusOutput = root.querySelector('output[name="I2CSecurityStatus"]')
		// interruption
		const rfUserStatusOutput = root.querySelector('output[name="RFUserStatus"]')
		const rfActivityStatusOutput = root.querySelector('output[name="RFActivityStatus"]')
		const interruptStatusOutput = root.querySelector('output[name="InterruptStatus"]')
		const fieldFallingStatusOutput = root.querySelector('output[name="FieldFallingStatus"]')
		const fieldRisingStatusOutput = root.querySelector('output[name="FieldRisingStatus"]')
		const rfPutStatusOutput = root.querySelector('output[name="RFPutStatus"]')
		const rfGetStatusOutput = root.querySelector('output[name="RFGetStatus"]')
		const rfWriteStatusOutput = root.querySelector('output[name="RFWriteStatus"]')
		// mailbox
		const MailboxEnabledOutput = root.querySelector('output[name="MailboxEnabled"]')
		const HostPutMessageOutput = root.querySelector('output[name="HostPutMessage"]')
		const RFPutMessageOutput = root.querySelector('output[name="RFPutMessage"]')
		const HostMissedMessageOutput = root.querySelector('output[name="HostMissedMessage"]')
		const RFMissedMessageOutput = root.querySelector('output[name="RFMissedMessage"]')
		const CurrentRFOutput = root.querySelector('output[name="CurrentRF"]')
		const CurrentHostOutput = root.querySelector('output[name="CurrentHost"]')

		// configuration
		// rf management
		const rfDisabledCheckbox = root.querySelector('input[name="RFDisabled"]')
		const rfSleepCheckbox = root.querySelector('input[name="RFSleep"]')
		// energy harvesting
		const enableHarvestingCheckbox = root.querySelector('input[name="EnableHarvesting"]')
		const harvestingOnOutput = root.querySelector('output[name="harvestingOn"]')
		const FieldOnOutput = root.querySelector('output[name="FieldOn"]')
		const VccOnOutput = root.querySelector('output[name="VccOn"]')

		// interrupt
		const rfUserCheckbox = root.querySelector('input[name="RFUser"]')
		const rfActivityCheckbox = root.querySelector('input[name="RFActivity"]')
		const rfInterruptCheckbox = root.querySelector('input[name="RFInterrupt"]')
		const fieldChangeCheckbox = root.querySelector('input[name="FieldChange"]')
		const rfPutCheckbox = root.querySelector('input[name="RFPut"]')
		const rfGetCheckbox = root.querySelector('input[name="RFGet"]')
		const rfWriteCheckbox = root.querySelector('input[name="RFWrite"]')
		const gpoCheckbox = root.querySelector('input[name="GPO"]')



		const refreshInterrupt = async () => {
			const {
				rfUserEnabled,
				rfActivityEnabled,
				rfInterruptEnabled,
				fieldChangedEnabled,
				rfPutEnabled,
				rfGetEnabled,
				rfWriteEnabled,
				gpoEnabled
			} = await this.device.getGPO()

			rfUserCheckbox.checked = rfUserEnabled
			rfActivityCheckbox.checked = rfActivityEnabled
			rfInterruptCheckbox.checked = rfInterruptEnabled
			fieldChangeCheckbox.checked = fieldChangedEnabled
			rfPutCheckbox.checked = rfPutEnabled
			rfGetCheckbox.checked = rfGetEnabled
			rfWriteCheckbox.checked = rfWriteEnabled
			gpoCheckbox.checked = gpoEnabled
		}

		const refreshRFManagement = async () => {
			const {
				rfDisabled,
				rfSleep
			} = await this.device.getRFManagement()

			rfDisabledCheckbox.checked = rfDisabled
			rfSleepCheckbox.checked = rfSleep
		}

		const refreshEnergyHarvesting = async () => {
			const {
				enableHarvesting,
				harvestingOn,
				fieldOn,
				vccOn
			} = await this.device.getEnergyHarvestingControl()

			enableHarvestingCheckbox.checked = enableHarvesting

			harvestingOnOutput.value = harvestingOn ? 'Enabled' : 'Disabled'
			FieldOnOutput.value = fieldOn ? 'Present' : 'Not Detected'
			VccOnOutput.value = vccOn ? 'Present' : 'Not Detected'
		}

		const refreshConfiguration = async () => {
			await refreshEnergyHarvesting()
			await refreshRFManagement()
		}

		const _refreshInterruptStatus = async interruptionStatus => {
			const {
				rfUser,
				rfActivity,
				rfInterrupt,
				fieldFalling,
				fieldRising,
				rfPutMessage,
				rfGetMessage,
				rfWrite
			} = interruptionStatus

			rfUserStatusOutput.value = rfUser ? '🔔' : '(none)'
			rfActivityStatusOutput.value = rfActivity ? '🔔' : '(none)'
			interruptStatusOutput.value = rfInterrupt ? '🔔' : '(none)'
			fieldFallingStatusOutput.value = fieldFalling ? '🔔' : '(none)'
			fieldRisingStatusOutput.value = fieldRising ? '🔔' : '(none)'
			rfPutStatusOutput.value = rfPutMessage ? '🔔' : '(none)'
			rfGetStatusOutput.value = rfGetMessage ? '🔔' : '(none)'
			rfWriteStatusOutput.value = rfWrite ? '🔔' : '(none)'
		}

		const _refreshMailboxControl = async mailboxControl => {
			const {
				mailboxEnabled,
				hostPutMessage,
				rfPutMessage,
				hostMissedMessage,
				rfMissedMessage,
				currentFromRF,
				currentFromHost,
			} = mailboxControl

			MailboxEnabledOutput.value = mailboxEnabled ? 'true' : '(none)'
			HostPutMessageOutput.value = hostPutMessage ? 'true' : '(none)'
			RFPutMessageOutput.value = rfPutMessage ? 'true' : '(none)'
			HostMissedMessageOutput.value = hostMissedMessage ? 'true' : '(none)'
			RFMissedMessageOutput.value = rfMissedMessage ? 'true' : '(none)'
			CurrentRFOutput.value = currentFromRF ? 'true' : '(none)'
			CurrentHostOutput.value = currentFromHost ? 'true' : '(none)'
		}

		const refreshStatus = async () => {
			const {
				i2cSecurityStatus,
				interruptionStatus,
				mailboxControl,
				mailboxLength
			} = await this.device.getStatus()

			await _refreshInterruptStatus(interruptionStatus)
			await _refreshMailboxControl(mailboxControl)

			i2cSecurityStatusOutput.value = i2cSecurityStatus === I2C_SECURITY_STATUS.SESSION_OPEN ? 'Session Open' : 'Session Closed'
		}



		const refreshAll = async () => {
			await refreshConfiguration()
			await refreshInterrupt()
			await refreshStatus()
		}

		await refreshAll()


		refreshStatusButton.addEventListener('click', asyncEvent(async event => {
			await refreshStatus()
		}))


		// I2CAddress buffer 128
		// excamera i2cdriver 64
		// const area1 = await this.device.readMemory(0, 64)
		// console.log(area1)
		//CapabilityContainer.parse(area1)
		// console.log(...NDEF.parse(area1))

		const buffer = CapabilityContainer.encode({
			records: [
				// {
				// 	recordType: 'url',
				// 	data: 'https://github.com/johntalton/st25dv'
				// },
				{
					recordType: 'text',
					data: 'Now is the time for all good men to come to the aid ...'
				}
		]
  	})

		//console.log(buffer)

		// let offset = 0
		// const step = 60
		// while(offset < buffer.length) {
		// 	await this.device.writeMemory(offset, buffer.subarray(offset, offset + step))
		// 	offset += step
		// 	await delayMs(100)
		// }
		// await delayMs(1000)



		const part1ab = await this.device.readMemory(0, 64)
		const part1 = ArrayBuffer.isView(part1ab) ?
			new Uint8Array(part1ab.buffer, part1ab.byteOffset, 64) :
			new Uint8Array(part1ab, 0, 64)
		const part1clone = part1.slice(0)

		const part2ab = await this.device.readMemory(64, 64)
		const part2 = ArrayBuffer.isView(part2ab) ?
			new Uint8Array(part2ab.buffer, part2ab.byteOffset, 64) :
			new Uint8Array(part2ab, 0, 64)
		const part2clone = part2.slice(0)
		// const part3 = await this.device.readMemory(0, 64)
		// console.log(part1)
		// console.log(part3)

		const blob = new Blob([ part1clone, part2clone ])
		const result = await blob.arrayBuffer()

		console.log(result)
		const cc = CapabilityContainer.parse(result)
		console.log('CapabilityContainer')
		console.log('	read:', cc.read)
		console.log('	write:', cc.write)
		for(const record of cc.message.records) {
			console.log('	Record:')
			console.log('		id:', record.id)
			console.log('		recordType:', record.recordType)
			console.log('		mediaType:', record.mediaType)
			console.log('		lang', record.lang)
			console.log('		encoding', record.encoding)
			console.log('		data:', record.data)
		}

		bindTabRoot(root)
	}
}

/** @extends {BasicBuilder<ST25DVSystem>} */
export class ST25DVSystemBuilder extends BasicBuilder {
	static async builder(definition, ui) {
		return new ST25DVSystemBuilder(definition, ui)
	}

	constructor(definition, ui) {
		super('ST25DV System', 'st25dv-system', ST25DVSystem, definition, ui)
	}

	async bindCustomView(root) {
		// Info
		const dsfIdOutput = root.querySelector('output[name="DSFID"]')
		const afiOutput = root.querySelector('output[name="AFI"]')
		const memorySizeOutput = root.querySelector('output[name="MemorySize"]')
		const blockSizeOutput = root.querySelector('output[name="BlockSize"]')
		const icReferenceOutput = root.querySelector('output[name="ICReference"]')
		const uidOutput = root.querySelector('output[name="UID"]')
		const uidManufactureOutput = root.querySelector('output[name="UIDManufacture"]')
		const uidProductOutput = root.querySelector('output[name="UIDProduct"]')
		const revisionOutput = root.querySelector('output[name="Revision"]')

		// Interrupt
		const itTimeNumber = root.querySelector('input[name="itTime"]')
		const itTimeUsOutput = root.querySelector('output[name="itTimeUs"]')
		const rfUserCheckbox = root.querySelector('input[name="RFUser"]')
		const rfActivityCheckbox = root.querySelector('input[name="RFActivity"]')
		const rfInterruptCheckbox = root.querySelector('input[name="RFInterrupt"]')
		const fieldChangeCheckbox = root.querySelector('input[name="FieldChange"]')
		const rfPutCheckbox = root.querySelector('input[name="RFPut"]')
		const rfGetCheckbox = root.querySelector('input[name="RFGet"]')
		const rfWriteCheckbox = root.querySelector('input[name="RFWrite"]')
		const gpoCheckbox = root.querySelector('input[name="GPO"]')

		// configuration
		const energyHarvestingSelect = root.querySelector('select[name="EnergyHarvesting"]')
		const rfDisabledCheckbox = root.querySelector('input[name="RFDisabled"]')
		const rfSleepCheckbox = root.querySelector('input[name="RFSleep"]')
		const mailboxModeSelect = root.querySelector('select[name="MailboxMode"]')
		const watchdogNumber = root.querySelector('input[name="Watchdog"]')
		const watchdogMsOutput = root.querySelector('output[name="WatchdogMs"]')

		const CCFileBlock0Checkbox = root.querySelector('input[name="CCFileBlock0"]')
		const CCFileBlock1Checkbox = root.querySelector('input[name="CCFileBlock1"]')
		const lockConfigurationCheckbox = root.querySelector('input[name="LockConfiguration"]')
		const lockDSFICheckbox = root.querySelector('input[name="LockDSFI"]')
		const lockAFTCheckbox = root.querySelector('input[name="LockAFT"]')

		// password
		const formPassword = root.querySelector('form[data-password]')
		const passwordTextInput = root.querySelector('input[name="PasswordText"]')
		const passwordHEXOutput = root.querySelector('output[name="PasswordHEX"]')
		const password1Number = root.querySelector('input[name="PasswordByte1"]')
		const password2Number = root.querySelector('input[name="PasswordByte2"]')
		const password3Number = root.querySelector('input[name="PasswordByte3"]')
		const password4Number = root.querySelector('input[name="PasswordByte4"]')
		const password5Number = root.querySelector('input[name="PasswordByte5"]')
		const password6Number = root.querySelector('input[name="PasswordByte6"]')
		const password7Number = root.querySelector('input[name="PasswordByte7"]')
		const password8Number = root.querySelector('input[name="PasswordByte8"]')
		// password controls
		const presentPasswordButton = root.querySelector('button[command="--password-present"]')
		const setPasswordButton = root.querySelector('button[command="--password-set"]')


		const refreshInfo = async () => {
			const {
				dsfId,
				afi,
				memorySize,
				blockSize,
				icReference,
				uid,
				icRevision
			} = await this.device.getInfo()

			const { product, manufacture } = uid

			const manufactureName = manufacture === UID_MANUFACTURE_CODE_ST ? 'ST Microelectronics' : '(unknown)'

			const products = Object.entries(UID_PRODUCT_CODE)
				.filter(([ _, v ]) => v === product)
				.map(([ k, _]) => k)
				.join(' / ')

			const references = Object.entries(IC_REFERENCE)
				.filter(([ _, v ]) => v === icReference)
				.map(([ k, _ ]) => k)
				.join(' / ')

			const memorySizeKb = (memorySize + 1) * (blockSize + 1) * 8 / 1024

			dsfIdOutput.value = dsfId
			afiOutput.value = afi
			memorySizeOutput.value = `${memorySizeKb} Kb (${memorySize + 1} RF Blocks)`
			blockSizeOutput.value = blockSize + 1
			icReferenceOutput.value = `0x${icReference.toString(16).toUpperCase().padStart(2, '0')} (${references})`
			uidOutput.value = uid.uid.map(v => '0x' + v.toString(16).toUpperCase().padStart(2, '0')).join(' ')
			uidManufactureOutput.value = manufactureName
			uidProductOutput.value = products
			revisionOutput.value = icRevision
		}

		const refreshArea = async () => {
			const areas = await this.device.getAreas()
			console.log(areas)
		}

		const refreshInterrupt = async () => {
			const { IT_TIME, interruptionTimeUs } = await this.device.getInterruptionTime()

			const {
				rfUserEnabled,
				rfActivityEnabled,
				rfInterruptEnabled,
				fieldChangedEnabled,
				rfPutEnabled,
				rfGetEnabled,
				rfWriteEnabled,
				gpoEnabled
			} = await this.device.getGPO()

			itTimeNumber.value = IT_TIME
			itTimeUsOutput.value = `${round2(interruptionTimeUs)} ${UNIT_SUFFIX_US}`

			rfUserCheckbox.checked = rfUserEnabled
			rfActivityCheckbox.checked = rfActivityEnabled
			rfInterruptCheckbox.checked = rfInterruptEnabled
			fieldChangeCheckbox.checked = fieldChangedEnabled
			rfPutCheckbox.checked = rfPutEnabled
			rfGetCheckbox.checked = rfGetEnabled
			rfWriteCheckbox.checked = rfWriteEnabled
			gpoCheckbox.checked = gpoEnabled
		}

		const refreshConfiguration = async () => {
			const energyHarvestingMode = await this.device.getEnergyHarvestingMode()
			const { rfDisabled, rfSleep } = await this.device.getRFManagement()
			const mailboxMode = await this.device.getMailboxMode()
			const { MB_WDG, watchDogMs } = await this.device.getMailboxWatchdog()

			energyHarvestingSelect.value = energyHarvestingMode
			rfDisabledCheckbox.checked = rfDisabled
			rfSleepCheckbox.checked = rfSleep
			mailboxModeSelect.value = mailboxMode
			watchdogNumber.value = MB_WDG
			watchdogMsOutput.value = `${watchDogMs} ${UNIT_SUFFIX_MS}`
		}

		const refreshLocks = async () => {
			const { block0Locked, block1Locked } = await this.device.getLockCCFile()
			const LockConfiguration = await this.device.getLockConfiguration()
			const LockDSFID = await this.device.getLockDSFID()
			const LockAFI = await this.device.getLockAFI()

			CCFileBlock0Checkbox.checked = block0Locked
			CCFileBlock1Checkbox.checked = block1Locked
			lockConfigurationCheckbox.checked = LockConfiguration
			lockDSFICheckbox.checked = LockDSFID
			lockAFTCheckbox.checked = LockAFI
		}

		const _refreshPasswordHEX = password => {
			passwordHEXOutput.value = password.map(c => '0x' + c.toString(16).toUpperCase().padStart(2, '0')).join(' ')
		}

		const _refreshPasswordText = password => {
			try {
				const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
				const passwordText = decoder.decode(Uint8Array.of(...password))

				passwordTextInput.setCustomValidity('')
				passwordTextInput.reportValidity()

				passwordTextInput.value = passwordText
			}
			catch(e) {
				if(passwordTextInput.validity.valid) {
					passwordTextInput.setCustomValidity('invalid utf-8 string')
					passwordTextInput.reportValidity()
				}
				else { console.warn('invalid utf-8 string, again') }
			}
		}

		const _refreshPasswordBytes = password => {
			const [ b1, b2, b3, b4, b5, b6, b7, b8 ] = password
			password1Number.value = b1
			password2Number.value = b2
			password3Number.value = b3
			password4Number.value = b4
			password5Number.value = b5
			password6Number.value = b6
			password7Number.value = b7
			password8Number.value = b8
		}

		const refreshPassword = async () => {
			const password = await this.device.getI2CPassword()

			_refreshPasswordText(password)
			_refreshPasswordHEX(password)
			_refreshPasswordBytes(password)
		}

		const refreshAll = async () => {
			await refreshInfo()
			await refreshConfiguration()
			await refreshLocks()
			await refreshInterrupt()
			await refreshArea()
			await refreshPassword()
		}

		await refreshAll()


		const _passwordFromNumbers = () => {
			return [
				parseInt(password1Number.value, BASE_10),
				parseInt(password2Number.value, BASE_10),
				parseInt(password3Number.value, BASE_10),
				parseInt(password4Number.value, BASE_10),
				parseInt(password5Number.value, BASE_10),
				parseInt(password6Number.value, BASE_10),
				parseInt(password7Number.value, BASE_10),
				parseInt(password8Number.value, BASE_10)
			]
		}

		passwordTextInput.addEventListener('input', asyncEvent(async event => {
			const encoder = new TextEncoder()
			const u8 = encoder.encode(passwordTextInput.value)

			if(u8.byteLength > LENGTH_I2C_PASSWORD) {
				console.warn('too long', u8)
				passwordTextInput.setCustomValidity('exceed maximum byte length')
				passwordTextInput.reportValidity()
				event.preventDefault()
				return
			}

			passwordTextInput.setCustomValidity('')
			passwordTextInput.reportValidity()

			const offset = LENGTH_I2C_PASSWORD - u8.byteLength
			const padding = new Array(offset).fill(0)
			const password = padding.concat(...u8)

			_refreshPasswordHEX(password)
			_refreshPasswordBytes(password)
		}))

		formPassword.addEventListener('change', asyncEvent(async event => {
			const password = _passwordFromNumbers()

			_refreshPasswordHEX(password)
			_refreshPasswordText(password)
		}))

		presentPasswordButton.addEventListener('click', asyncEvent(async event => {
			const password = _passwordFromNumbers()
			console.log('presenting password', password)
			await this.device.setI2CPassword(password, true)
		}))

		setPasswordButton.addEventListener('click', asyncEvent(async event => {
			const password = _passwordFromNumbers()
			console.log('setting password', password)
			await this.device.setI2CPassword(password)
		}))



		bindTabRoot(root)
	}
}


