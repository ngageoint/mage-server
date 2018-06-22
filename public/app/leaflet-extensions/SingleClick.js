var L = require('leaflet');

L.Evented.addInitHook( function () {
  this._singleClickTimeout = null;
  this.on( 'click', this._scheduleSingleClick, this );
  this.on( 'dblclick dragstart zoomstart', this._cancelSingleClick, this );
});

L.Evented.include({
  _cancelSingleClick : function(){
    // timeout to differentiate single click from double click
    setTimeout( this._clearSingleClickTimeout.bind(this), 0 );
  },

  _scheduleSingleClick: function(e) {
    this._clearSingleClickTimeout();

    this._singleClickTimeout = setTimeout(
      this._fireSingleClick.bind(this, e),
      (this.options.singleClickTimeout || 500)
    );
  },

  _fireSingleClick: function(e){
    if ( !e.originalEvent._stopped ) {
      this.fire( 'singleclick', L.Util.extend( e, { type : 'singleclick' } ) );
    }
  },

  _clearSingleClickTimeout: function(){
    if (this._singleClickTimeout != null) {
      clearTimeout( this._singleClickTimeout );
      this._singleClickTimeout = null;
    }
  }

});
