
export class Lemming {
	static limit(opaqueID, options) {
		const { store, durationMs, total } = options

		const now = Date.now()

		// get cache by id
		const profile = store.get(opaqueID) ?? {
			remaining: total,
			refreshAtMs: now + durationMs
		}

		if(now > profile.refreshAtMs) {
			// top off
			profile.remaining = total
			profile.refreshAtMs = now + durationMs
		}

		// reduce remaining count
		profile.remaining = Math.max(profile.remaining - 1, -1)

		//
		const ok = (profile.remaining >= 0)

		// cache for id
		store.set(opaqueID, profile)

		// limited
		return {
			ok,
			limit: total,
			resetMs: profile.refreshAtMs,
			remaining: profile.remaining,
			retryAfterMs: (profile.refreshAtMs - Date.now())
		}
	}
}


const store = new Map()
const options =  { store, durationMs: 200, total: 2 }

const script = [
	{ id: 42 },
	{ ms: 100, id: 42 },
	{ ms: 90, id: 42 },
	{ ms: 50, id: 42 },
	{ ms: 50, id: 42 },
]

const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

for await (const entry of script) {
	const { ms, id } = entry

	if(ms) { await delayMs(ms) }

	const result = Lemming.limit(id, options)
	const { remaining, retryAfterMs, ok } = result

	if(!ok) {
		console.log('... limited', retryAfterMs)
		//delayMs(retryAfterMs)
	} else {
		console.log('...', remaining)
	}


}