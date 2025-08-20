import { DOMTokenListLike } from '../util/dom-token-list.js'

export async function hydrateTheme() {
	const THEME_NAMES = [
		'Crazy', 'Water', 'Slate', 'Paper', 'TodaysBlue',
		'DeepOcean', 'Dream', 'Golden', 'Lavender', 'Bright', 'Plum',
		'MoodyPlum', 'Washed', "NuLight", "NuDark", "Corp", 'Air'
	]
	const GOOD_THEME_NAMES = [
		'Air', 'DeepOcean', 'NuDark', 'Corp'
	]

	const themRollerButton = document.querySelector('button[data-theme-roller]')
	themRollerButton?.addEventListener('click', event => {
		event.preventDefault()

		//const dtl = new DOMTokenListLike(document.body.getAttributeNode('data-theme'))

		if(event.shiftKey) {
			const secondSpan = themRollerButton.querySelector('span:last-child')
			const currentScheme = document.body.dataset.scheme

			const nextScheme = currentScheme === 'Light' ? 'Dark' : currentScheme == 'Dark' ? '' : 'Light'
			secondSpan.textContent = nextScheme

			if (!document.startViewTransition) {
				document.body.setAttribute('data-scheme', nextScheme)
			}
			else {
				const transition = document.startViewTransition(() => {
					document.body.setAttribute('data-scheme', nextScheme)
				})
			}

			return
		}

		const theme = GOOD_THEME_NAMES[Math.floor(Math.random() * GOOD_THEME_NAMES.length)]

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