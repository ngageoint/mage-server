$(function () {

    module("bootstrap-buttons")

      test("should provide no conflict", function () {
        var button = $.fn.button.noConflict()
        ok(!$.fn.button, 'button was set back to undefined (org value)')
        $.fn.button = button
      })

      test("should be defined on jquery object", function () {
        ok($(document.body).button, 'button method is defined')
      })

      test("should return element", function () {
        ok($(document.body).button()[0] == document.body, 'document.body returned')
      })

      test("should return set state to loading", function () {
        var btn = $('<button cl***REMOVED***="btn" data-loading-text="fat">mdo</button>')
        equals(btn.html(), 'mdo', 'btn text equals mdo')
        btn.button('loading')
        equals(btn.html(), 'fat', 'btn text equals fat')
        stop()
        setTimeout(function () {
          ok(btn.attr('disabled'), 'btn is disabled')
          ok(btn.hasCl***REMOVED***('disabled'), 'btn has disabled cl***REMOVED***')
          start()
        }, 0)
      })

      test("should return reset state", function () {
        var btn = $('<button cl***REMOVED***="btn" data-loading-text="fat">mdo</button>')
        equals(btn.html(), 'mdo', 'btn text equals mdo')
        btn.button('loading')
        equals(btn.html(), 'fat', 'btn text equals fat')
        stop()
        setTimeout(function () {
          ok(btn.attr('disabled'), 'btn is disabled')
          ok(btn.hasCl***REMOVED***('disabled'), 'btn has disabled cl***REMOVED***')
          start()
          stop()
        }, 0)
        btn.button('reset')
        equals(btn.html(), 'mdo', 'btn text equals mdo')
        setTimeout(function () {
          ok(!btn.attr('disabled'), 'btn is not disabled')
          ok(!btn.hasCl***REMOVED***('disabled'), 'btn does not have disabled cl***REMOVED***')
          start()
        }, 0)
      })

      test("should toggle active", function () {
        var btn = $('<button cl***REMOVED***="btn">mdo</button>')
        ok(!btn.hasCl***REMOVED***('active'), 'btn does not have active cl***REMOVED***')
        btn.button('toggle')
        ok(btn.hasCl***REMOVED***('active'), 'btn has cl***REMOVED*** active')
      })

      test("should toggle active when btn children are clicked", function () {
        var btn = $('<button cl***REMOVED***="btn" data-toggle="button">mdo</button>')
          , inner = $('<i></i>')
        btn
          .append(inner)
          .appendTo($('#qunit-fixture'))
        ok(!btn.hasCl***REMOVED***('active'), 'btn does not have active cl***REMOVED***')
        inner.click()
        ok(btn.hasCl***REMOVED***('active'), 'btn has cl***REMOVED*** active')
      })

      test("should toggle active when btn children are clicked within btn-group", function () {
        var btngroup = $('<div cl***REMOVED***="btn-group" data-toggle="buttons-checkbox"></div>')
          , btn = $('<button cl***REMOVED***="btn">fat</button>')
          , inner = $('<i></i>')
        btngroup
          .append(btn.append(inner))
          .appendTo($('#qunit-fixture'))
        ok(!btn.hasCl***REMOVED***('active'), 'btn does not have active cl***REMOVED***')
        inner.click()
        ok(btn.hasCl***REMOVED***('active'), 'btn has cl***REMOVED*** active')
      })

      test("should check for closest matching toggle", function () {
        var group = $("<div data-toggle='buttons-radio'></div>")
          , btn1  = $("<button cl***REMOVED***='btn active'></button>")
          , btn2  = $("<button cl***REMOVED***='btn'></button>")
          , wrap  = $("<div></div>")

        wrap.append(btn1, btn2)

        group
          .append(wrap)
          .appendTo($('#qunit-fixture'))

        ok(btn1.hasCl***REMOVED***('active'), 'btn1 has active cl***REMOVED***')
        ok(!btn2.hasCl***REMOVED***('active'), 'btn2 does not have active cl***REMOVED***')
        btn2.click()
        ok(!btn1.hasCl***REMOVED***('active'), 'btn1 does not have active cl***REMOVED***')
        ok(btn2.hasCl***REMOVED***('active'), 'btn2 has active cl***REMOVED***')
      })

})