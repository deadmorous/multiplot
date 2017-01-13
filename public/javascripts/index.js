;(function() {
    var m = multiplot()

    var hasDiagram = false  // Not very accurate because of #chdir

    function onDirChanged(curdir) {
        hasDiagram = false
        m.dirInfo(curdir, function(err, data) {
            if (err)
                popups.errorMessage(err)
            categorySelector.render(data)
            categorySelector.makeInitialSelection()
            curveSelector.render(data)
            if (categorySelector.hasCategories())
                $('#main-view')
                    .append($('<span>')
                        .append($('<input>')
                            .attr('type', 'button')
                            .val('Show diagram')
                            .click(diagramRequest)
                        )
                    )
        })
    }

    folderNavigator(onDirChanged)

    function diagramRequest() {
        // popups.infoMessage('Requesting diagram data...', 300)
        hasDiagram = true
        renderDiagram(m, folderNavigator.curdir(), categorySelector.current(), curveSelector.current())
    }

    function makeLazyRequest(request, timeout) {
        var requestCount = 0
        return function() {
            ++requestCount
            setTimeout(function() {
                if (--requestCount == 0)
                    request()
            }, timeout)
        }
    }

    categorySelector(makeLazyRequest(diagramRequest, 1500))

    curveSelector(function(index) {
        renderDiagram(m, folderNavigator.curdir(), categorySelector.current(), index)
    })

    folderNavigator.cd('')

    $(window).resize(makeLazyRequest(function() {
        if (hasDiagram)
            diagramRequest()
    }, 300))
})()
