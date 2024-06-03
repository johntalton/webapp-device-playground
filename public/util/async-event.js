export function asyncEvent(cb) {
	return event => {
		Promise.resolve(cb(event))
			.catch(e => console.warn(e))
	}
}