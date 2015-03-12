define([
	"../core",
	"../var/rnotwhite",
	"../var/strundefined",
	"../data/var/data_priv",
	"../core/init"
], function( jQuery, rnotwhite, strundefined, data_priv ) {

var rcl***REMOVED*** = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addCl***REMOVED***: function( value ) {
		var cl***REMOVED***es, elem, cur, clazz, j, finalValue,
			proceed = typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addCl***REMOVED***( value.call( this, j, this.cl***REMOVED***Name ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeCl***REMOVED***)
			cl***REMOVED***es = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.cl***REMOVED***Name ?
					( " " + elem.cl***REMOVED***Name + " " ).replace( rcl***REMOVED***, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = cl***REMOVED***es[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only ***REMOVED***ign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.cl***REMOVED***Name !== finalValue ) {
						elem.cl***REMOVED***Name = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeCl***REMOVED***: function( value ) {
		var cl***REMOVED***es, elem, cur, clazz, j, finalValue,
			proceed = arguments.length === 0 || typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeCl***REMOVED***( value.call( this, j, this.cl***REMOVED***Name ) );
			});
		}
		if ( proceed ) {
			cl***REMOVED***es = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addCl***REMOVED***)
				cur = elem.nodeType === 1 && ( elem.cl***REMOVED***Name ?
					( " " + elem.cl***REMOVED***Name + " " ).replace( rcl***REMOVED***, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = cl***REMOVED***es[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only ***REMOVED***ign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.cl***REMOVED***Name !== finalValue ) {
						elem.cl***REMOVED***Name = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleCl***REMOVED***: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addCl***REMOVED***( value ) : this.removeCl***REMOVED***( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleCl***REMOVED***( value.call(this, i, this.cl***REMOVED***Name, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// Toggle individual cl***REMOVED*** names
				var cl***REMOVED***Name,
					i = 0,
					self = jQuery( this ),
					cl***REMOVED***Names = value.match( rnotwhite ) || [];

				while ( (cl***REMOVED***Name = cl***REMOVED***Names[ i++ ]) ) {
					// Check each cl***REMOVED***Name given, space separated list
					if ( self.hasCl***REMOVED***( cl***REMOVED***Name ) ) {
						self.removeCl***REMOVED***( cl***REMOVED***Name );
					} else {
						self.addCl***REMOVED***( cl***REMOVED***Name );
					}
				}

			// Toggle whole cl***REMOVED*** name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.cl***REMOVED***Name ) {
					// store cl***REMOVED***Name if set
					data_priv.set( this, "__cl***REMOVED***Name__", this.cl***REMOVED***Name );
				}

				// If the element has a cl***REMOVED*** name or if we're p***REMOVED***ed `false`,
				// then remove the whole cl***REMOVED***name (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.cl***REMOVED***Name = this.cl***REMOVED***Name || value === false ? "" : data_priv.get( this, "__cl***REMOVED***Name__" ) || "";
			}
		});
	},

	hasCl***REMOVED***: function( selector ) {
		var cl***REMOVED***Name = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].cl***REMOVED***Name + " ").replace(rcl***REMOVED***, " ").indexOf( cl***REMOVED***Name ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});

});
