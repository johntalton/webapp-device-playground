
const defaultOptions = {
	low: 90,
	high: 127,
	periodMs: 3 * 1000,
	cache: [],
	signal: { aborted: false }
}

export class Waves {
	static async *sin(options) {
		const { low, high, periodMs, cache, signal } = { ...defaultOptions, ...options }
    console.log(low, high, periodMs, signal)

		const twoPi = 2 * Math.PI
		const range = high - low
		const w = twoPi / periodMs

		const bucketCount = 1000
		const bucketSizeMs = periodMs / bucketCount

		const foo = (mtime, cache) => {

			const bucket = Math.trunc(mtime / bucketSizeMs)

			if (cache === undefined || cache[bucket] === undefined) {
				const value = Math.trunc((((0.5 * Math.sin(w * mtime)) + 0.5) * range) + low + 0.5)
				if (cache !== undefined) { cache[bucket] = value }
				return value
			}
			return cache[bucket]
		}


		while (!signal.aborted) {
			const now = Date.now()
			const r = now % periodMs
			yield foo(r, cache)
		}
	}
}



// const controller = new AbortController()
// const { signal } = controller
// const w = Waves.sin({ signal })

// setTimeout(() => controller.abort('time is up'), 6000)

// for await (const v of w) {
//   await delayMs(200)
//   console.log(v)
// }

