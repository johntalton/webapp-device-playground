export async function hydrateEffects() {
	return
	setInterval(() => {
		const root = document.querySelector(':root')
		console.log(root.style)
		// const currentStr = root.style.getPropertyValue('--color-accent--h')

		// console.log({ currentStr })
		// const current = currentStr === '' ? 180 : parseInt(currentStr)
		// const next = (current === NaN ? 180 : current) + ((Math.random() > 0.5) ? -20 : 30)

		const next = Math.trunc(Math.random() * 360)

		root.style.setProperty('--color-accent--h', next)
	}, 1000 * 7)
}
