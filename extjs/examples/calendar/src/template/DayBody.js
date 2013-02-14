/**
 * @cl***REMOVED*** Ext.calendar.template.DayBody
 * @extends Ext.XTemplate
 * <p>This is the template used to render the scrolling body container used in {@link Ext.calendar.DayView DayView} and 
 * {@link Ext.calendar.WeekView WeekView}. This template is automatically bound to the underlying event store by the 
 * calendar components and expects records of type {@link Ext.calendar.EventRecord}.</p>
 * <p>Note that this template would not normally be used directly. Instead you would use the {@link Ext.calendar.DayViewTemplate}
 * that internally creates an instance of this template along with a {@link Ext.calendar.DayHeaderTemplate}.</p>
 * @constructor
 * @param {Object} config The config object
 */
Ext.define('Ext.calendar.template.DayBody', {
    extend: 'Ext.XTemplate',
    
    constructor: function(config){
        
        Ext.apply(this, config);

        this.callParent([
            '<table cl***REMOVED***="ext-cal-bg-tbl" cellspacing="0" cellpadding="0">',
                '<tbody>',
                    '<tr height="1">',
                        '<td cl***REMOVED***="ext-cal-gutter"></td>',
                        '<td colspan="{dayCount}">',
                            '<div cl***REMOVED***="ext-cal-bg-rows">',
                                '<div cl***REMOVED***="ext-cal-bg-rows-inner">',
                                    '<tpl for="times">',
                                        '<div cl***REMOVED***="ext-cal-bg-row">',
                                            '<div cl***REMOVED***="ext-cal-bg-row-div ext-row-{[xindex]}"></div>',
                                        '</div>',
                                    '</tpl>',
                                '</div>',
                            '</div>',
                        '</td>',
                    '</tr>',
                    '<tr>',
                        '<td cl***REMOVED***="ext-cal-day-times">',
                            '<tpl for="times">',
                                '<div cl***REMOVED***="ext-cal-bg-row">',
                                    '<div cl***REMOVED***="ext-cal-day-time-inner">{.}</div>',
                                '</div>',
                            '</tpl>',
                        '</td>',
                        '<tpl for="days">',
                            '<td cl***REMOVED***="ext-cal-day-col">',
                                '<div cl***REMOVED***="ext-cal-day-col-inner">',
                                    '<div id="{[this.id]}-day-col-{.:date("Ymd")}" cl***REMOVED***="ext-cal-day-col-gutter"></div>',
                                '</div>',
                            '</td>',
                        '</tpl>',
                    '</tr>',
                '</tbody>',
            '</table>'
        ]);
    },

    // private
    applyTemplate : function(o){
        this.today = Ext.calendar.util.Date.today();
        this.dayCount = this.dayCount || 1;
        
        var i = 0,
            days = [],
            dt = Ext.Date.clone(o.viewStart),
            times = [];
            
        for(; i<this.dayCount; i++){
            days[i] = Ext.calendar.util.Date.add(dt, {days: i});
        }

        // use a fixed DST-safe date so times don't get skipped on DST boundaries
        dt = Ext.Date.clearTime(new Date('5/26/1972'));
        
        for(i=0; i<24; i++){
            times.push(Ext.Date.format(dt, 'ga'));
            dt = Ext.calendar.util.Date.add(dt, {hours: 1});
        }
        
        return this.applyOut({
            days: days,
            dayCount: days.length,
            times: times
        }, []).join('');
    },
    
    apply: function(values) {
        return this.applyTemplate.apply(this, arguments);
    }
});