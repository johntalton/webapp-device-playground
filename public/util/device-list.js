export function appendDeviceListItem(deviceList, address, { acked = false, guesses = [] }) {
	const { content } = deviceList.querySelector(':scope > template')
	const sourceLi = content.querySelector('li')

	const li = sourceLi.cloneNode(true)
	const select = li.querySelector('select')
	const button = li.querySelector('button')
	const display = li.querySelector('hex-display')

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
