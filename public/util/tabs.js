export function bindTabRoot(root) {
  const tabButtons = root.querySelectorAll('button[data-tab]')
  for(const tabButton of tabButtons) {
    tabButton.addEventListener('click', event => {
      event.preventDefault()

      const { target} = event
			const parent = target?.parentNode
			const grandParent = parent.parentNode

      const tabName = target.getAttribute('data-tab')

      // remove content active
      const activeOthers = grandParent.querySelectorAll(':scope > [data-active]')
      activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

      // remove tab button active
      const activeOthersTabsButtons = parent.querySelectorAll(':scope > button[data-tab]')
      activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

      const tabContentElem = grandParent.querySelector(`:scope > [data-for-tab="${tabName}"]`)
      if(tabContentElem === null) { console.warn('tab content not found', tabName) }
      else {
        // set content active
        tabContentElem.toggleAttribute('data-active', true)
      }

      // set self active
      tabButton.toggleAttribute('data-active', true)
    })
  }
}