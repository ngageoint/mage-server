/**
 * @license AngularJS v1.2.0-rc.2
 * (c) 2010-2012 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

/**
 * @ngdoc overview
 * @name ngAnimate
 * @description
 *
 * # ngAnimate
 *
 * `ngAnimate` is an optional module that provides CSS and JavaScript animation hooks.
 *
 * {@installModule animate}
 *
 * # Usage
 *
 * To see animations in action, all that is required is to define the appropriate CSS cl***REMOVED***es
 * or to register a JavaScript animation via the $animation ***REMOVED***. The directives that support animation automatically are:
 * `ngRepeat`, `ngInclude`, `ngSwitch`, `ngShow`, `ngHide` and `ngView`. Custom directives can take advantage of animation
 * by using the `$animate` ***REMOVED***.
 *
 * Below is a more detailed breakdown of the supported animation events provided by pre-existing ng directives:
 *
 * | Directive                                                 | Supported Animations                               |
 * |---------------------------------------------------------- |----------------------------------------------------|
 * | {@link ng.directive:ngRepeat#animations ngRepeat}         | enter, leave and move                              |
 * | {@link ngRoute.directive:ngView#animations ngView}        | enter and leave                                    |
 * | {@link ng.directive:ngInclude#animations ngInclude}       | enter and leave                                    |
 * | {@link ng.directive:ngSwitch#animations ngSwitch}         | enter and leave                                    |
 * | {@link ng.directive:ngIf#animations ngIf}                 | enter and leave                                    |
 * | {@link ng.directive:ngShow#animations ngCl***REMOVED***}            | add and remove                                     |
 * | {@link ng.directive:ngShow#animations ngShow & ngHide}    | add and remove (the ng-hide cl***REMOVED*** value)           |
 *
 * You can find out more information about animations upon visiting each directive page.
 *
 * Below is an example of how to apply animations to a directive that supports animation hooks:
 *
 * <pre>
 * <style type="text/css">
 * .slide.ng-enter > div,
 * .slide.ng-leave > div {
 *   -webkit-transition:0.5s linear all;
 *   -moz-transition:0.5s linear all;
 *   -o-transition:0.5s linear all;
 *   transition:0.5s linear all;
 * }
 *
 * .slide.ng-enter { }        /&#42; starting animations for enter &#42;/
 * .slide.ng-enter-active { } /&#42; terminal animations for enter &#42;/
 * .slide.ng-leave { }        /&#42; starting animations for leave &#42;/
 * .slide.ng-leave-active { } /&#42; terminal animations for leave &#42;/
 * </style>
 *
 * <!--
 * the animate ***REMOVED*** will automatically add .ng-enter and .ng-leave to the element
 * to trigger the CSS transition/animations
 * -->
 * <ANY cl***REMOVED***="slide" ng-include="..."></ANY>
 * </pre>
 *
 * Keep in mind that if an animation is running, any child elements cannot be animated until the parent element's
 * animation has completed.
 *
 * <h2>CSS-defined Animations</h2>
 * The animate ***REMOVED*** will automatically apply two CSS cl***REMOVED***es to the animated element and these two CSS cl***REMOVED***es
 * are designed to contain the start and end CSS styling. Both CSS transitions and keyframe animations are supported
 * and can be used to play along with this naming structure.
 *
 * The following code below demonstrates how to perform animations using **CSS transitions** with Angular:
 *
 * <pre>
 * <style type="text/css">
 * /&#42;
 *  The animate cl***REMOVED*** is apart of the element and the ng-enter cl***REMOVED***
 *  is attached to the element once the enter animation event is triggered
 * &#42;/
 * .reveal-animation.ng-enter {
 *  -webkit-transition: 1s linear all; /&#42; Safari/Chrome &#42;/
 *  -moz-transition: 1s linear all; /&#42; Firefox &#42;/
 *  -o-transition: 1s linear all; /&#42; Opera &#42;/
 *  transition: 1s linear all; /&#42; IE10+ and Future Browsers &#42;/
 *
 *  /&#42; The animation preparation code &#42;/
 *  opacity: 0;
 * }
 *
 * /&#42;
 *  Keep in mind that you want to combine both CSS
 *  cl***REMOVED***es together to avoid any CSS-specificity
 *  conflicts
 * &#42;/
 * .reveal-animation.ng-enter.ng-enter-active {
 *  /&#42; The animation code itself &#42;/
 *  opacity: 1;
 * }
 * </style>
 *
 * <div cl***REMOVED***="view-container">
 *   <div ng-view cl***REMOVED***="reveal-animation"></div>
 * </div>
 * </pre>
 *
 * The following code below demonstrates how to perform animations using **CSS animations** with Angular:
 *
 * <pre>
 * <style type="text/css">
 * .reveal-animation.ng-enter {
 *   -webkit-animation: enter_sequence 1s linear; /&#42; Safari/Chrome &#42;/
 *   -moz-animation: enter_sequence 1s linear; /&#42; Firefox &#42;/
 *   -o-animation: enter_sequence 1s linear; /&#42; Opera &#42;/
 *   animation: enter_sequence 1s linear; /&#42; IE10+ and Future Browsers &#42;/
 * }
 * &#64-webkit-keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * &#64-moz-keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * &#64-o-keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * &#64keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * </style>
 *
 * <div cl***REMOVED***="view-container">
 *   <div ng-view cl***REMOVED***="reveal-animation"></div>
 * </div>
 * </pre>
 *
 * Both CSS3 animations and transitions can be used together and the animate ***REMOVED*** will figure out the correct duration and delay timing.
 *
 * Upon DOM mutation, the event cl***REMOVED*** is added first (something like `ng-enter`), then the browser prepares itself to add
 * the active cl***REMOVED*** (in this case `ng-enter-active`) which then triggers the animation. The animation module will automatically
 * detect the CSS code to determine when the animation ends. Once the animation is over then both CSS cl***REMOVED***es will be
 * removed from the DOM. If a browser does not support CSS transitions or CSS animations then the animation will start and end
 * immediately resulting in a DOM element that is at its final state. This final state is when the DOM element
 * has no CSS transition/animation cl***REMOVED***es applied to it.
 *
 * <h2>JavaScript-defined Animations</h2>
 * In the event that you do not want to use CSS3 transitions or CSS3 animations or if you wish to offer animations on browsers that do not
 * yet support CSS transitions/animations, then you can make use of JavaScript animations defined inside of your AngularJS module.
 *
 * <pre>
 * //!annotate="YourApp" Your AngularJS Module|Replace this or ngModule with the module that you used to define your application.
 * var ngModule = angular.module('YourApp', []);
 * ngModule.animation('.my-crazy-animation', function() {
 *   return {
 *     enter: function(element, done) {
 *       //run the animation
 *       //!annotate Cancel Animation|This function (if provided) will perform the cancellation of the animation when another is triggered
 *       return function(element, done) {
 *         //cancel the animation
 *       }
 *     }
 *     leave: function(element, done) { },
 *     move: function(element, done) { },
 *     show: function(element, done) { },
 *     hide: function(element, done) { },
 *     addCl***REMOVED***: function(element, cl***REMOVED***Name, done) { },
 *     removeCl***REMOVED***: function(element, cl***REMOVED***Name, done) { },
 *   }
 * });
 * </pre>
 *
 * JavaScript-defined animations are created with a CSS-like cl***REMOVED*** selector and a collection of events which are set to run
 * a javascript callback function. When an animation is triggered, $animate will look for a matching animation which fits
 * the element's CSS cl***REMOVED*** attribute value and then run the matching animation event function (if found).
 * In other words, if the CSS cl***REMOVED***es present on the animated element match any of the JavaScript animations then the callback function
 * be executed. It should be also noted that only simple cl***REMOVED*** selectors are allowed.
 *
 * Within a JavaScript animation, an object containing various event callback animation functions is expected to be returned.
 * As explained above, these callbacks are triggered based on the animation event. Therefore if an enter animation is run,
 * and the JavaScript animation is found, then the enter callback will handle that animation (in addition to the CSS keyframe animation
 * or transition code that is defined via a stylesheet).
 *
 */

angular.module('ngAnimate', ['ng'])

  /**
   * @ngdoc object
   * @name ngAnimate.$animateProvider
   * @description
   *
   * The `$AnimationProvider` allows developers to register and access custom JavaScript animations directly inside
   * of a module. When an animation is triggered, the $animate ***REMOVED*** will query the $animation function to find any
   * animations that match the provided name value.
   *
   * Requires the {@link ngAnimate `ngAnimate`} module to be installed.
   *
   * Please visit the {@link ngAnimate `ngAnimate`} module overview page learn more about how to use animations in your application.
   *
   */
  .config(['$provide', '$animateProvider', function($provide, $animateProvider) {
    var noop = angular.noop;
    var forEach = angular.forEach;
    var selectors = $animateProvider.$$selectors;

    var NG_ANIMATE_STATE = '$$ngAnimateState';
    var rootAnimateState = {running:true};
    $provide.decorator('$animate', ['$delegate', '$injector', '$sniffer', '$rootElement', '$timeout', '$rootScope',
                            function($delegate,   $injector,   $sniffer,   $rootElement,   $timeout,   $rootScope) {
        
      $rootElement.data(NG_ANIMATE_STATE, rootAnimateState);

      function lookup(name) {
        if (name) {
          var matches = [],
              flagMap = {},
              cl***REMOVED***es = name.substr(1).split('.');

          //the empty string value is the default animation
          //operation which performs CSS transition and keyframe
          //animations sniffing. This is always included for each
          //element animation procedure
          cl***REMOVED***es.push('');

          for(var i=0; i < cl***REMOVED***es.length; i++) {
            var kl***REMOVED*** = cl***REMOVED***es[i],
                selectorFactoryName = selectors[kl***REMOVED***];
            if(selectorFactoryName && !flagMap[kl***REMOVED***]) {
              matches.push($injector.get(selectorFactoryName));
              flagMap[kl***REMOVED***] = true;
            }
          }
          return matches;
        }
      }

      /**
       * @ngdoc object
       * @name ngAnimate.$animate
       * @requires $timeout, $sniffer, $rootElement
       * @function
       *
       * @description
       * The `$animate` ***REMOVED*** provides animation detection support while performing DOM operations (enter, leave and move)
       * as well as during addCl***REMOVED*** and removeCl***REMOVED*** operations. When any of these operations are run, the $animate ***REMOVED***
       * will examine any JavaScript-defined animations (which are defined by using the $animateProvider provider object)
       * as well as any CSS-defined animations against the CSS cl***REMOVED***es present on the element once the DOM operation is run.
       *
       * The `$animate` ***REMOVED*** is used behind the scenes with pre-existing directives and animation with these directives
       * will work out of the box without any extra configuration.
       *
       * Requires the {@link ngAnimate `ngAnimate`} module to be installed.
       *
       * Please visit the {@link ngAnimate `ngAnimate`} module overview page learn more about how to use animations in your application.
       *
       */
      return {
        /**
         * @ngdoc function
         * @name ngAnimate.$animate#enter
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @description
         * Appends the element to the parent element that resides in the document and then runs the enter animation. Once
         * the animation is started, the following CSS cl***REMOVED***es will be present on the element for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during enter animation:
         *
         * | Animation Step                                                                               | What the element cl***REMOVED*** attribute looks like   |
         * |----------------------------------------------------------------------------------------------|-----------------------------------------------|
         * | 1. $animate.enter(...) is called                                                             | cl***REMOVED***="my-animation"                          |
         * | 2. element is inserted into the parent element or beside the after element                   | cl***REMOVED***="my-animation"                          |
         * | 3. $animate runs any JavaScript-defined animations on the element                            | cl***REMOVED***="my-animation"                          |
         * | 4. the .ng-enter cl***REMOVED*** is added to the element                                               | cl***REMOVED***="my-animation ng-enter"                 |
         * | 5. $animate scans the element styles to get the CSS transition/animation duration and delay  | cl***REMOVED***="my-animation ng-enter"                 |
         * | 6. the .ng-enter-active cl***REMOVED*** is added (this triggers the CSS transition/animation)          | cl***REMOVED***="my-animation ng-enter ng-enter-active" |
         * | 7. $animate waits for X milliseconds for the animation to complete                           | cl***REMOVED***="my-animation ng-enter ng-enter-active" |
         * | 8. The animation ends and both CSS cl***REMOVED***es are removed from the element                      | cl***REMOVED***="my-animation"                          |
         * | 9. The done() callback is fired (if provided)                                                | cl***REMOVED***="my-animation"                          |
         *
         * @param {jQuery/jqLite element} element the element that will be the focus of the enter animation
         * @param {jQuery/jqLite element} parent the parent element of the element that will be the focus of the enter animation
         * @param {jQuery/jqLite element} after the sibling element (which is the previous element) of the element that will be the focus of the enter animation
         * @param {function()=} done callback function that will be called once the animation is complete
        */
        enter : function(element, parent, after, done) {
          $delegate.enter(element, parent, after);
          $rootScope.$$postDigest(function() {
            performAnimation('enter', 'ng-enter', element, parent, after, function() {
              done && $timeout(done, 0, false);
            });
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#leave
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @description
         * Runs the leave animation operation and, upon completion, removes the element from the DOM. Once
         * the animation is started, the following CSS cl***REMOVED***es will be added for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during enter animation:
         *
         * | Animation Step                                                                               | What the element cl***REMOVED*** attribute looks like  |
         * |----------------------------------------------------------------------------------------------|----------------------------------------------|
         * | 1. $animate.leave(...) is called                                                             | cl***REMOVED***="my-animation"                         |
         * | 2. $animate runs any JavaScript-defined animations on the element                            | cl***REMOVED***="my-animation"                         |
         * | 3. the .ng-leave cl***REMOVED*** is added to the element                                               | cl***REMOVED***="my-animation ng-leave"                |
         * | 4. $animate scans the element styles to get the CSS transition/animation duration and delay  | cl***REMOVED***="my-animation ng-leave"                |
         * | 5. the .ng-leave-active cl***REMOVED*** is added (this triggers the CSS transition/animation)          | cl***REMOVED***="my-animation ng-leave ng-leave-active |
         * | 6. $animate waits for X milliseconds for the animation to complete                           | cl***REMOVED***="my-animation ng-leave ng-leave-active |
         * | 7. The animation ends and both CSS cl***REMOVED***es are removed from the element                      | cl***REMOVED***="my-animation"                         |
         * | 8. The element is removed from the DOM                                                       | ...                                          |
         * | 9. The done() callback is fired (if provided)                                                | ...                                          |
         *
         * @param {jQuery/jqLite element} element the element that will be the focus of the leave animation
         * @param {function()=} done callback function that will be called once the animation is complete
        */
        leave : function(element, done) {
          $rootScope.$$postDigest(function() {
            performAnimation('leave', 'ng-leave', element, null, null, function() {
              $delegate.leave(element, done);
            });
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#move
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @description
         * Fires the move DOM operation. Just before the animation starts, the animate ***REMOVED*** will either append it into the parent container or
         * add the element directly after the after element if present. Then the move animation will be run. Once
         * the animation is started, the following CSS cl***REMOVED***es will be added for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during move animation:
         *
         * | Animation Step                                                                               | What the element cl***REMOVED*** attribute looks like |
         * |----------------------------------------------------------------------------------------------|---------------------------------------------|
         * | 1. $animate.move(...) is called                                                              | cl***REMOVED***="my-animation"                        |
         * | 2. element is moved into the parent element or beside the after element                      | cl***REMOVED***="my-animation"                        |
         * | 3. $animate runs any JavaScript-defined animations on the element                            | cl***REMOVED***="my-animation"                        |
         * | 4. the .ng-move cl***REMOVED*** is added to the element                                                | cl***REMOVED***="my-animation ng-move"                |
         * | 5. $animate scans the element styles to get the CSS transition/animation duration and delay  | cl***REMOVED***="my-animation ng-move"                |
         * | 6. the .ng-move-active cl***REMOVED*** is added (this triggers the CSS transition/animation)           | cl***REMOVED***="my-animation ng-move ng-move-active" |
         * | 7. $animate waits for X milliseconds for the animation to complete                           | cl***REMOVED***="my-animation ng-move ng-move-active" |
         * | 8. The animation ends and both CSS cl***REMOVED***es are removed from the element                      | cl***REMOVED***="my-animation"                        |
         * | 9. The done() callback is fired (if provided)                                                | cl***REMOVED***="my-animation"                        |
         *
         * @param {jQuery/jqLite element} element the element that will be the focus of the move animation
         * @param {jQuery/jqLite element} parent the parent element of the element that will be the focus of the move animation
         * @param {jQuery/jqLite element} after the sibling element (which is the previous element) of the element that will be the focus of the move animation
         * @param {function()=} done callback function that will be called once the animation is complete
        */
        move : function(element, parent, after, done) {
          $delegate.move(element, parent, after);
          $rootScope.$$postDigest(function() {
            performAnimation('move', 'ng-move', element, null, null, function() {
              done && $timeout(done, 0, false);
            });
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#addCl***REMOVED***
         * @methodOf ngAnimate.$animate
         *
         * @description
         * Triggers a custom animation event based off the cl***REMOVED***Name variable and then attaches the cl***REMOVED***Name value to the element as a CSS cl***REMOVED***.
         * Unlike the other animation methods, the animate ***REMOVED*** will suffix the cl***REMOVED***Name value with {@type -add} in order to provide
         * the animate ***REMOVED*** the setup and active CSS cl***REMOVED***es in order to trigger the animation (this will be skipped if no CSS transitions
         * or keyframes are defined on the -add CSS cl***REMOVED***).
         *
         * Below is a breakdown of each step that occurs during addCl***REMOVED*** animation:
         *
         * | Animation Step                                                                                 | What the element cl***REMOVED*** attribute looks like |
         * |------------------------------------------------------------------------------------------------|---------------------------------------------|
         * | 1. $animate.addCl***REMOVED***(element, 'super') is called                                               | cl***REMOVED***=""                                    |
         * | 2. $animate runs any JavaScript-defined animations on the element                              | cl***REMOVED***=""                                    |
         * | 3. the .super-add cl***REMOVED*** is added to the element                                                | cl***REMOVED***="super-add"                           |
         * | 4. $animate scans the element styles to get the CSS transition/animation duration and delay    | cl***REMOVED***="super-add"                           |
         * | 5. the .super-add-active cl***REMOVED*** is added (this triggers the CSS transition/animation)           | cl***REMOVED***="super-add super-add-active"          |
         * | 6. $animate waits for X milliseconds for the animation to complete                             | cl***REMOVED***="super-add super-add-active"          |
         * | 7. The animation ends and both CSS cl***REMOVED***es are removed from the element                        | cl***REMOVED***=""                                    |
         * | 8. The super cl***REMOVED*** is added to the element                                                     | cl***REMOVED***="super"                               |
         * | 9. The done() callback is fired (if provided)                                                  | cl***REMOVED***="super"                               |
         *
         * @param {jQuery/jqLite element} element the element that will be animated
         * @param {string} cl***REMOVED***Name the CSS cl***REMOVED*** that will be animated and then attached to the element
         * @param {function()=} done callback function that will be called once the animation is complete
        */
        addCl***REMOVED*** : function(element, cl***REMOVED***Name, done) {
          performAnimation('addCl***REMOVED***', cl***REMOVED***Name, element, null, null, function() {
            $delegate.addCl***REMOVED***(element, cl***REMOVED***Name, done);
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#removeCl***REMOVED***
         * @methodOf ngAnimate.$animate
         *
         * @description
         * Triggers a custom animation event based off the cl***REMOVED***Name variable and then removes the CSS cl***REMOVED*** provided by the cl***REMOVED***Name value
         * from the element. Unlike the other animation methods, the animate ***REMOVED*** will suffix the cl***REMOVED***Name value with {@type -remove} in
         * order to provide the animate ***REMOVED*** the setup and active CSS cl***REMOVED***es in order to trigger the animation (this will be skipped if
         * no CSS transitions or keyframes are defined on the -remove CSS cl***REMOVED***).
         *
         * Below is a breakdown of each step that occurs during removeCl***REMOVED*** animation:
         *
         * | Animation Step                                                                                | What the element cl***REMOVED*** attribute looks like     |
         * |-----------------------------------------------------------------------------------------------|-------------------------------------------------|
         * | 1. $animate.removeCl***REMOVED***(element, 'super') is called                                           | cl***REMOVED***="super"                                   |
         * | 2. $animate runs any JavaScript-defined animations on the element                             | cl***REMOVED***="super"                                   |
         * | 3. the .super-remove cl***REMOVED*** is added to the element                                            | cl***REMOVED***="super super-remove"                      |
         * | 4. $animate scans the element styles to get the CSS transition/animation duration and delay   | cl***REMOVED***="super super-remove"                      |
         * | 5. the .super-remove-active cl***REMOVED*** is added (this triggers the CSS transition/animation)       | cl***REMOVED***="super super-remove super-remove-active"  |
         * | 6. $animate waits for X milliseconds for the animation to complete                            | cl***REMOVED***="super super-remove super-remove-active"  |
         * | 7. The animation ends and both CSS all three cl***REMOVED***es are removed from the element             | cl***REMOVED***=""                                        |
         * | 8. The done() callback is fired (if provided)                                                 | cl***REMOVED***=""                                        |
         *
         * @param {jQuery/jqLite element} element the element that will be animated
         * @param {string} cl***REMOVED***Name the CSS cl***REMOVED*** that will be animated and then removed from the element
         * @param {function()=} done callback function that will be called once the animation is complete
        */
        removeCl***REMOVED*** : function(element, cl***REMOVED***Name, done) {
          performAnimation('removeCl***REMOVED***', cl***REMOVED***Name, element, null, null, function() {
            $delegate.removeCl***REMOVED***(element, cl***REMOVED***Name, done);
          });
        },

        /**
         * @ngdoc function
         * @name ngAnimate.$animate#enabled
         * @methodOf ngAnimate.$animate
         * @function
         *
         * @param {boolean=} value If provided then set the animation on or off.
         * @return {boolean} Current animation state.
         *
         * @description
         * Globally enables/disables animations.
         *
        */
        enabled : function(value) {
          if (arguments.length) {
            rootAnimateState.running = !value;
          }
          return !rootAnimateState.running;
        }
      };

      /*
        all animations call this shared animation triggering function internally.
        The event variable refers to the JavaScript animation event that will be triggered
        and the cl***REMOVED***Name value is the name of the animation that will be applied within the
        CSS code. Element, parent and after are provided DOM elements for the animation
        and the onComplete callback will be fired once the animation is fully complete.
      */
      function performAnimation(event, cl***REMOVED***Name, element, parent, after, onComplete) {
        var cl***REMOVED***es = (element.attr('cl***REMOVED***') || '') + ' ' + cl***REMOVED***Name;
        var animationLookup = (' ' + cl***REMOVED***es).replace(/\s+/g,'.'),
            animations = [];
        forEach(lookup(animationLookup), function(animation, index) {
          animations.push({
            start : animation[event]
          });
        });

        if (!parent) {
          parent = after ? after.parent() : element.parent();
        }
        var disabledAnimation = { running : true };

        //skip the animation if animations are disabled, a parent is already being animated
        //or the element is not currently attached to the document body.
        if ((parent.inheritedData(NG_ANIMATE_STATE) || disabledAnimation).running) {
          //avoid calling done() since there is no need to remove any
          //data or cl***REMOVED***Name values since this happens earlier than that
          //and also use a timeout so that it won't be asynchronous
          $timeout(onComplete || noop, 0, false);
          return;
        }

        var ngAnimateState = element.data(NG_ANIMATE_STATE) || {};

        //if an animation is currently running on the element then lets take the steps
        //to cancel that animation and fire any required callbacks
        if(ngAnimateState.running) {
          cancelAnimations(ngAnimateState.animations);
          ngAnimateState.done();
        }

        element.data(NG_ANIMATE_STATE, {
          running:true,
          animations:animations,
          done:done
        });

        forEach(animations, function(animation, index) {
          var fn = function() {
            progress(index);
          };

          if(animation.start) {
            if(event == 'addCl***REMOVED***' || event == 'removeCl***REMOVED***') {
              animation.endFn = animation.start(element, cl***REMOVED***Name, fn);
            } else {
              animation.endFn = animation.start(element, fn);
            }
          } else {
            fn();
          }
        });

        function cancelAnimations(animations) {
          var isCancelledFlag = true;
          forEach(animations, function(animation) {
            (animation.endFn || noop)(isCancelledFlag);
          });
        }

        function progress(index) {
          animations[index].done = true;
          (animations[index].endFn || noop)();
          for(var i=0;i<animations.length;i++) {
            if(!animations[i].done) return;
          }
          done();
        }

        function done() {
          if(!done.hasBeenRun) {
            done.hasBeenRun = true;
            element.removeData(NG_ANIMATE_STATE);
            (onComplete || noop)();
          }
        }
      }
    }]);

    $animateProvider.register('', ['$window','$sniffer', '$timeout', function($window, $sniffer, $timeout) {
      var noop = angular.noop;
      var forEach = angular.forEach;

      //one day all browsers will have these properties
      var w3cAnimationProp = 'animation';
      var w3cTransitionProp = 'transition';

      //but some still use vendor-prefixed styles
      var vendorAnimationProp = $sniffer.vendorPrefix + 'Animation';
      var vendorTransitionProp = $sniffer.vendorPrefix + 'Transition';

      var durationKey = 'Duration',
          delayKey = 'Delay',
          propertyKey = 'Property',
          animationIterationCountKey = 'IterationCount',
          ELEMENT_NODE = 1;

      function animate(element, cl***REMOVED***Name, done) {
        if (!($sniffer.transitions || $sniffer.animations)) {
          done();
          return;
        }
        else if(['ng-enter','ng-leave','ng-move'].indexOf(cl***REMOVED***Name) == -1) {
          var existingDuration = 0;
          forEach(element, function(element) {
            if (element.nodeType == ELEMENT_NODE) {
              var elementStyles = $window.getComputedStyle(element) || {};
              existingDuration = Math.max(parseMaxTime(elementStyles[w3cTransitionProp + durationKey]),
                                          parseMaxTime(elementStyles[vendorTransitionProp + durationKey]),
                                          existingDuration);
            }
          });
          if(existingDuration > 0) {
            done();
            return;
          }
        }

        element.addCl***REMOVED***(cl***REMOVED***Name);

        //we want all the styles defined before and after
        var duration = 0;
        forEach(element, function(element) {
          if (element.nodeType == ELEMENT_NODE) {
            var elementStyles = $window.getComputedStyle(element) || {};

            var transitionDelay     = Math.max(parseMaxTime(elementStyles[w3cTransitionProp     + delayKey]),
                                               parseMaxTime(elementStyles[vendorTransitionProp  + delayKey]));

            var animationDelay      = Math.max(parseMaxTime(elementStyles[w3cAnimationProp      + delayKey]),
                                               parseMaxTime(elementStyles[vendorAnimationProp   + delayKey]));

            var transitionDuration  = Math.max(parseMaxTime(elementStyles[w3cTransitionProp     + durationKey]),
                                               parseMaxTime(elementStyles[vendorTransitionProp  + durationKey]));

            var animationDuration   = Math.max(parseMaxTime(elementStyles[w3cAnimationProp      + durationKey]),
                                               parseMaxTime(elementStyles[vendorAnimationProp   + durationKey]));

            if(animationDuration > 0) {
              animationDuration *= Math.max(parseInt(elementStyles[w3cAnimationProp   + animationIterationCountKey]) || 0,
                                           parseInt(elementStyles[vendorAnimationProp + animationIterationCountKey]) || 0,
                                           1);
            }

            duration = Math.max(animationDelay  + animationDuration,
                                transitionDelay + transitionDuration,
                                duration);
          }
        });

        /* there is no point in performing a reflow if the animation
           timeout is empty (this would cause a flicker bug normally
           in the page */
        if(duration > 0) {
          var node = element[0];

          //temporarily disable the transition so that the enter styles
          //don't animate twice (this is here to avoid a bug in Chrome/FF).
          node.style[w3cTransitionProp + propertyKey] = 'none';
          node.style[vendorTransitionProp + propertyKey] = 'none';

          var activeCl***REMOVED***Name = '';
          forEach(cl***REMOVED***Name.split(' '), function(kl***REMOVED***, i) {
            activeCl***REMOVED***Name += (i > 0 ? ' ' : '') + kl***REMOVED*** + '-active';
          });

          //this triggers a reflow which allows for the transition animation to kick in
          element.prop('clientWidth');
          node.style[w3cTransitionProp + propertyKey] = '';
          node.style[vendorTransitionProp + propertyKey] = '';
          element.addCl***REMOVED***(activeCl***REMOVED***Name);

          $timeout(done, duration * 1000, false);

          //this will automatically be called by $animate so
          //there is no need to attach this internally to the
          //timeout done method
          return function onEnd(cancelled) {
            element.removeCl***REMOVED***(cl***REMOVED***Name);
            element.removeCl***REMOVED***(activeCl***REMOVED***Name);

            //only when the animation is cancelled is the done()
            //function not called for this animation therefore
            //this must be also called
            if(cancelled) {
              done();
            }
          }
        }
        else {
          element.removeCl***REMOVED***(cl***REMOVED***Name);
          done();
        }

        function parseMaxTime(str) {
          var total = 0, values = angular.isString(str) ? str.split(/\s*,\s*/) : [];
          forEach(values, function(value) {
            total = Math.max(parseFloat(value) || 0, total);
          });
          return total;
        }
      }

      return {
        enter : function(element, done) {
          return animate(element, 'ng-enter', done);
        },
        leave : function(element, done) {
          return animate(element, 'ng-leave', done);
        },
        move : function(element, done) {
          return animate(element, 'ng-move', done);
        },
        addCl***REMOVED*** : function(element, cl***REMOVED***Name, done) {
          return animate(element, suffixCl***REMOVED***es(cl***REMOVED***Name, '-add'), done);
        },
        removeCl***REMOVED*** : function(element, cl***REMOVED***Name, done) {
          return animate(element, suffixCl***REMOVED***es(cl***REMOVED***Name, '-remove'), done);
        }
      };

      function suffixCl***REMOVED***es(cl***REMOVED***es, suffix) {
        var cl***REMOVED***Name = '';
        cl***REMOVED***es = angular.isArray(cl***REMOVED***es) ? cl***REMOVED***es : cl***REMOVED***es.split(/\s+/);
        forEach(cl***REMOVED***es, function(kl***REMOVED***, i) {
          if(kl***REMOVED*** && kl***REMOVED***.length > 0) {
            cl***REMOVED***Name += (i > 0 ? ' ' : '') + kl***REMOVED*** + suffix;
          }
        });
        return cl***REMOVED***Name;
      }
    }]);
  }]);


})(window, window.angular);
