
/**
 * @param {HTMLElement} deviceList
 * @param {number} address
 * @param {{ acked: boolean, guesses: Array<{ name: string }>}} options
 * @returns {{ li: HTMLLIElement, select: HTMLSelectElement, button: HTMLButtonElement, display: HTMLElement }}
 */
export function appendDeviceListItem(deviceList, address, { acked = false, guesses = [] }) {
	const { content } = deviceList.querySelector(':scope > template')
	const sourceLi = content.querySelector('li')

	/** @type {HTMLLIElement } */
	const li = sourceLi.cloneNode(true)
	const select = li.querySelector('select')
	const button = li.querySelector('button')
	const display = li.querySelector('hex-display')

	if(!(select instanceof HTMLSelectElement)) { throw new Error('missing element') }
	if(!(button instanceof HTMLButtonElement)) { throw new Error('missing element') }
	if(!(display instanceof HTMLElement)) { throw new Error('missing element') }

	display.textContent = `0x${address.toString(16).padStart(2, '0')}`

	button.disabled = (guesses.length === 0)

	li.toggleAttribute('data-acked', acked)

	select.disabled = (guesses.length <= 1)

	select.append(...guesses.map(({ name }) => {
		const option = document.createElement('option')
		option.value = name
		option.textContent = name
		return option
	}))

	deviceList.append(li)

	return { li, select, button, display }
}
