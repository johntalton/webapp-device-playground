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

		const current = document.body.getAttribute('data-theme')
		const themeList = GOOD_THEME_NAMES.filter(t => t !== current)
		const theme = themeList[Math.floor(Math.random() * themeList.length)]

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