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
            curveSelector.render(curdir, data)
            filters.render(curdir, data)
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
        renderDiagram(m, folderNavigator.curdir(), categorySelector.current(), curveSelector.current(), filters.current())
    }

    categorySelector(util.makeLazyRequest(diagramRequest, 1500))
    curveSelector(diagramRequest)
    filters(diagramRequest)

    folderNavigator.cd('')

    $(window).resize(util.makeLazyRequest(function() {
        if (hasDiagram)
            diagramRequest()
    }, 300))
})()
