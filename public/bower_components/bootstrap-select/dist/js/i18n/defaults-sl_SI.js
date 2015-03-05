/*!
 * Bootstrap-select v1.6.4 (http://silviomoreto.github.io/bootstrap-select)
 *
 * Copyright 2013-2015 bootstrap-select
 * Licensed under MIT (https://github.com/silviomoreto/bootstrap-select/blob/master/LICENSE)
 */
(function ($) {
  $.fn.selectpicker.defaults = {
    noneSelectedText: 'Nič izbranega',
    noneResultsText: 'Ni zadetkov za {0}',
    countSelectedText: function (numSelected, numTotal) {
      "Število izbranih: {0}";
    },
    maxOptionsText: function (numAll, numGroup) {
      return [
        'Omejitev ***REMOVED***ežena (max. izbranih: {n})',
        'Omejitev skupine ***REMOVED***ežena (max. izbranih: {n})'
      ];
    },
    selectAllText: 'Izberi vse',
    deselectAllText: 'Počisti izbor',
    multipleSeparator: ', '
  };
})(jQuery);
