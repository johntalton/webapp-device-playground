import { hydrateEffects } from './hydrate/effects.js'
import { hydrateCustomElements } from './hydrate/elements.js'
import { hydrateHID } from './hydrate/hid.js'
import { hydrateSerial } from './hydrate/serial.js'
import { hydrateTheme } from './hydrate/theme.js'
import {
	hydrateUI,
	UI_HOOKS,
} from './hydrate/ui.js'
import { hydrateUSB } from './hydrate/usb.js'
import { hydrateWeb } from './hydrate/web.js'
import { DOMTokenListLike } from './util/dom-token-list.js';

async function onContentLoaded() {
	if (!HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) {
		console.error('importmap support not available')
	}

	const requestSerialButton = document.getElementById('requestSerial')
	const requestUSBButton = document.getElementById('requestUSB')
	const requestHIDButton = document.getElementById('requestHID')
	const requestWebButton = document.getElementById('requestWeb')

	const supportSerial = 'serial' in navigator
	const supportHID = 'hid' in navigator
	const supportUSB = 'usb' in navigator
	const supportWeb = true

	const supportAttr = document.body.getAttributeNode('data-supports')
	supportAttr.value = ''
	const dtl = new DOMTokenListLike(supportAttr)
	dtl.toggle('serial', supportSerial)
	dtl.toggle('hid', supportHID)
	dtl.toggle('usb', supportUSB)
	dtl.toggle('web', supportWeb)

	const dismissNoSupportButton = document.querySelector('button[name="dismissNoSupport"]')
	dismissNoSupportButton?.addEventListener('click', event => {
		event.preventDefault()
		const noSupportDialog = event.target.closest('[data-no-support]')
		noSupportDialog.toggleAttribute('data-dismissed')
	})

	await Promise.all([
		hydrateCustomElements(),
		hydrateUI(),

		supportWeb ? hydrateWeb(requestWebButton, UI_HOOKS) : null,
		supportSerial ? hydrateSerial(requestSerialButton, UI_HOOKS) : null,
		supportUSB ? hydrateUSB(requestUSBButton, UI_HOOKS) : null,
		supportHID ? hydrateHID(requestHIDButton, UI_HOOKS) : null,

		hydrateTheme(),
		hydrateEffects()
	])
	.catch(console.warn)
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded) :
	onContentLoaded()
