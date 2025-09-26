// without tail-recursion this version is limited
// export function* range(start, end, step = 1) {
// 	yield start
// 	if (start >= end) return
// 	yield* range(start + step, end, step)
// }

/**
 * @param {number} start
 * @param {number} end
 * @param {number} [step=1]
 */
export function* range(start, end, step = 1) {
	for(let i = start; i <= end; i += step) {
		yield i
	}
}