/**
 * Copyright (c) 2008-2011 The Open Source Geospatial Foundation
 * 
 * Published under the BSD license.
 * See http://svn.geoext.org/core/trunk/geoext/license.txt for the full text
 * of the license.
 */

/**
 * @include GeoExt/widgets/form/SearchAction.js
 */

/** api: (define)
 *  module = GeoExt.form
 *  cl***REMOVED*** = BasicForm
 *  base_link = `Ext.form.BasicForm <http://dev.sencha.com/deploy/dev/docs/?cl***REMOVED***=Ext.form.BasicForm>`_
 */

Ext.namespace("GeoExt.form");

/** api: constructor
 *  .. cl***REMOVED***:: BasicForm(config)
 *
 *      A specific ``Ext.form.BasicForm`` whose doAction method creates
 *      a :cl***REMOVED***:`GeoExt.form.SearchAction` if it is p***REMOVED***ed the string
 *      "search" as its first argument.
 *
 *      In most cases one would not use this cl***REMOVED*** directly, but
 *      :cl***REMOVED***:`GeoExt.form.FormPanel` instead.
 */
GeoExt.form.BasicForm = Ext.extend(Ext.form.BasicForm, {
    /** private: property[protocol]
     *  ``OpenLayers.Protocol`` The protocol configured in this
     *  instance.
     */
    protocol: null,

    /**
     * private: property[prevResponse]
     * ``OpenLayers.Protocol.Response`` The response return by a call to
     *  protocol.read method.
     */
    prevResponse: null,

    /**
     * api: config[autoAbort]
     * ``Boolean`` Tells if pending requests should be aborted
     *      when a new action is performed.
     */
    autoAbort: true,

    /** api: method[doAction]
     *  :param action: ``String or Ext.form.Action`` Either the name
     *      of the action or a ``Ext.form.Action`` instance.
     *  :param options: ``Object`` The options p***REMOVED***ed to the Action
     *      constructor.
     *  :return: :cl***REMOVED***:`GeoExt.form.BasicForm` This form.
     *
     *  Performs the action, if the string "search" is p***REMOVED***ed as the
     *  first argument then a :cl***REMOVED***:`GeoExt.form.SearchAction` is created.
     */
    doAction: function(action, options) {
        if(action == "search") {
            options = Ext.applyIf(options || {}, {
                protocol: this.protocol,
                abortPrevious: this.autoAbort
            });
            action = new GeoExt.form.SearchAction(this, options);
        }
        return GeoExt.form.BasicForm.supercl***REMOVED***.doAction.call(
            this, action, options
        );
    },

    /** api: method[search]
     *  :param options: ``Object`` The options p***REMOVED***ed to the Action
     *      constructor.
     *  :return: :cl***REMOVED***:`GeoExt.form.BasicForm` This form.
     *  
     *  Shortcut to do a search action.
     */
    search: function(options) {
        return this.doAction("search", options);
    }
});
