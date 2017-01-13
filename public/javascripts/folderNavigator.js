var folderNavigator = (function() {

    var global = {
        cb: function() {},
        curdir: ''
    }

    function subdirLinkElement(path, title) {
        var result = $('<a>')
            .attr('href', '/view-dir?' + $.param({ curdir: path }))
            .text(title)
            .addClass('subdir')
        if (title === '/')
            result.addClass('subdirs-root')
        return result
    }

    function renderCurrentPath() {
        var container = $('#curdir')
        container.html('')
        var curdir = global.curdir
        var items = curdir? curdir.split('/'): []
        for (var i=0; i<=items.length; ++i) {
            var path = items.slice(0, i).join('/')
            var title
            if (i > 0) {
                if (i > 1)
                    $('<span>').text('/').addClass('subdirs-sep').appendTo(container)
                title = items[i-1]
            }
            else
                title = '/'
            if (i > 0   &&   i === items.length)
                $('<span>').text(title).appendTo(container)
            else
                $('<span>').append(subdirLinkElement(path, title)).appendTo(container)
        }
    }

    function renderSubdirs (subdirs) {
        var curdir = global.curdir
        var container = $('#main-view')
        container.html('')
        for (var i=0; i<subdirs.length; ++i) {
            var subdir = subdirs[i]
            var path = (curdir? curdir+'/': '') + subdir
            $('<div>').append(subdirLinkElement(path, subdir)).appendTo(container)
        }
    }

    function toobj(data) {
        return typeof data === 'string' ?   JSON.parse(data) :   data
    }

    function onSubdirsReceived(data) {
        data = toobj(data)
        var curdirChanged = global.curdir !== data.curdir
        var curdir = global.curdir = data.curdir
        renderCurrentPath()
        renderSubdirs(data.subdirs)
        $('a.subdir').click(function(e) {
            e.preventDefault()
            viewDirByUrl($(this).attr('href'))
        })

        if (curdirChanged)
            global.cb(curdir)

    }

    function viewDirByUrl(url) {
        $.get(url)
            .done(onSubdirsReceived)
            .fail(popups.errorMessage)
    }

    function viewDir(path) {
        path = path || ''
        viewDirByUrl('/view-dir?' + $.param({ curdir: path }))
    }

    $(document).ready(function() {
        $('#chdir').click(function(e) {
            e.preventDefault()

            // Force callback when rendering directory; for that, set an invalid value of global.curdir
            var curdir = global.curdir
            global.curdir = '-'

            viewDir(curdir)
        })
    })

    function result(cb, curdir) {
        global.cb = cb
        global.curdir = curdir || ''
    }
    result.cd = viewDir
    result.curdir = function() { return global.curdir }

    return result
})()
