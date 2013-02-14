Ext.require([
    'Ext.form.*',
    'Ext.tip.QuickTipManager'
]);

Ext.onReady(function() {

    // Add the additional 'advanced' VTypes
    Ext.apply(Ext.form.field.VTypes, {
        daterange: function(val, field) {
            var date = field.parseDate(val);

            if (!date) {
                return false;
            }
            if (field.startDateField && (!this.dateRangeMax || (date.getTime() != this.dateRangeMax.getTime()))) {
                var start = field.up('form').down('#' + field.startDateField);
                start.setMaxValue(date);
                start.validate();
                this.dateRangeMax = date;
            }
            else if (field.endDateField && (!this.dateRangeMin || (date.getTime() != this.dateRangeMin.getTime()))) {
                var end = field.up('form').down('#' + field.endDateField);
                end.setMinValue(date);
                end.validate();
                this.dateRangeMin = date;
            }
            /*
             * Always return true since we're only using this vtype to set the
             * min/max allowed values (these are tested for after the vtype test)
             */
            return true;
        },

        daterangeText: 'Start date must be less than end date',

        p***REMOVED***word: function(val, field) {
            if (field.initialP***REMOVED***Field) {
                var pwd = field.up('form').down('#' + field.initialP***REMOVED***Field);
                return (val == pwd.getValue());
            }
            return true;
        },

        p***REMOVED***wordText: 'P***REMOVED***words do not match'
    });
    
    Ext.tip.QuickTipManager.init();

    /*
     * ================  Date Range  =======================
     */

    var dr = Ext.create('Ext.form.Panel', {
        renderTo: 'dr',
        frame: true,
        title: 'Date Range',
        bodyPadding: '5 5 0',
        width: 350,
        fieldDefaults: {
            labelWidth: 125,
            msgTarget: 'side',
            autoFitErrors: false
        },
        defaults: {
            width: 300
        },
        defaultType: 'datefield',
        items: [{
            fieldLabel: 'Start Date',
            name: 'startdt',
            itemId: 'startdt',
            vtype: 'daterange',
            endDateField: 'enddt' // id of the end date field
        }, {
            fieldLabel: 'End Date',
            name: 'enddt',
            itemId: 'enddt',
            vtype: 'daterange',
            startDateField: 'startdt' // id of the start date field
        }]
    });


    /*
     * ================  P***REMOVED***word Verification =======================
     */

    var pwd = Ext.create('Ext.form.Panel', {
        renderTo: 'pw',
        frame: true,
        title: 'P***REMOVED***word Verification',
        bodyPadding: '5 5 0',
        width: 350,
        fieldDefaults: {
            labelWidth: 125,
            msgTarget: 'side',
            autoFitErrors: false
        },
        defaults: {
            width: 300,
            inputType: 'p***REMOVED***word'
        },
        defaultType: 'textfield',
        items: [{
            fieldLabel: 'P***REMOVED***word',
            name: 'p***REMOVED***',
            itemId: 'p***REMOVED***'
        }, {
            fieldLabel: 'Confirm P***REMOVED***word',
            name: 'p***REMOVED***-cfrm',
            vtype: 'p***REMOVED***word',
            initialP***REMOVED***Field: 'p***REMOVED***' // id of the initial p***REMOVED***word field
        }]
    });

});
