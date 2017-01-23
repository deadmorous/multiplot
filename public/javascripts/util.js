var util = (function() {

    function labeledCheckbox(labelText, checkBoxClass, textSpanClass) {
        var labelTextElement = $('<span>').text(labelText)
        if(textSpanClass)
            labelTextElement.addClass(textSpanClass)
        return $('<label>')
            .append($('<input>').attr('type', 'checkbox').addClass(checkBoxClass))
            .append(labelTextElement)
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

    return {
        labeledCheckbox: labeledCheckbox,
        makeLazyRequest: makeLazyRequest,
        fprx: /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/
    }
})()
