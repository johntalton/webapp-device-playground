console.log('Serial Worker')

onmessage = async message => {
	console.log('message', message)

	const ports = await navigator.serial.getPorts()
	console.log({ ports })

	postMessage({ reply: true })
}