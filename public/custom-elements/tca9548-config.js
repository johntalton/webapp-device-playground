
export class TCA9548ConfigElement extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		const { content } = TCA9548ConfigElement.template
		this.shadowRoot.appendChild(content.cloneNode(true))
	}

  connectedCallback() {

    const fieldSet = this.shadowRoot.getElementById('channels')
    console.log('attached', fieldSet)

    fieldSet.addEventListener('change', e => {

      fieldSet.disable = true

      const chElems = {
        ch0: this.shadowRoot.getElementById('ch0'),
        ch1: this.shadowRoot.getElementById('ch1'),
        ch2: this.shadowRoot.getElementById('ch2'),
        ch3: this.shadowRoot.getElementById('ch3'),
        ch4: this.shadowRoot.getElementById('ch4'),
        ch5: this.shadowRoot.getElementById('ch5'),
        ch6: this.shadowRoot.getElementById('ch6'),
        ch7: this.shadowRoot.getElementById('ch7'),
      }

      const channelsToSet = [
        chElems.ch0.checked === true ? 0 : undefined,
        chElems.ch1.checked === true ? 1 : undefined,
        chElems.ch2.checked === true ? 2 : undefined,
        chElems.ch3.checked === true ? 3 : undefined,
        chElems.ch4.checked === true ? 4 : undefined,
        chElems.ch5.checked === true ? 5 : undefined,
        chElems.ch6.checked === true ? 6 : undefined,
        chElems.ch7.checked === true ? 7 : undefined
      ]
      .filter(ch => ch !== undefined)

      console.log('change on fieldset', channelsToSet)

      const event = new Event('change')
      event.channels = channelsToSet
      this.dispatchEvent(event)

      fieldSet.disable = false
    })

  }
}


