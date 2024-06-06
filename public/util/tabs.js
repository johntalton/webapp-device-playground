export function bindTabRoot(root) {
  const tabButtons = root.querySelectorAll('button[data-tab]')
  for(const tabButton of tabButtons) {
    tabButton.addEventListener('click', event => {
      event.preventDefault()

      const { target} = event
			// const parent = target?.parentNode
			// const grandParent = parent.parentNode
      const parent = root // target?.parentNode.parentNode

      const tabName = target.getAttribute('data-tab')

      // remove content active
      const activeOthers = parent.querySelectorAll(':scope > [data-active]')
      activeOthers.forEach(ao => ao.toggleAttribute('data-active', false))

      // remove tab button active
      const activeOthersTabsButtons = parent.querySelectorAll(':scope > button[data-tab]')
      activeOthersTabsButtons.forEach(ao => ao.toggleAttribute('data-active', false))

      const tabContentElem = parent.querySelector(`:scope > [data-for-tab="${tabName}"]`)
      if(tabContentElem === null) { console.warn('tab content not found', tabName) }
      else {
        tabContentElem.toggleAttribute('data-active', true)
      }

      tabButton.toggleAttribute('data-active', true)
    })
  }
}