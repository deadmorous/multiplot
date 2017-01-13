var categorySelector = (function() {

    var global = {
        cb: function() {},
        hasCategories: false
    }

    function selectedCategories() {
        var result = []
        $('.category').each(function() {
            var values = []
            $(this).find('.category-value:checked').parent().children('.category-value-text').each(function() {
                values.push($(this).text())
            })
            result.push(values)
        })
        return result
    }

    function labeledCheckbox(labelText, checkBoxClass, textSpanClass) {
        var labelTextElement = $('<span>').text(labelText)
        if(textSpanClass)
            labelTextElement.addClass(textSpanClass)
        return $('<label>')
            .append($('<input>').attr('type', 'checkbox').addClass(checkBoxClass))
            .append(labelTextElement)
    }

    function renderCategories(data) {
        var container = $('#left-panel')
        switch (data.status) {
        case 'normal':
            container.html('')
            var n = data.categoryNames.length
            for (var icat=0; icat<n; ++icat) {
                var catElement = $('<div>').addClass('category').appendTo(container)
                catElement.append(labeledCheckbox(data.categoryNames[icat], 'category-title', 'category-title-text'))
                var catValuesElement = $('<div>').addClass('category-values').appendTo(catElement)
                var catVals = data.categories[icat]
                for (var ival=0, nvals=catVals.length; ival<nvals; ++ival)
                    $('<div>').addClass('category-value-container')
                        .append(labeledCheckbox(catVals[ival], 'category-value', 'category-value-text'))
                        .appendTo(catValuesElement)
            }
            $('.category-title').change(function() {
                $(this).closest('.category').find('.category-value').prop('checked', $(this).prop('checked'))
                global.cb()
            })
            $('.category-value').change(function() {
                var cat = $(this).closest('.category')
                var title = cat.find('.category-title')
                if (cat.find('.category-value:checked').length === 0)
                    title.prop('indeterminate', false).prop('checked', false)
                else if (cat.find('.category-value:not(:checked)').length === 0)
                    title.prop('indeterminate', false).prop('checked', true)
                else
                    title.prop('indeterminate', true)
                global.cb()
            })
            global.hasCategories = n > 0
            break
        case 'empty':
            container.text('No files are available')
            global.hasCategories = false
            break
        default:
            container.text('Unrecognized server response')
            global.hasCategories = false
            break
        }
    }

    function result(cb) {
        global.cb = cb
    }
    result.render = renderCategories
    result.current = selectedCategories
    result.hasCategories = function() {
        return global.hasCategories
    }
    result.makeInitialSelection = function() {
        if (global.hasCategories) {
            // Automatically check categories to show one curve
            $('.category-value-container:first-child .category-value').prop('checked', true)
        }
    }

    return result
})()
