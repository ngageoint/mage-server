/*
 * The dirty implementation in this cl***REMOVED*** is quite naive. The reasoning for this is that the dirty state
 * will only be used in very specific circumstances, specifically, after the render process has begun but
 * the component is not yet rendered to the DOM. As such, we want it to perform as quickly as possible
 * so it's not as fully featured as you may expect.
 */

/**
 * Manages certain element-like data prior to rendering. These values are p***REMOVED***ed
 * on to the render process. This is currently used to manage the "cl***REMOVED***" and "style" attributes
 * of a component's primary el as well as the bodyEl of panels. This allows things like
 * addBodyCls in Panel to share logic with addCls in AbstractComponent.
 * @private
 */
Ext.define('Ext.util.ProtoElement', (function () {
    var splitWords = Ext.String.splitWords,
        toMap = Ext.Array.toMap;

    return {
        
        isProtoEl: true,
        
        /**
         * The property name for the cl***REMOVED***Name on the data object p***REMOVED***ed to {@link #writeTo}.
         */
        clsProp: 'cls',

        /**
         * The property name for the style on the data object p***REMOVED***ed to {@link #writeTo}.
         */
        styleProp: 'style',
        
        /**
         * The property name for the removed cl***REMOVED***es on the data object p***REMOVED***ed to {@link #writeTo}.
         */
        removedProp: 'removed',

        /**
         * True if the style must be converted to text during {@link #writeTo}. When used to
         * populate tpl data, this will be true. When used to populate {@link Ext.DomHelper}
         * specs, this will be false (the default).
         */
        styleIsText: false,

        constructor: function (config) {
            var me = this;

            Ext.apply(me, config);

            me.cl***REMOVED***List = splitWords(me.cls);
            me.cl***REMOVED***Map = toMap(me.cl***REMOVED***List);
            delete me.cls;

            if (Ext.isFunction(me.style)) {
                me.styleFn = me.style;
                delete me.style;
            } else if (typeof me.style == 'string') {
                me.style = Ext.Element.parseStyles(me.style);
            } else if (me.style) {
                me.style = Ext.apply({}, me.style); // don't edit the given object
            }
        },
        
        /**
         * Indicates that the current state of the object has been flushed to the DOM, so we need
         * to track any subsequent changes
         */
        flush: function(){
            this.flushCl***REMOVED***List = [];
            this.removedCl***REMOVED***es = {};
            // clear the style, it will be recreated if we add anything new
            delete this.style;
        },

        /**
         * Adds cl***REMOVED*** to the element.
         * @param {String} cls One or more cl***REMOVED***names separated with spaces.
         * @return {Ext.util.ProtoElement} this
         */
        addCls: function (cls) {
            var me = this,
                add = splitWords(cls),
                length = add.length,
                list = me.cl***REMOVED***List,
                map = me.cl***REMOVED***Map,
                flushList = me.flushCl***REMOVED***List,
                i = 0,
                c;

            for (; i < length; ++i) {
                c = add[i];
                if (!map[c]) {
                    map[c] = true;
                    list.push(c);
                    if (flushList) {
                        flushList.push(c);
                        delete me.removedCl***REMOVED***es[c];
                    }
                }
            }

            return me;
        },

        /**
         * True if the element has given cl***REMOVED***.
         * @param {String} cls
         * @return {Boolean}
         */
        hasCls: function (cls) {
            return cls in this.cl***REMOVED***Map;
        },

        /**
         * Removes cl***REMOVED*** from the element.
         * @param {String} cls One or more cl***REMOVED***names separated with spaces.
         * @return {Ext.util.ProtoElement} this
         */
        removeCls: function (cls) {
            var me = this,
                list = me.cl***REMOVED***List,
                newList = (me.cl***REMOVED***List = []),
                remove = toMap(splitWords(cls)),
                length = list.length,
                map = me.cl***REMOVED***Map,
                removedCl***REMOVED***es = me.removedCl***REMOVED***es,
                i, c;

            for (i = 0; i < length; ++i) {
                c = list[i];
                if (remove[c]) {
                    if (removedCl***REMOVED***es) {
                        if (map[c]) {
                            removedCl***REMOVED***es[c] = true;
                            Ext.Array.remove(me.flushCl***REMOVED***List, c);
                        }
                    }
                    delete map[c];
                } else {
                    newList.push(c);
                }
            }

            return me;
        },

        /**
         * Adds styles to the element.
         * @param {String/Object} prop The style property to be set, or an object of multiple styles.
         * @param {String} [value] The value to apply to the given property.
         * @return {Ext.util.ProtoElement} this
         */
        setStyle: function (prop, value) {
            var me = this,
                style = me.style || (me.style = {});

            if (typeof prop == 'string') {
                if (arguments.length === 1) {
                    me.setStyle(Ext.Element.parseStyles(prop));
                } else {
                    style[prop] = value;
                }
            } else {
                Ext.apply(style, prop);
            }

            return me;
        },

        /**
         * Writes style and cl***REMOVED*** properties to given object.
         * Styles will be written to {@link #styleProp} and cl***REMOVED*** names to {@link #clsProp}.
         * @param {Object} to
         * @return {Object} to
         */
        writeTo: function (to) {
            var me = this,
                cl***REMOVED***List = me.flushCl***REMOVED***List || me.cl***REMOVED***List,
                removedCl***REMOVED***es = me.removedCl***REMOVED***es,
                style;

            if (me.styleFn) {
                style = Ext.apply({}, me.styleFn());
                Ext.apply(style, me.style);
            } else {
                style = me.style;
            }

            to[me.clsProp] = cl***REMOVED***List.join(' ');

            if (style) {
                to[me.styleProp] = me.styleIsText ? Ext.DomHelper.generateStyles(style) : style;
            }
            
            if (removedCl***REMOVED***es) {
                removedCl***REMOVED***es = Ext.Object.getKeys(removedCl***REMOVED***es);
                if (removedCl***REMOVED***es.length) {
                    to[me.removedProp] = removedCl***REMOVED***es.join(' ');
                }
            }

            return to;
        }
    };
}()));
