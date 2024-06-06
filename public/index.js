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

async function onContentLoaded() {
	if (!HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) {
		console.error('importmap support not available')
	}

	const requestSerialButton = document.getElementById('requestSerial')
	const requestUSBButton = document.getElementById('requestUSB')
	const requestHIDButton = document.getElementById('requestHID')

	await Promise.all([
		hydrateCustomElements(),
		hydrateUI(),

		hydrateSerial(requestSerialButton, UI_HOOKS),
		hydrateUSB(requestUSBButton, UI_HOOKS),
		hydrateHID(requestHIDButton, UI_HOOKS),

		hydrateTheme(),
		hydrateEffects()
	])
	.catch(console.warn)
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded) :
	onContentLoaded()
