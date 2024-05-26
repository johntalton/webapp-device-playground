export function* range(start, end, step = 1) {
	yield start
	if (start >= end) return
	yield* range(start + step, end, step)
}
