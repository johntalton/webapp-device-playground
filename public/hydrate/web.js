
export function hydrateWeb(requestWebButton, ui) {

	// hydrate button
	requestWebButton.disabled = false
	requestWebButton.addEventListener('click', event => {
		ui.addWebDevice()
	})
}