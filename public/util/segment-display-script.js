function once(stack, type, options) {
	return {
		...script([ ...stack, {
			type,
			...options
		}])
	}
}

function forSeconds(stack, type, options) {
	return {
		...script([ ...stack, {
			type,
			...options
		}])
	}
}


function forDuration(stack, type, options) {
	return {
		once: () => once(stack, type, {
			...options
		}),
		forSeconds: seconds => forSeconds(stack, type, {
			...options,
			seconds
		}),
		forMinutes: minutes => forSeconds(stack, type, {
			...options,
			seconds: minutes * 60
		})
	}
}


function script(stack) {
	return {
		flash: fourLetters => forDuration(stack, 'flash', {
			fourLetters
		}),
		scroll: text => ({
			slow: () => forDuration(stack, 'scroll', {
				rate: 'slow',
				text
			}),
			...forDuration(stack, 'scroll', {
				rate: 'normal',
				text
			})
		}),
		from: label => ({
			...script([ ...stack, {
				type: 'label',
				label,
			}])
		}),
		repeat: label => [ ...stack, {
			type: 'repeat',
			label
		}],
		display: fourLetters => forDuration(stack, 'display', {
			fourLetters
		}),
		time: () => forDuration(stack, 'time', {
		}),
		end: () => [ ...stack, {
			type: 'end'
		}]
	}
}


export const segmentDisplayScript = () => script([])
