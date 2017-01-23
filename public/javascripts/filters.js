var filters = (function() {

    var global = {
        cb: function() {},
        hasFilters: false
    }

    function parseFilter(text) {
        var m
        if (m = text.match(/^[/](.*)[/]$/)) {
            var rx = new RegExp(m[1])
            return x => x.toString().match(rx) !== null
        }
        else if (m = text.match(/^([<>]=?)([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)$/))
        {
            var x0 = +m[2]
            switch(m[1]) {
            case '<': return x => +x < x0
            case '>': return x => +x > x0
            case '<=': return x => +x <= x0
            case '>=': return x => +x >= x0
            }
        }
        else return x => x.toString() === text
    }

    function selectedFilters() {
        var result = []
        if (!global.hasFilters)
            return result
        $('li.filter-column').each(function() {
            var columnName = $(this).children('label').find('span').text()
            var values = []
            $(this).find('input.filter-value:checked').parent().children('span').each(function() {
                values.push(parseFilter($(this).text()))
            })
            if (values.length > 0)
                result.push( { name: columnName, values: values })
        })
        return result
    }

    function renderFilters(curdir, data) {
        var container = $('#filter-items')
        container.html('')
        var hasFilters = global.hasFilters = data.status === 'normal' && data.processing && data.processing.filters && data.processing.filters.length > 0
        if (hasFilters) {
            var filterList = $('<ul>').addClass('top-panel-popup-content').appendTo(container)
            data.processing.filters.forEach(function(filterData) {
                var filterElement =
                    $('<li>').addClass('filter-column').append(util.labeledCheckbox(filterData.column, 'filter-column')).appendTo(filterList)
                var filterValueList = $('<ul>').appendTo(filterElement)
                filterData.values.forEach(function(value) {
                    $('<li>').append(util.labeledCheckbox(value, 'filter-value')).appendTo(filterValueList)
                })
            })

            filterList.find('input.filter-value').change(function() {
                var column = $(this).closest('.filter-column')
                var columnLabel = column.children('label')
                var columnCheck = columnLabel.find('input')
                if (column.find('input.filter-value:checked').length === 0)
                    columnCheck.prop('indeterminate', false).prop('checked', false)
                else if (column.find('input.filter-value:not(:checked)').length === 0)
                    columnCheck.prop('indeterminate', false).prop('checked', true)
                else
                    columnCheck.prop('indeterminate', true)
                global.cb()
            })

            filterList.find('input.filter-column').change(function() {
                var column = $(this).closest('li.filter-column')
                column.find('input.filter-value').prop('checked', $(this).prop('checked'))
                global.cb()
            })

            $('#filters').show()
        }
        else {
            $('#filters').hide()
        }
    }

    $(document).ready(function() {
        var filterItems = $('#filter-items')
        $('#filters')
            .mouseenter(function() {
                filterItems.stop().fadeIn('fast').offset($(this).offset())
            } )
            .mouseleave(function() {
                filterItems.fadeOut(1200) }
            )
    })

    function result(cb) {
        global.cb = cb
        global.current = {}
    }
    result.render = renderFilters
    result.current = selectedFilters

    return result
})()
