
export async function hydrateTheme() {
	const THEME_NAMES = [
		'Crazy', 'Water', 'Slate', 'Paper', 'TodaysBlue',
		'DeepOcean', 'Dream', 'Golden', 'Lavender', 'Bright', 'Plum',
		'MoodyPlum', 'Washed', "NuLight", "NuDark", "Corp"
	]

	const themRollerButton = document.querySelector('button[data-theme-roller]')
	themRollerButton?.addEventListener('click', event => {
		event.preventDefault()

		const theme = THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)]

		themRollerButton.setAttribute('title', theme)

		if (!document.startViewTransition) {
			document.body.setAttribute('data-theme', theme)
		}
		else {
			const transition = document.startViewTransition(() => {
				document.body.setAttribute('data-theme', theme)
			})
		}
	})
}