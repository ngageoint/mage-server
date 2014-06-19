module('DATA-API');

test('DATA-API: data-provide="datepicker" on input; focus', function(){
    var input = $('<input data-provide="datepicker" />')
                .appendTo('#qunit-fixture');
    input.focus();
    ok(input.data('datepicker'), 'datepicker is initialized by "focus" event');
});

test('DATA-API: data-provide="datepicker" on input; click', function(){
    var input = $('<input data-provide="datepicker" />')
                .appendTo('#qunit-fixture');
    input.click();
    ok(input.data('datepicker'), 'datepicker is initialized by "focus" event');
});

test('DATA-API: data-provide="datepicker" on component', function(){
    var html, comp;

    html = '<div cl***REMOVED***="input-append date" data-provide="datepicker">'+
                '<input><span cl***REMOVED***="add-on"><i cl***REMOVED***="icon-th"></i></span>'+
            '</div>';

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('input').focus();
    ok(comp.data('datepicker'), 'append component initialized by "focus" event on input');
    comp.remove();

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('input').click();
    ok(comp.data('datepicker'), 'append component initialized by "click" event on input');
    comp.remove();

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('.add-on').focus();
    ok(comp.data('datepicker'), 'append component initialized by "focus" event on add-on');
    comp.remove();

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('.add-on').click();
    ok(comp.data('datepicker'), 'append component initialized by "click" event on add-on');
    comp.remove();


    html = '<div cl***REMOVED***="input-prepend date" data-provide="datepicker">'+
                '<span cl***REMOVED***="add-on"><i cl***REMOVED***="icon-th"></i></span><input>'+
            '</div>';

    comp = $(html).prependTo('#qunit-fixture');
    comp.find('input').focus();
    ok(comp.data('datepicker'), 'prepend component initialized by "focus" event on input');
    comp.remove();

    comp = $(html).prependTo('#qunit-fixture');
    comp.find('input').click();
    ok(comp.data('datepicker'), 'prepend component initialized by "click" event on input');
    comp.remove();

    comp = $(html).prependTo('#qunit-fixture');
    comp.find('.add-on').focus();
    ok(comp.data('datepicker'), 'prepend component initialized by "focus" event on add-on');
    comp.remove();

    comp = $(html).prependTo('#qunit-fixture');
    comp.find('.add-on').click();
    ok(comp.data('datepicker'), 'prepend component initialized by "click" event on add-on');
    comp.remove();
});

test('DATA-API: data-provide="datepicker" on button', function(){
    var html, comp;

    html = '<button data-provide="datepicker">';

    comp = $(html).appendTo('#qunit-fixture');
    comp.focus();
    ok(comp.data('datepicker'), 'button initialized by "focus" event on input');
    comp.remove();

    comp = $(html).appendTo('#qunit-fixture');
    comp.click();
    ok(comp.data('datepicker'), 'button initialized by "click" event on input');
    comp.remove();
});

test('DATA-API: data-provide="datepicker" on rangepicker', function(){
    var html, comp;

    html = '<div cl***REMOVED***="input-daterange" data-provide="datepicker">'+
                '<input cl***REMOVED***="datepicker">'+
                '<span cl***REMOVED***="add-on">to</span>'+
                '<input cl***REMOVED***="datepicker">'+
            '</div>';

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('input:first').focus();
    ok(comp.data('datepicker'), 'range initialized by "focus" event on first input');
    comp.remove();

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('input:first').click();
    ok(comp.data('datepicker'), 'range initialized by "click" event on first input');
    comp.remove();

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('input:last').focus();
    ok(comp.data('datepicker'), 'range initialized by "focus" event on last input');
    comp.remove();

    comp = $(html).appendTo('#qunit-fixture');
    comp.find('input:last').click();
    ok(comp.data('datepicker'), 'range initialized by "click" event on last input');
    comp.remove();
});
