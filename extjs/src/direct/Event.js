/**
 * @cl***REMOVED*** Ext.direct.Event
 * A base cl***REMOVED*** for all Ext.direct events. An event is
 * created after some kind of interaction with the server.
 * The event cl***REMOVED*** is essentially just a data structure
 * to hold a Direct response.
 */
Ext.define('Ext.direct.Event', {

    /* Begin Definitions */

    alias: 'direct.event',

    requires: ['Ext.direct.Manager'],

    /* End Definitions */

    status: true,

    /**
     * Creates new Event.
     * @param {Object} config (optional) Config object.
     */
    constructor: function(config) {
        Ext.apply(this, config);
    },

    /**
     * Return the raw data for this event.
     * @return {Object} The data from the event
     */
    getData: function(){
        return this.data;
    }
});
