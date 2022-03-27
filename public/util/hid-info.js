

export function dumpHIDDevice(hid) {
	console.log('name:', hid.productName)
	console.log('vendor: ',hid.vendorId, 'product:', hid.productId)
	console.log('state:', hid.opened ? 'open' : 'closed')

	hid.collections.forEach(collection => {
		const {
			usagePage, usage, type,
			inputReports, outputReports, featureReports
		} = collection

		console.log('usagePage:', usagePage.toString(16), 'usage:', usage, 'type:', type)

		for(const ir of inputReports) {
			console.log('input report:', ir)
		}

		for(const or of outputReports) {
			console.log('output report:', or)
		}

		for(const fr of featureReports) {
			console.log('feature report', fr)
		}
	})

}