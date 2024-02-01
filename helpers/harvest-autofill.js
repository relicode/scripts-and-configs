;(() => {
  const dataAttributeName = 'harvest-autofill-listener-7SOVIO'
  const selector = `tr[data-project-id][data-task-id]:not([${dataAttributeName}])`

  setInterval(() => {
    const elements = $(selector)
    if (!elements.length) return

    elements
      .attr(dataAttributeName, true)
      .on('dblclick', function(ev) {
        ev.preventDefault()
        ev.stopPropagation()

        $(this)
          .find('td.day input')
          .slice(0, 5) // Monday to Friday
          .each(function() {
            if (!this.value) $(this).val('8:00').change()
          })
      })
  }, 100)

})()
