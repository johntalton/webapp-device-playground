"use strict";

import { hydrateSerial } from './hydrate/serial.js'
import { hydrateUSB } from './hydrate/usb.js'
import { hydrateHID } from './hydrate/hid.js'
import { hydrateCustomElements } from './hydrate/elements.js'
import { hydrateEffects } from './hydrate/effects.js'
import {
	UI_HOOKS,
	hydrateUI
} from './hydrate/ui.js'
import { hydrateTheme } from './hydrate/theme.js'
import { DOMTokenListLike } from './util/dom-token-list.js';

async function onContentLoaded() {
	if (!HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) {
		console.error('importmap support not available')
	}

	const requestSerialButton = document.getElementById('requestSerial')
	const requestUSBButton = document.getElementById('requestUSB')
	const requestHIDButton = document.getElementById('requestHID')

	const supportSerial = 'serial' in navigator
	const supportHID = 'hid' in navigator
	const supportUSB = 'usb' in navigator

	const supportAttr = document.body.getAttributeNode('data-supports')
	supportAttr.value = ''
	const dtl = new DOMTokenListLike(supportAttr)
	dtl.toggle('serial', supportSerial)
	dtl.toggle('hid', supportHID)
	dtl.toggle('usb', supportUSB)

	const dismissNoSupportButton = document.querySelector('button[name="dismissNoSupport"]')
	dismissNoSupportButton?.addEventListener('click', event => {
		event.preventDefault()
		const noSupportDialog = event.target.closest('[data-no-support]')
		noSupportDialog.toggleAttribute('data-dismissed')
	})

	await Promise.all([
		hydrateCustomElements(),
		hydrateUI(),

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
