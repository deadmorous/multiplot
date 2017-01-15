var curveSelector = (function() {

    var global = {
        cb: function() {},
        current: {}    // Current curve
    }

    var changeCurve

    function renderCurveSelector(data) {
        var container = $('#curve-selector-items')
        container.html('')
        var hasCurves = data.status === 'normal' && data.processing && data.processing.curves && data.processing.curves.length > 0
        if (hasCurves) {
            changeCurve = function(index) {
                global.current = data.processing.curves[index]
                $('#curve-title').text(global.current.title)
                global.cb(global.current)
            }
            global.current = data.processing.curves[0]
            var curveList = $('<ul>').appendTo(container)
            data.processing.curves.forEach(function(curve, index) {
                $('<li>').append(
                    $('<a>').attr('href', '')
                        .text(curve.title)
                        .click(function(e) {
                            e.preventDefault()
                            changeCurve(index)
                        })
                ).appendTo (curveList)
            })
            $('#curve-title').text(global.current.title)
            $('#curve-selector').show()
        }
        else {
            $('#curve-selector').hide()
            changeCurve = function() {}
        }
    }

    $(document).ready(function() {
        $('#curve-selector')
            .mouseenter(function() {
                $('#curve-selector-items').show().offset($(this).offset())
            } )
            .mouseleave(function() { $('#curve-selector-items').hide() } )
    })

    function result(cb) {
        global.cb = cb
        global.current = {}
    }
    result.render = renderCurveSelector
    result.current = function() { return global.current }
    result.change = changeCurve

    return result
})()
