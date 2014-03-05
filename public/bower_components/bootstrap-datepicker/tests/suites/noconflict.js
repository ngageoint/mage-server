module('NoConflict', {
    setup: function(){
        var datepicker = $.fn.datepicker.noConflict();
        $.fn.bootstrapDP = datepicker;
    },
    teardown: function(){
        $.fn.datepicker = $.fn.bootstrapDP;
        delete $.fn.bootstrapDP;
    }
});

test('Datepicker starts after calling noConflict() (no undefined defaults or locale_opts)', function(){
    $('<div cl***REMOVED***="input-append date" id="datepicker">'+
        '<input size="16" type="text" value="12-02-2012" readonly>'+
        '<span cl***REMOVED***="add-on"><i cl***REMOVED***="icon-th"></i></span>'+
        '</div>')
        .appendTo('#qunit-fixture')
        .bootstrapDP();
    expect(0);
});
