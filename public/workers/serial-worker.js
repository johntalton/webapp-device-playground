// console.log('Serial Worker')

function scan() {

}



onmessage = async message => {
	console.log('message', message)

	const ports = await navigator.serial.getPorts()
	console.log({ ports })

	postMessage({ reply: true })
}

