;(() => {
  $('tr[data-project-id][data-task-id]').on('dblclick', function(ev) {
    ev.preventDefault()
    ev.stopPropagation()

    $(this).find('td.day input').slice(0, 5).each(function() {
      if (!this.value) $(this).val('8:00').change()
    })
  })
})()
