/**
 * @license AngularJS v1.3.12
 * (c) 2010-2014 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

/* jshint maxlen: false */

/**
 * @ngdoc module
 * @name ngAnimate
 * @description
 *
 * The `ngAnimate` module provides support for JavaScript, CSS3 transition and CSS3 keyframe animation hooks within existing core and custom directives.
 *
 * <div doc-module-components="ngAnimate"></div>
 *
 * # Usage
 *
 * To see animations in action, all that is required is to define the appropriate CSS cl***REMOVED***es
 * or to register a JavaScript animation via the `myModule.animation()` function. The directives that support animation automatically are:
 * `ngRepeat`, `ngInclude`, `ngIf`, `ngSwitch`, `ngShow`, `ngHide`, `ngView` and `ngCl***REMOVED***`. Custom directives can take advantage of animation
 * by using the `$animate` ***REMOVED***.
 *
 * Below is a more detailed breakdown of the supported animation events provided by pre-existing ng directives:
 *
 * | Directive                                                                                                | Supported Animations                                                     |
 * |----------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
 * | {@link ng.directive:ngRepeat#animations ngRepeat}                                                        | enter, leave and move                                                    |
 * | {@link ngRoute.directive:ngView#animations ngView}                                                       | enter and leave                                                          |
 * | {@link ng.directive:ngInclude#animations ngInclude}                                                      | enter and leave                                                          |
 * | {@link ng.directive:ngSwitch#animations ngSwitch}                                                        | enter and leave                                                          |
 * | {@link ng.directive:ngIf#animations ngIf}                                                                | enter and leave                                                          |
 * | {@link ng.directive:ngCl***REMOVED***#animations ngCl***REMOVED***}                                                          | add and remove (the CSS cl***REMOVED***(es) present)                               |
 * | {@link ng.directive:ngShow#animations ngShow} & {@link ng.directive:ngHide#animations ngHide}            | add and remove (the ng-hide cl***REMOVED*** value)                                 |
 * | {@link ng.directive:form#animation-hooks form} & {@link ng.directive:ngModel#animation-hooks ngModel}    | add and remove (dirty, pristine, valid, invalid & all other validations) |
 * | {@link module:ngMessages#animations ngMessages}                                                          | add and remove (ng-active & ng-inactive)                                 |
 * | {@link module:ngMessages#animations ngMessage}                                                           | enter and leave                                                          |
 *
 * You can find out more information about animations upon visiting each directive page.
 *
 * Below is an example of how to apply animations to a directive that supports animation hooks:
 *
 * ```html
 * <style type="text/css">
 * .slide.ng-enter, .slide.ng-leave {
 *   -webkit-transition:0.5s linear all;
 *   transition:0.5s linear all;
 * }
 *
 * .slide.ng-enter { }        /&#42; starting animations for enter &#42;/
 * .slide.ng-enter.ng-enter-active { } /&#42; terminal animations for enter &#42;/
 * .slide.ng-leave { }        /&#42; starting animations for leave &#42;/
 * .slide.ng-leave.ng-leave-active { } /&#42; terminal animations for leave &#42;/
 * </style>
 *
 * <!--
 * the animate ***REMOVED*** will automatically add .ng-enter and .ng-leave to the element
 * to trigger the CSS transition/animations
 * -->
 * <ANY cl***REMOVED***="slide" ng-include="..."></ANY>
 * ```
 *
 * Keep in mind that, by default, if an animation is running, any child elements cannot be animated
 * until the parent element's animation has completed. This blocking feature can be overridden by
 * placing the `ng-animate-children` attribute on a parent container tag.
 *
 * ```html
 * <div cl***REMOVED***="slide-animation" ng-if="on" ng-animate-children>
 *   <div cl***REMOVED***="fade-animation" ng-if="on">
 *     <div cl***REMOVED***="explode-animation" ng-if="on">
 *        ...
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * When the `on` expression value changes and an animation is triggered then each of the elements within
 * will all animate without the block being applied to child elements.
 *
 * ## Are animations run when the application starts?
 * No they are not. When an application is bootstrapped Angular will disable animations from running to avoid
 * a frenzy of animations from being triggered as soon as the browser has rendered the screen. For this to work,
 * Angular will wait for two digest cycles until enabling animations. From there on, any animation-triggering
 * layout changes in the application will trigger animations as normal.
 *
 * In addition, upon bootstrap, if the routing system or any directives or load remote data (via $http) then Angular
 * will automatically extend the wait time to enable animations once **all** of the outbound HTTP requests
 * are complete.
 *
 * ## CSS-defined Animations
 * The animate ***REMOVED*** will automatically apply two CSS cl***REMOVED***es to the animated element and these two CSS cl***REMOVED***es
 * are designed to contain the start and end CSS styling. Both CSS transitions and keyframe animations are supported
 * and can be used to play along with this naming structure.
 *
 * The following code below demonstrates how to perform animations using **CSS transitions** with Angular:
 *
 * ```html
 * <style type="text/css">
 * /&#42;
 *  The animate cl***REMOVED*** is apart of the element and the ng-enter cl***REMOVED***
 *  is attached to the element once the enter animation event is triggered
 * &#42;/
 * .reveal-animation.ng-enter {
 *  -webkit-transition: 1s linear all; /&#42; Safari/Chrome &#42;/
 *  transition: 1s linear all; /&#42; All other modern browsers and IE10+ &#42;/
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
 * ```
 *
 * The following code below demonstrates how to perform animations using **CSS animations** with Angular:
 *
 * ```html
 * <style type="text/css">
 * .reveal-animation.ng-enter {
 *   -webkit-animation: enter_sequence 1s linear; /&#42; Safari/Chrome &#42;/
 *   animation: enter_sequence 1s linear; /&#42; IE10+ and Future Browsers &#42;/
 * }
 * @-webkit-keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * @keyframes enter_sequence {
 *   from { opacity:0; }
 *   to { opacity:1; }
 * }
 * </style>
 *
 * <div cl***REMOVED***="view-container">
 *   <div ng-view cl***REMOVED***="reveal-animation"></div>
 * </div>
 * ```
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
 * ### Structural transition animations
 *
 * Structural transitions (such as enter, leave and move) will always apply a `0s none` transition
 * value to force the browser into rendering the styles defined in the setup (`.ng-enter`, `.ng-leave`
 * or `.ng-move`) cl***REMOVED***. This means that any active transition animations operating on the element
 * will be cut off to make way for the enter, leave or move animation.
 *
 * ### Cl***REMOVED***-based transition animations
 *
 * Cl***REMOVED***-based transitions refer to transition animations that are triggered when a CSS cl***REMOVED*** is
 * added to or removed from the element (via `$animate.addCl***REMOVED***`, `$animate.removeCl***REMOVED***`,
 * `$animate.setCl***REMOVED***`, or by directives such as `ngCl***REMOVED***`, `ngModel` and `form`).
 * They are different when compared to structural animations since they **do not cancel existing
 * animations** nor do they **block successive transitions** from rendering on the same element.
 * This distinction allows for **multiple cl***REMOVED***-based transitions** to be performed on the same element.
 *
 * In addition to ngAnimate supporting the default (natural) functionality of cl***REMOVED***-based transition
 * animations, ngAnimate also decorates the element with starting and ending CSS cl***REMOVED***es to aid the
 * developer in further styling the element throughout the transition animation. Earlier versions
 * of ngAnimate may have caused natural CSS transitions to break and not render properly due to
 * $animate temporarily blocking transitions using `0s none` in order to allow the setup CSS cl***REMOVED***
 * (the `-add` or `-remove` cl***REMOVED***) to be applied without triggering an animation. However, as of
 * **version 1.3**, this workaround has been removed with ngAnimate and all non-ngAnimate CSS
 * cl***REMOVED*** transitions are compatible with ngAnimate.
 *
 * There is, however, one special case when dealing with cl***REMOVED***-based transitions in ngAnimate.
 * When rendering cl***REMOVED***-based transitions that make use of the setup and active CSS cl***REMOVED***es
 * (e.g. `.fade-add` and `.fade-add-active` for when `.fade` is added) be sure to define
 * the transition value **on the active CSS cl***REMOVED***** and not the setup cl***REMOVED***.
 *
 * ```css
 * .fade-add {
 *   /&#42; remember to place a 0s transition here
 *      to ensure that the styles are applied instantly
 *      even if the element already has a transition style &#42;/
 *   transition:0s linear all;
 *
 *   /&#42; starting CSS styles &#42;/
 *   opacity:1;
 * }
 * .fade-add.fade-add-active {
 *   /&#42; this will be the length of the animation &#42;/
 *   transition:1s linear all;
 *   opacity:0;
 * }
 * ```
 *
 * The setup CSS cl***REMOVED*** (in this case `.fade-add`) also has a transition style property, however, it
 * has a duration of zero. This may not be required, however, incase the browser is unable to render
 * the styling present in this CSS cl***REMOVED*** instantly then it could be that the browser is attempting
 * to perform an unnecessary transition.
 *
 * This workaround, however, does not apply to  standard cl***REMOVED***-based transitions that are rendered
 * when a CSS cl***REMOVED*** containing a transition is applied to an element:
 *
 * ```css
 * /&#42; this works as expected &#42;/
 * .fade {
 *   transition:1s linear all;
 *   opacity:0;
 * }
 * ```
 *
 * Please keep this in mind when coding the CSS markup that will be used within cl***REMOVED***-based transitions.
 * Also, try not to mix the two cl***REMOVED***-based animation flavors together since the CSS code may become
 * overly complex.
 *
 *
 * ### Preventing Collisions With Third Party Libraries
 *
 * Some third-party frameworks place animation duration defaults across many element or cl***REMOVED***Name
 * selectors in order to make their code small and reuseable. This can lead to issues with ngAnimate, which
 * is expecting actual animations on these elements and has to wait for their completion.
 *
 * You can prevent this unwanted behavior by using a prefix on all your animation cl***REMOVED***es:
 *
 * ```css
 * /&#42; prefixed with animate- &#42;/
 * .animate-fade-add.animate-fade-add-active {
 *   transition:1s linear all;
 *   opacity:0;
 * }
 * ```
 *
 * You then configure `$animate` to enforce this prefix:
 *
 * ```js
 * $animateProvider.cl***REMOVED***NameFilter(/animate-/);
 * ```
 * </div>
 *
 * ### CSS Staggering Animations
 * A Staggering animation is a collection of animations that are issued with a slight delay in between each successive operation resulting in a
 * curtain-like effect. The ngAnimate module (versions >=1.2) supports staggering animations and the stagger effect can be
 * performed by creating a **ng-EVENT-stagger** CSS cl***REMOVED*** and attaching that cl***REMOVED*** to the base CSS cl***REMOVED*** used for
 * the animation. The style property expected within the stagger cl***REMOVED*** can either be a **transition-delay** or an
 * **animation-delay** property (or both if your animation contains both transitions and keyframe animations).
 *
 * ```css
 * .my-animation.ng-enter {
 *   /&#42; standard transition code &#42;/
 *   -webkit-transition: 1s linear all;
 *   transition: 1s linear all;
 *   opacity:0;
 * }
 * .my-animation.ng-enter-stagger {
 *   /&#42; this will have a 100ms delay between each successive leave animation &#42;/
 *   -webkit-transition-delay: 0.1s;
 *   transition-delay: 0.1s;
 *
 *   /&#42; in case the stagger doesn't work then these two values
 *    must be set to 0 to avoid an accidental CSS inheritance &#42;/
 *   -webkit-transition-duration: 0s;
 *   transition-duration: 0s;
 * }
 * .my-animation.ng-enter.ng-enter-active {
 *   /&#42; standard transition styles &#42;/
 *   opacity:1;
 * }
 * ```
 *
 * Staggering animations work by default in ngRepeat (so long as the CSS cl***REMOVED*** is defined). Outside of ngRepeat, to use staggering animations
 * on your own, they can be triggered by firing multiple calls to the same event on $animate. However, the restrictions surrounding this
 * are that each of the elements must have the same CSS cl***REMOVED***Name value as well as the same parent element. A stagger operation
 * will also be reset if more than 10ms has p***REMOVED***ed after the last animation has been fired.
 *
 * The following code will issue the **ng-leave-stagger** event on the element provided:
 *
 * ```js
 * var kids = parent.children();
 *
 * $animate.leave(kids[0]); //stagger index=0
 * $animate.leave(kids[1]); //stagger index=1
 * $animate.leave(kids[2]); //stagger index=2
 * $animate.leave(kids[3]); //stagger index=3
 * $animate.leave(kids[4]); //stagger index=4
 *
 * $timeout(function() {
 *   //stagger has reset itself
 *   $animate.leave(kids[5]); //stagger index=0
 *   $animate.leave(kids[6]); //stagger index=1
 * }, 100, false);
 * ```
 *
 * Stagger animations are currently only supported within CSS-defined animations.
 *
 * ## JavaScript-defined Animations
 * In the event that you do not want to use CSS3 transitions or CSS3 animations or if you wish to offer animations on browsers that do not
 * yet support CSS transitions/animations, then you can make use of JavaScript animations defined inside of your AngularJS module.
 *
 * ```js
 * //!annotate="YourApp" Your AngularJS Module|Replace this or ngModule with the module that you used to define your application.
 * var ngModule = angular.module('YourApp', ['ngAnimate']);
 * ngModule.animation('.my-crazy-animation', function() {
 *   return {
 *     enter: function(element, done) {
 *       //run the animation here and call done when the animation is complete
 *       return function(cancelled) {
 *         //this (optional) function will be called when the animation
 *         //completes or when the animation is cancelled (the cancelled
 *         //flag will be set to true if cancelled).
 *       };
 *     },
 *     leave: function(element, done) { },
 *     move: function(element, done) { },
 *
 *     //animation that can be triggered before the cl***REMOVED*** is added
 *     beforeAddCl***REMOVED***: function(element, cl***REMOVED***Name, done) { },
 *
 *     //animation that can be triggered after the cl***REMOVED*** is added
 *     addCl***REMOVED***: function(element, cl***REMOVED***Name, done) { },
 *
 *     //animation that can be triggered before the cl***REMOVED*** is removed
 *     beforeRemoveCl***REMOVED***: function(element, cl***REMOVED***Name, done) { },
 *
 *     //animation that can be triggered after the cl***REMOVED*** is removed
 *     removeCl***REMOVED***: function(element, cl***REMOVED***Name, done) { }
 *   };
 * });
 * ```
 *
 * JavaScript-defined animations are created with a CSS-like cl***REMOVED*** selector and a collection of events which are set to run
 * a javascript callback function. When an animation is triggered, $animate will look for a matching animation which fits
 * the element's CSS cl***REMOVED*** attribute value and then run the matching animation event function (if found).
 * In other words, if the CSS cl***REMOVED***es present on the animated element match any of the JavaScript animations then the callback function will
 * be executed. It should be also noted that only simple, single cl***REMOVED*** selectors are allowed (compound cl***REMOVED*** selectors are not supported).
 *
 * Within a JavaScript animation, an object containing various event callback animation functions is expected to be returned.
 * As explained above, these callbacks are triggered based on the animation event. Therefore if an enter animation is run,
 * and the JavaScript animation is found, then the enter callback will handle that animation (in addition to the CSS keyframe animation
 * or transition code that is defined via a stylesheet).
 *
 *
 * ### Applying Directive-specific Styles to an Animation
 * In some cases a directive or ***REMOVED*** may want to provide `$animate` with extra details that the animation will
 * include into its animation. Let's say for example we wanted to render an animation that animates an element
 * towards the mouse coordinates as to where the user clicked last. By collecting the X/Y coordinates of the click
 * (via the event parameter) we can set the `top` and `left` styles into an object and p***REMOVED*** that into our function
 * call to `$animate.addCl***REMOVED***`.
 *
 * ```js
 * canvas.on('click', function(e) {
 *   $animate.addCl***REMOVED***(element, 'on', {
 *     to: {
 *       left : e.client.x + 'px',
 *       top : e.client.y + 'px'
 *     }
 *   }):
 * });
 * ```
 *
 * Now when the animation runs, and a transition or keyframe animation is picked up, then the animation itself will
 * also include and transition the styling of the `left` and `top` properties into its running animation. If we want
 * to provide some starting animation values then we can do so by placing the starting animations styles into an object
 * called `from` in the same object as the `to` animations.
 *
 * ```js
 * canvas.on('click', function(e) {
 *   $animate.addCl***REMOVED***(element, 'on', {
 *     from: {
 *        position: 'absolute',
 *        left: '0px',
 *        top: '0px'
 *     },
 *     to: {
 *       left : e.client.x + 'px',
 *       top : e.client.y + 'px'
 *     }
 *   }):
 * });
 * ```
 *
 * Once the animation is complete or cancelled then the union of both the before and after styles are applied to the
 * element. If `ngAnimate` is not present then the styles will be applied immediately.
 *
 */

angular.module('ngAnimate', ['ng'])

  /**
   * @ngdoc provider
   * @name $animateProvider
   * @description
   *
   * The `$animateProvider` allows developers to register JavaScript animation event handlers directly inside of a module.
   * When an animation is triggered, the $animate ***REMOVED*** will query the $animate ***REMOVED*** to find any animations that match
   * the provided name value.
   *
   * Requires the {@link ngAnimate `ngAnimate`} module to be installed.
   *
   * Please visit the {@link ngAnimate `ngAnimate`} module overview page learn more about how to use animations in your application.
   *
   */
  .directive('ngAnimateChildren', function() {
    var NG_ANIMATE_CHILDREN = '$$ngAnimateChildren';
    return function(scope, element, attrs) {
      var val = attrs.ngAnimateChildren;
      if (angular.isString(val) && val.length === 0) { //empty attribute
        element.data(NG_ANIMATE_CHILDREN, true);
      } else {
        scope.$watch(val, function(value) {
          element.data(NG_ANIMATE_CHILDREN, !!value);
        });
      }
    };
  })

  //this private ***REMOVED*** is only used within CSS-enabled animations
  //IE8 + IE9 do not support rAF natively, but that is fine since they
  //also don't support transitions and keyframes which means that the code
  //below will never be used by the two browsers.
  .factory('$$animateReflow', ['$$rAF', '$document', function($$rAF, $document) {
    var bod = $document[0].body;
    return function(fn) {
      //the returned function acts as the cancellation function
      return $$rAF(function() {
        //the line below will force the browser to perform a repaint
        //so that all the animated elements within the animation frame
        //will be properly updated and drawn on screen. This is
        //required to perform multi-cl***REMOVED*** CSS based animations with
        //Firefox. DO NOT REMOVE THIS LINE.
        var a = bod.offsetWidth + 1;
        fn();
      });
    };
  }])

  .config(['$provide', '$animateProvider', function($provide, $animateProvider) {
    var noop = angular.noop;
    var forEach = angular.forEach;
    var selectors = $animateProvider.$$selectors;
    var isArray = angular.isArray;
    var isString = angular.isString;
    var isObject = angular.isObject;

    var ELEMENT_NODE = 1;
    var NG_ANIMATE_STATE = '$$ngAnimateState';
    var NG_ANIMATE_CHILDREN = '$$ngAnimateChildren';
    var NG_ANIMATE_CLASS_NAME = 'ng-animate';
    var rootAnimateState = {running: true};

    function extractElementNode(element) {
      for (var i = 0; i < element.length; i++) {
        var elm = element[i];
        if (elm.nodeType == ELEMENT_NODE) {
          return elm;
        }
      }
    }

    function prepareElement(element) {
      return element && angular.element(element);
    }

    function stripCommentsFromElement(element) {
      return angular.element(extractElementNode(element));
    }

    function isMatchingElement(elm1, elm2) {
      return extractElementNode(elm1) == extractElementNode(elm2);
    }
    var $$jqLite;
    $provide.decorator('$animate',
        ['$delegate', '$$q', '$injector', '$sniffer', '$rootElement', '$$asyncCallback', '$rootScope', '$document', '$templateRequest', '$$jqLite',
 function($delegate,   $$q,   $injector,   $sniffer,   $rootElement,   $$asyncCallback,   $rootScope,   $document,   $templateRequest,   $$$jqLite) {

      $$jqLite = $$$jqLite;
      $rootElement.data(NG_ANIMATE_STATE, rootAnimateState);

      // Wait until all directive and route-related templates are downloaded and
      // compiled. The $templateRequest.totalPendingRequests variable keeps track of
      // all of the remote templates being currently downloaded. If there are no
      // templates currently downloading then the watcher will still fire anyway.
      var deregisterWatch = $rootScope.$watch(
        function() { return $templateRequest.totalPendingRequests; },
        function(val, oldVal) {
          if (val !== 0) return;
          deregisterWatch();

          // Now that all templates have been downloaded, $animate will wait until
          // the post digest queue is empty before enabling animations. By having two
          // calls to $postDigest calls we can ensure that the flag is enabled at the
          // very end of the post digest queue. Since all of the animations in $animate
          // use $postDigest, it's important that the code below executes at the end.
          // This basically means that the page is fully downloaded and compiled before
          // any animations are triggered.
          $rootScope.$$postDigest(function() {
            $rootScope.$$postDigest(function() {
              rootAnimateState.running = false;
            });
          });
        }
      );

      var globalAnimationCounter = 0;
      var cl***REMOVED***NameFilter = $animateProvider.cl***REMOVED***NameFilter();
      var isAnimatableCl***REMOVED***Name = !cl***REMOVED***NameFilter
              ? function() { return true; }
              : function(cl***REMOVED***Name) {
                return cl***REMOVED***NameFilter.test(cl***REMOVED***Name);
              };

      function cl***REMOVED***BasedAnimationsBlocked(element, setter) {
        var data = element.data(NG_ANIMATE_STATE) || {};
        if (setter) {
          data.running = true;
          data.structural = true;
          element.data(NG_ANIMATE_STATE, data);
        }
        return data.disabled || (data.running && data.structural);
      }

      function runAnimationPostDigest(fn) {
        var cancelFn, defer = $$q.defer();
        defer.promise.$$cancelFn = function() {
          cancelFn && cancelFn();
        };
        $rootScope.$$postDigest(function() {
          cancelFn = fn(function() {
            defer.resolve();
          });
        });
        return defer.promise;
      }

      function parseAnimateOptions(options) {
        // some plugin code may still be p***REMOVED***ing in the callback
        // function as the last param for the $animate methods so
        // it's best to only allow string or array values for now
        if (isObject(options)) {
          if (options.tempCl***REMOVED***es && isString(options.tempCl***REMOVED***es)) {
            options.tempCl***REMOVED***es = options.tempCl***REMOVED***es.split(/\s+/);
          }
          return options;
        }
      }

      function resolveElementCl***REMOVED***es(element, cache, runningAnimations) {
        runningAnimations = runningAnimations || {};

        var lookup = {};
        forEach(runningAnimations, function(data, selector) {
          forEach(selector.split(' '), function(s) {
            lookup[s]=data;
          });
        });

        var hasCl***REMOVED***es = Object.create(null);
        forEach((element.attr('cl***REMOVED***') || '').split(/\s+/), function(cl***REMOVED***Name) {
          hasCl***REMOVED***es[cl***REMOVED***Name] = true;
        });

        var toAdd = [], toRemove = [];
        forEach((cache && cache.cl***REMOVED***es) || [], function(status, cl***REMOVED***Name) {
          var hasCl***REMOVED*** = hasCl***REMOVED***es[cl***REMOVED***Name];
          var matchingAnimation = lookup[cl***REMOVED***Name] || {};

          // When addCl***REMOVED*** and removeCl***REMOVED*** is called then $animate will check to
          // see if addCl***REMOVED*** and removeCl***REMOVED*** cancel each other out. When there are
          // more calls to removeCl***REMOVED*** than addCl***REMOVED*** then the count falls below 0
          // and then the removeCl***REMOVED*** animation will be allowed. Otherwise if the
          // count is above 0 then that means an addCl***REMOVED*** animation will commence.
          // Once an animation is allowed then the code will also check to see if
          // there exists any on-going animation that is already adding or remvoing
          // the matching CSS cl***REMOVED***.
          if (status === false) {
            //does it have the cl***REMOVED*** or will it have the cl***REMOVED***
            if (hasCl***REMOVED*** || matchingAnimation.event == 'addCl***REMOVED***') {
              toRemove.push(cl***REMOVED***Name);
            }
          } else if (status === true) {
            //is the cl***REMOVED*** missing or will it be removed?
            if (!hasCl***REMOVED*** || matchingAnimation.event == 'removeCl***REMOVED***') {
              toAdd.push(cl***REMOVED***Name);
            }
          }
        });

        return (toAdd.length + toRemove.length) > 0 && [toAdd.join(' '), toRemove.join(' ')];
      }

      function lookup(name) {
        if (name) {
          var matches = [],
              flagMap = {},
              cl***REMOVED***es = name.substr(1).split('.');

          //the empty string value is the default animation
          //operation which performs CSS transition and keyframe
          //animations sniffing. This is always included for each
          //element animation procedure if the browser supports
          //transitions and/or keyframe animations. The default
          //animation is added to the top of the list to prevent
          //any previous animations from affecting the element styling
          //prior to the element being animated.
          if ($sniffer.transitions || $sniffer.animations) {
            matches.push($injector.get(selectors['']));
          }

          for (var i=0; i < cl***REMOVED***es.length; i++) {
            var kl***REMOVED*** = cl***REMOVED***es[i],
                selectorFactoryName = selectors[kl***REMOVED***];
            if (selectorFactoryName && !flagMap[kl***REMOVED***]) {
              matches.push($injector.get(selectorFactoryName));
              flagMap[kl***REMOVED***] = true;
            }
          }
          return matches;
        }
      }

      function animationRunner(element, animationEvent, cl***REMOVED***Name, options) {
        //transcluded directives may sometimes fire an animation using only comment nodes
        //best to catch this early on to prevent any animation operations from occurring
        var node = element[0];
        if (!node) {
          return;
        }

        if (options) {
          options.to = options.to || {};
          options.from = options.from || {};
        }

        var cl***REMOVED***NameAdd;
        var cl***REMOVED***NameRemove;
        if (isArray(cl***REMOVED***Name)) {
          cl***REMOVED***NameAdd = cl***REMOVED***Name[0];
          cl***REMOVED***NameRemove = cl***REMOVED***Name[1];
          if (!cl***REMOVED***NameAdd) {
            cl***REMOVED***Name = cl***REMOVED***NameRemove;
            animationEvent = 'removeCl***REMOVED***';
          } else if (!cl***REMOVED***NameRemove) {
            cl***REMOVED***Name = cl***REMOVED***NameAdd;
            animationEvent = 'addCl***REMOVED***';
          } else {
            cl***REMOVED***Name = cl***REMOVED***NameAdd + ' ' + cl***REMOVED***NameRemove;
          }
        }

        var isSetCl***REMOVED***Operation = animationEvent == 'setCl***REMOVED***';
        var isCl***REMOVED***Based = isSetCl***REMOVED***Operation
                           || animationEvent == 'addCl***REMOVED***'
                           || animationEvent == 'removeCl***REMOVED***'
                           || animationEvent == 'animate';

        var currentCl***REMOVED***Name = element.attr('cl***REMOVED***');
        var cl***REMOVED***es = currentCl***REMOVED***Name + ' ' + cl***REMOVED***Name;
        if (!isAnimatableCl***REMOVED***Name(cl***REMOVED***es)) {
          return;
        }

        var beforeComplete = noop,
            beforeCancel = [],
            before = [],
            afterComplete = noop,
            afterCancel = [],
            after = [];

        var animationLookup = (' ' + cl***REMOVED***es).replace(/\s+/g,'.');
        forEach(lookup(animationLookup), function(animationFactory) {
          var created = registerAnimation(animationFactory, animationEvent);
          if (!created && isSetCl***REMOVED***Operation) {
            registerAnimation(animationFactory, 'addCl***REMOVED***');
            registerAnimation(animationFactory, 'removeCl***REMOVED***');
          }
        });

        function registerAnimation(animationFactory, event) {
          var afterFn = animationFactory[event];
          var beforeFn = animationFactory['before' + event.charAt(0).toUpperCase() + event.substr(1)];
          if (afterFn || beforeFn) {
            if (event == 'leave') {
              beforeFn = afterFn;
              //when set as null then animation knows to skip this phase
              afterFn = null;
            }
            after.push({
              event: event, fn: afterFn
            });
            before.push({
              event: event, fn: beforeFn
            });
            return true;
          }
        }

        function run(fns, cancellations, allCompleteFn) {
          var animations = [];
          forEach(fns, function(animation) {
            animation.fn && animations.push(animation);
          });

          var count = 0;
          function afterAnimationComplete(index) {
            if (cancellations) {
              (cancellations[index] || noop)();
              if (++count < animations.length) return;
              cancellations = null;
            }
            allCompleteFn();
          }

          //The code below adds directly to the array in order to work with
          //both sync and async animations. Sync animations are when the done()
          //operation is called right away. DO NOT REFACTOR!
          forEach(animations, function(animation, index) {
            var progress = function() {
              afterAnimationComplete(index);
            };
            switch (animation.event) {
              case 'setCl***REMOVED***':
                cancellations.push(animation.fn(element, cl***REMOVED***NameAdd, cl***REMOVED***NameRemove, progress, options));
                break;
              case 'animate':
                cancellations.push(animation.fn(element, cl***REMOVED***Name, options.from, options.to, progress));
                break;
              case 'addCl***REMOVED***':
                cancellations.push(animation.fn(element, cl***REMOVED***NameAdd || cl***REMOVED***Name,     progress, options));
                break;
              case 'removeCl***REMOVED***':
                cancellations.push(animation.fn(element, cl***REMOVED***NameRemove || cl***REMOVED***Name,  progress, options));
                break;
              default:
                cancellations.push(animation.fn(element, progress, options));
                break;
            }
          });

          if (cancellations && cancellations.length === 0) {
            allCompleteFn();
          }
        }

        return {
          node: node,
          event: animationEvent,
          cl***REMOVED***Name: cl***REMOVED***Name,
          isCl***REMOVED***Based: isCl***REMOVED***Based,
          isSetCl***REMOVED***Operation: isSetCl***REMOVED***Operation,
          applyStyles: function() {
            if (options) {
              element.css(angular.extend(options.from || {}, options.to || {}));
            }
          },
          before: function(allCompleteFn) {
            beforeComplete = allCompleteFn;
            run(before, beforeCancel, function() {
              beforeComplete = noop;
              allCompleteFn();
            });
          },
          after: function(allCompleteFn) {
            afterComplete = allCompleteFn;
            run(after, afterCancel, function() {
              afterComplete = noop;
              allCompleteFn();
            });
          },
          cancel: function() {
            if (beforeCancel) {
              forEach(beforeCancel, function(cancelFn) {
                (cancelFn || noop)(true);
              });
              beforeComplete(true);
            }
            if (afterCancel) {
              forEach(afterCancel, function(cancelFn) {
                (cancelFn || noop)(true);
              });
              afterComplete(true);
            }
          }
        };
      }

      /**
       * @ngdoc ***REMOVED***
       * @name $animate
       * @kind object
       *
       * @description
       * The `$animate` ***REMOVED*** provides animation detection support while performing DOM operations (enter, leave and move) as well as during addCl***REMOVED*** and removeCl***REMOVED*** operations.
       * When any of these operations are run, the $animate ***REMOVED***
       * will examine any JavaScript-defined animations (which are defined by using the $animateProvider provider object)
       * as well as any CSS-defined animations against the CSS cl***REMOVED***es present on the element once the DOM operation is run.
       *
       * The `$animate` ***REMOVED*** is used behind the scenes with pre-existing directives and animation with these directives
       * will work out of the box without any extra configuration.
       *
       * Requires the {@link ngAnimate `ngAnimate`} module to be installed.
       *
       * Please visit the {@link ngAnimate `ngAnimate`} module overview page learn more about how to use animations in your application.
       * ## Callback Promises
       * With AngularJS 1.3, each of the animation methods, on the `$animate` ***REMOVED***, return a promise when called. The
       * promise itself is then resolved once the animation has completed itself, has been cancelled or has been
       * skipped due to animations being disabled. (Note that even if the animation is cancelled it will still
       * call the resolve function of the animation.)
       *
       * ```js
       * $animate.enter(element, container).then(function() {
       *   //...this is called once the animation is complete...
       * });
       * ```
       *
       * Also note that, due to the nature of the callback promise, if any Angular-specific code (like changing the scope,
       * location of the page, etc...) is executed within the callback promise then be sure to wrap the code using
       * `$scope.$apply(...)`;
       *
       * ```js
       * $animate.leave(element).then(function() {
       *   $scope.$apply(function() {
       *     $location.path('/new-page');
       *   });
       * });
       * ```
       *
       * An animation can also be cancelled by calling the `$animate.cancel(promise)` method with the provided
       * promise that was returned when the animation was started.
       *
       * ```js
       * var promise = $animate.addCl***REMOVED***(element, 'super-long-animation');
       * promise.then(function() {
       *   //this will still be called even if cancelled
       * });
       *
       * element.on('click', function() {
       *   //tooo lazy to wait for the animation to end
       *   $animate.cancel(promise);
       * });
       * ```
       *
       * (Keep in mind that the promise cancellation is unique to `$animate` since promises in
       * general cannot be cancelled.)
       *
       */
      return {
        /**
         * @ngdoc method
         * @name $animate#animate
         * @kind function
         *
         * @description
         * Performs an inline animation on the element which applies the provided `to` and `from` CSS styles to the element.
         * If any detected CSS transition, keyframe or JavaScript matches the provided `cl***REMOVED***Name` value then the animation
         * will take on the provided styles. For example, if a transition animation is set for the given cl***REMOVED***Name then the
         * provided `from` and `to` styles will be applied alongside the given transition. If a JavaScript animation is
         * detected then the provided styles will be given in as function paramters.
         *
         * ```js
         * ngModule.animation('.my-inline-animation', function() {
         *   return {
         *     animate : function(element, cl***REMOVED***Name, from, to, done) {
         *       //styles
         *     }
         *   }
         * });
         * ```
         *
         * Below is a breakdown of each step that occurs during the `animate` animation:
         *
         * | Animation Step                                                                                                        | What the element cl***REMOVED*** attribute looks like                  |
         * |-----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
         * | 1. `$animate.animate(...)` is called                                                                                  | `cl***REMOVED***="my-animation"`                                       |
         * | 2. `$animate` waits for the next digest to start the animation                                                        | `cl***REMOVED***="my-animation ng-animate"`                            |
         * | 3. `$animate` runs the JavaScript-defined animations detected on the element                                          | `cl***REMOVED***="my-animation ng-animate"`                            |
         * | 4. the `cl***REMOVED***Name` cl***REMOVED*** value is added to the element                                                                | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name"`                  |
         * | 5. `$animate` scans the element styles to get the CSS transition/animation duration and delay                         | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name"`                  |
         * | 6. `$animate` blocks all CSS transitions on the element to ensure the `.cl***REMOVED***Name` cl***REMOVED*** styling is applied right away| `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name"`                  |
         * | 7. `$animate` applies the provided collection of `from` CSS styles to the element                                     | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name"`                  |
         * | 8. `$animate` waits for a single animation frame (this performs a reflow)                                             | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name"`                  |
         * | 9. `$animate` removes the CSS transition block placed on the element                                                  | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name"`                  |
         * | 10. the `cl***REMOVED***Name-active` cl***REMOVED*** is added (this triggers the CSS transition/animation)                                | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name cl***REMOVED***Name-active"` |
         * | 11. `$animate` applies the collection of `to` CSS styles to the element which are then handled by the transition      | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name cl***REMOVED***Name-active"` |
         * | 12. `$animate` waits for the animation to complete (via events and timeout)                                           | `cl***REMOVED***="my-animation ng-animate cl***REMOVED***Name cl***REMOVED***Name-active"` |
         * | 13. The animation ends and all generated CSS cl***REMOVED***es are removed from the element                                     | `cl***REMOVED***="my-animation"`                                       |
         * | 14. The returned promise is resolved.                                                                                 | `cl***REMOVED***="my-animation"`                                       |
         *
         * @param {DOMElement} element the element that will be the focus of the enter animation
         * @param {object} from a collection of CSS styles that will be applied to the element at the start of the animation
         * @param {object} to a collection of CSS styles that the element will animate towards
         * @param {string=} cl***REMOVED***Name an optional CSS cl***REMOVED*** that will be added to the element for the duration of the animation (the default cl***REMOVED*** is `ng-inline-animate`)
         * @param {object=} options an optional collection of options that will be picked up by the CSS transition/animation
         * @return {Promise} the animation callback promise
        */
        animate: function(element, from, to, cl***REMOVED***Name, options) {
          cl***REMOVED***Name = cl***REMOVED***Name || 'ng-inline-animate';
          options = parseAnimateOptions(options) || {};
          options.from = to ? from : null;
          options.to   = to ? to : from;

          return runAnimationPostDigest(function(done) {
            return performAnimation('animate', cl***REMOVED***Name, stripCommentsFromElement(element), null, null, noop, options, done);
          });
        },

        /**
         * @ngdoc method
         * @name $animate#enter
         * @kind function
         *
         * @description
         * Appends the element to the parentElement element that resides in the document and then runs the enter animation. Once
         * the animation is started, the following CSS cl***REMOVED***es will be present on the element for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during enter animation:
         *
         * | Animation Step                                                                                                        | What the element cl***REMOVED*** attribute looks like                |
         * |-----------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|
         * | 1. `$animate.enter(...)` is called                                                                                    | `cl***REMOVED***="my-animation"`                                     |
         * | 2. element is inserted into the `parentElement` element or beside the `afterElement` element                          | `cl***REMOVED***="my-animation"`                                     |
         * | 3. `$animate` waits for the next digest to start the animation                                                        | `cl***REMOVED***="my-animation ng-animate"`                          |
         * | 4. `$animate` runs the JavaScript-defined animations detected on the element                                          | `cl***REMOVED***="my-animation ng-animate"`                          |
         * | 5. the `.ng-enter` cl***REMOVED*** is added to the element                                                                      | `cl***REMOVED***="my-animation ng-animate ng-enter"`                 |
         * | 6. `$animate` scans the element styles to get the CSS transition/animation duration and delay                         | `cl***REMOVED***="my-animation ng-animate ng-enter"`                 |
         * | 7. `$animate` blocks all CSS transitions on the element to ensure the `.ng-enter` cl***REMOVED*** styling is applied right away | `cl***REMOVED***="my-animation ng-animate ng-enter"`                 |
         * | 8. `$animate` waits for a single animation frame (this performs a reflow)                                             | `cl***REMOVED***="my-animation ng-animate ng-enter"`                 |
         * | 9. `$animate` removes the CSS transition block placed on the element                                                  | `cl***REMOVED***="my-animation ng-animate ng-enter"`                 |
         * | 10. the `.ng-enter-active` cl***REMOVED*** is added (this triggers the CSS transition/animation)                                | `cl***REMOVED***="my-animation ng-animate ng-enter ng-enter-active"` |
         * | 11. `$animate` waits for the animation to complete (via events and timeout)                                           | `cl***REMOVED***="my-animation ng-animate ng-enter ng-enter-active"` |
         * | 12. The animation ends and all generated CSS cl***REMOVED***es are removed from the element                                     | `cl***REMOVED***="my-animation"`                                     |
         * | 13. The returned promise is resolved.                                                                                 | `cl***REMOVED***="my-animation"`                                     |
         *
         * @param {DOMElement} element the element that will be the focus of the enter animation
         * @param {DOMElement} parentElement the parent element of the element that will be the focus of the enter animation
         * @param {DOMElement} afterElement the sibling element (which is the previous element) of the element that will be the focus of the enter animation
         * @param {object=} options an optional collection of options that will be picked up by the CSS transition/animation
         * @return {Promise} the animation callback promise
        */
        enter: function(element, parentElement, afterElement, options) {
          options = parseAnimateOptions(options);
          element = angular.element(element);
          parentElement = prepareElement(parentElement);
          afterElement = prepareElement(afterElement);

          cl***REMOVED***BasedAnimationsBlocked(element, true);
          $delegate.enter(element, parentElement, afterElement);
          return runAnimationPostDigest(function(done) {
            return performAnimation('enter', 'ng-enter', stripCommentsFromElement(element), parentElement, afterElement, noop, options, done);
          });
        },

        /**
         * @ngdoc method
         * @name $animate#leave
         * @kind function
         *
         * @description
         * Runs the leave animation operation and, upon completion, removes the element from the DOM. Once
         * the animation is started, the following CSS cl***REMOVED***es will be added for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during leave animation:
         *
         * | Animation Step                                                                                                        | What the element cl***REMOVED*** attribute looks like                |
         * |-----------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|
         * | 1. `$animate.leave(...)` is called                                                                                    | `cl***REMOVED***="my-animation"`                                     |
         * | 2. `$animate` runs the JavaScript-defined animations detected on the element                                          | `cl***REMOVED***="my-animation ng-animate"`                          |
         * | 3. `$animate` waits for the next digest to start the animation                                                        | `cl***REMOVED***="my-animation ng-animate"`                          |
         * | 4. the `.ng-leave` cl***REMOVED*** is added to the element                                                                      | `cl***REMOVED***="my-animation ng-animate ng-leave"`                 |
         * | 5. `$animate` scans the element styles to get the CSS transition/animation duration and delay                         | `cl***REMOVED***="my-animation ng-animate ng-leave"`                 |
         * | 6. `$animate` blocks all CSS transitions on the element to ensure the `.ng-leave` cl***REMOVED*** styling is applied right away | `cl***REMOVED***="my-animation ng-animate ng-leave"`                 |
         * | 7. `$animate` waits for a single animation frame (this performs a reflow)                                             | `cl***REMOVED***="my-animation ng-animate ng-leave"`                 |
         * | 8. `$animate` removes the CSS transition block placed on the element                                                  | `cl***REMOVED***="my-animation ng-animate ng-leave"`                 |
         * | 9. the `.ng-leave-active` cl***REMOVED*** is added (this triggers the CSS transition/animation)                                 | `cl***REMOVED***="my-animation ng-animate ng-leave ng-leave-active"` |
         * | 10. `$animate` waits for the animation to complete (via events and timeout)                                           | `cl***REMOVED***="my-animation ng-animate ng-leave ng-leave-active"` |
         * | 11. The animation ends and all generated CSS cl***REMOVED***es are removed from the element                                     | `cl***REMOVED***="my-animation"`                                     |
         * | 12. The element is removed from the DOM                                                                               | ...                                                        |
         * | 13. The returned promise is resolved.                                                                                 | ...                                                        |
         *
         * @param {DOMElement} element the element that will be the focus of the leave animation
         * @param {object=} options an optional collection of styles that will be picked up by the CSS transition/animation
         * @return {Promise} the animation callback promise
        */
        leave: function(element, options) {
          options = parseAnimateOptions(options);
          element = angular.element(element);

          cancelChildAnimations(element);
          cl***REMOVED***BasedAnimationsBlocked(element, true);
          return runAnimationPostDigest(function(done) {
            return performAnimation('leave', 'ng-leave', stripCommentsFromElement(element), null, null, function() {
              $delegate.leave(element);
            }, options, done);
          });
        },

        /**
         * @ngdoc method
         * @name $animate#move
         * @kind function
         *
         * @description
         * Fires the move DOM operation. Just before the animation starts, the animate ***REMOVED*** will either append it into the parentElement container or
         * add the element directly after the afterElement element if present. Then the move animation will be run. Once
         * the animation is started, the following CSS cl***REMOVED***es will be added for the duration of the animation:
         *
         * Below is a breakdown of each step that occurs during move animation:
         *
         * | Animation Step                                                                                                       | What the element cl***REMOVED*** attribute looks like              |
         * |----------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|
         * | 1. `$animate.move(...)` is called                                                                                    | `cl***REMOVED***="my-animation"`                                   |
         * | 2. element is moved into the parentElement element or beside the afterElement element                                | `cl***REMOVED***="my-animation"`                                   |
         * | 3. `$animate` waits for the next digest to start the animation                                                       | `cl***REMOVED***="my-animation ng-animate"`                        |
         * | 4. `$animate` runs the JavaScript-defined animations detected on the element                                         | `cl***REMOVED***="my-animation ng-animate"`                        |
         * | 5. the `.ng-move` cl***REMOVED*** is added to the element                                                                      | `cl***REMOVED***="my-animation ng-animate ng-move"`                |
         * | 6. `$animate` scans the element styles to get the CSS transition/animation duration and delay                        | `cl***REMOVED***="my-animation ng-animate ng-move"`                |
         * | 7. `$animate` blocks all CSS transitions on the element to ensure the `.ng-move` cl***REMOVED*** styling is applied right away | `cl***REMOVED***="my-animation ng-animate ng-move"`                |
         * | 8. `$animate` waits for a single animation frame (this performs a reflow)                                            | `cl***REMOVED***="my-animation ng-animate ng-move"`                |
         * | 9. `$animate` removes the CSS transition block placed on the element                                                 | `cl***REMOVED***="my-animation ng-animate ng-move"`                |
         * | 10. the `.ng-move-active` cl***REMOVED*** is added (this triggers the CSS transition/animation)                                | `cl***REMOVED***="my-animation ng-animate ng-move ng-move-active"` |
         * | 11. `$animate` waits for the animation to complete (via events and timeout)                                          | `cl***REMOVED***="my-animation ng-animate ng-move ng-move-active"` |
         * | 12. The animation ends and all generated CSS cl***REMOVED***es are removed from the element                                    | `cl***REMOVED***="my-animation"`                                   |
         * | 13. The returned promise is resolved.                                                                                | `cl***REMOVED***="my-animation"`                                   |
         *
         * @param {DOMElement} element the element that will be the focus of the move animation
         * @param {DOMElement} parentElement the parentElement element of the element that will be the focus of the move animation
         * @param {DOMElement} afterElement the sibling element (which is the previous element) of the element that will be the focus of the move animation
         * @param {object=} options an optional collection of styles that will be picked up by the CSS transition/animation
         * @return {Promise} the animation callback promise
        */
        move: function(element, parentElement, afterElement, options) {
          options = parseAnimateOptions(options);
          element = angular.element(element);
          parentElement = prepareElement(parentElement);
          afterElement = prepareElement(afterElement);

          cancelChildAnimations(element);
          cl***REMOVED***BasedAnimationsBlocked(element, true);
          $delegate.move(element, parentElement, afterElement);
          return runAnimationPostDigest(function(done) {
            return performAnimation('move', 'ng-move', stripCommentsFromElement(element), parentElement, afterElement, noop, options, done);
          });
        },

        /**
         * @ngdoc method
         * @name $animate#addCl***REMOVED***
         *
         * @description
         * Triggers a custom animation event based off the cl***REMOVED***Name variable and then attaches the cl***REMOVED***Name value to the element as a CSS cl***REMOVED***.
         * Unlike the other animation methods, the animate ***REMOVED*** will suffix the cl***REMOVED***Name value with {@type -add} in order to provide
         * the animate ***REMOVED*** the setup and active CSS cl***REMOVED***es in order to trigger the animation (this will be skipped if no CSS transitions
         * or keyframes are defined on the -add-active or base CSS cl***REMOVED***).
         *
         * Below is a breakdown of each step that occurs during addCl***REMOVED*** animation:
         *
         * | Animation Step                                                                                         | What the element cl***REMOVED*** attribute looks like                        |
         * |--------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
         * | 1. `$animate.addCl***REMOVED***(element, 'super')` is called                                                     | `cl***REMOVED***="my-animation"`                                             |
         * | 2. `$animate` runs the JavaScript-defined animations detected on the element                           | `cl***REMOVED***="my-animation ng-animate"`                                  |
         * | 3. the `.super-add` cl***REMOVED*** is added to the element                                                      | `cl***REMOVED***="my-animation ng-animate super-add"`                        |
         * | 4. `$animate` waits for a single animation frame (this performs a reflow)                              | `cl***REMOVED***="my-animation ng-animate super-add"`                        |
         * | 5. the `.super` and `.super-add-active` cl***REMOVED***es are added (this triggers the CSS transition/animation) | `cl***REMOVED***="my-animation ng-animate super super-add super-add-active"` |
         * | 6. `$animate` scans the element styles to get the CSS transition/animation duration and delay          | `cl***REMOVED***="my-animation ng-animate super super-add super-add-active"` |
         * | 7. `$animate` waits for the animation to complete (via events and timeout)                             | `cl***REMOVED***="my-animation ng-animate super super-add super-add-active"` |
         * | 8. The animation ends and all generated CSS cl***REMOVED***es are removed from the element                       | `cl***REMOVED***="my-animation super"`                                       |
         * | 9. The super cl***REMOVED*** is kept on the element                                                              | `cl***REMOVED***="my-animation super"`                                       |
         * | 10. The returned promise is resolved.                                                                  | `cl***REMOVED***="my-animation super"`                                       |
         *
         * @param {DOMElement} element the element that will be animated
         * @param {string} cl***REMOVED***Name the CSS cl***REMOVED*** that will be added to the element and then animated
         * @param {object=} options an optional collection of styles that will be picked up by the CSS transition/animation
         * @return {Promise} the animation callback promise
        */
        addCl***REMOVED***: function(element, cl***REMOVED***Name, options) {
          return this.setCl***REMOVED***(element, cl***REMOVED***Name, [], options);
        },

        /**
         * @ngdoc method
         * @name $animate#removeCl***REMOVED***
         *
         * @description
         * Triggers a custom animation event based off the cl***REMOVED***Name variable and then removes the CSS cl***REMOVED*** provided by the cl***REMOVED***Name value
         * from the element. Unlike the other animation methods, the animate ***REMOVED*** will suffix the cl***REMOVED***Name value with {@type -remove} in
         * order to provide the animate ***REMOVED*** the setup and active CSS cl***REMOVED***es in order to trigger the animation (this will be skipped if
         * no CSS transitions or keyframes are defined on the -remove or base CSS cl***REMOVED***es).
         *
         * Below is a breakdown of each step that occurs during removeCl***REMOVED*** animation:
         *
         * | Animation Step                                                                                                       | What the element cl***REMOVED*** attribute looks like                        |
         * |----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
         * | 1. `$animate.removeCl***REMOVED***(element, 'super')` is called                                                                | `cl***REMOVED***="my-animation super"`                                       |
         * | 2. `$animate` runs the JavaScript-defined animations detected on the element                                         | `cl***REMOVED***="my-animation super ng-animate"`                            |
         * | 3. the `.super-remove` cl***REMOVED*** is added to the element                                                                 | `cl***REMOVED***="my-animation super ng-animate super-remove"`               |
         * | 4. `$animate` waits for a single animation frame (this performs a reflow)                                            | `cl***REMOVED***="my-animation super ng-animate super-remove"`               |
         * | 5. the `.super-remove-active` cl***REMOVED***es are added and `.super` is removed (this triggers the CSS transition/animation) | `cl***REMOVED***="my-animation ng-animate super-remove super-remove-active"` |
         * | 6. `$animate` scans the element styles to get the CSS transition/animation duration and delay                        | `cl***REMOVED***="my-animation ng-animate super-remove super-remove-active"` |
         * | 7. `$animate` waits for the animation to complete (via events and timeout)                                           | `cl***REMOVED***="my-animation ng-animate super-remove super-remove-active"` |
         * | 8. The animation ends and all generated CSS cl***REMOVED***es are removed from the element                                     | `cl***REMOVED***="my-animation"`                                             |
         * | 9. The returned promise is resolved.                                                                                 | `cl***REMOVED***="my-animation"`                                             |
         *
         *
         * @param {DOMElement} element the element that will be animated
         * @param {string} cl***REMOVED***Name the CSS cl***REMOVED*** that will be animated and then removed from the element
         * @param {object=} options an optional collection of styles that will be picked up by the CSS transition/animation
         * @return {Promise} the animation callback promise
        */
        removeCl***REMOVED***: function(element, cl***REMOVED***Name, options) {
          return this.setCl***REMOVED***(element, [], cl***REMOVED***Name, options);
        },

        /**
         *
         * @ngdoc method
         * @name $animate#setCl***REMOVED***
         *
         * @description Adds and/or removes the given CSS cl***REMOVED***es to and from the element.
         * Once complete, the `done()` callback will be fired (if provided).
         *
         * | Animation Step                                                                                                                               | What the element cl***REMOVED*** attribute looks like                                            |
         * |----------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
         * | 1. `$animate.setCl***REMOVED***(element, 'on', 'off')` is called                                                                                       | `cl***REMOVED***="my-animation off"`                                                             |
         * | 2. `$animate` runs the JavaScript-defined animations detected on the element                                                                 | `cl***REMOVED***="my-animation ng-animate off"`                                                  |
         * | 3. the `.on-add` and `.off-remove` cl***REMOVED***es are added to the element                                                                          | `cl***REMOVED***="my-animation ng-animate on-add off-remove off"`                                |
         * | 4. `$animate` waits for a single animation frame (this performs a reflow)                                                                    | `cl***REMOVED***="my-animation ng-animate on-add off-remove off"`                                |
         * | 5. the `.on`, `.on-add-active` and `.off-remove-active` cl***REMOVED***es are added and `.off` is removed (this triggers the CSS transition/animation) | `cl***REMOVED***="my-animation ng-animate on on-add on-add-active off-remove off-remove-active"` |
         * | 6. `$animate` scans the element styles to get the CSS transition/animation duration and delay                                                | `cl***REMOVED***="my-animation ng-animate on on-add on-add-active off-remove off-remove-active"` |
         * | 7. `$animate` waits for the animation to complete (via events and timeout)                                                                   | `cl***REMOVED***="my-animation ng-animate on on-add on-add-active off-remove off-remove-active"` |
         * | 8. The animation ends and all generated CSS cl***REMOVED***es are removed from the element                                                             | `cl***REMOVED***="my-animation on"`                                                              |
         * | 9. The returned promise is resolved.                                                                                                         | `cl***REMOVED***="my-animation on"`                                                              |
         *
         * @param {DOMElement} element the element which will have its CSS cl***REMOVED***es changed
         *   removed from it
         * @param {string} add the CSS cl***REMOVED***es which will be added to the element
         * @param {string} remove the CSS cl***REMOVED*** which will be removed from the element
         *   CSS cl***REMOVED***es have been set on the element
         * @param {object=} options an optional collection of styles that will be picked up by the CSS transition/animation
         * @return {Promise} the animation callback promise
         */
        setCl***REMOVED***: function(element, add, remove, options) {
          options = parseAnimateOptions(options);

          var STORAGE_KEY = '$$animateCl***REMOVED***es';
          element = angular.element(element);
          element = stripCommentsFromElement(element);

          if (cl***REMOVED***BasedAnimationsBlocked(element)) {
            return $delegate.$$setCl***REMOVED***Immediately(element, add, remove, options);
          }

          // we're using a combined array for both the add and remove
          // operations since the ORDER OF addCl***REMOVED*** and removeCl***REMOVED*** matters
          var cl***REMOVED***es, cache = element.data(STORAGE_KEY);
          var hasCache = !!cache;
          if (!cache) {
            cache = {};
            cache.cl***REMOVED***es = {};
          }
          cl***REMOVED***es = cache.cl***REMOVED***es;

          add = isArray(add) ? add : add.split(' ');
          forEach(add, function(c) {
            if (c && c.length) {
              cl***REMOVED***es[c] = true;
            }
          });

          remove = isArray(remove) ? remove : remove.split(' ');
          forEach(remove, function(c) {
            if (c && c.length) {
              cl***REMOVED***es[c] = false;
            }
          });

          if (hasCache) {
            if (options && cache.options) {
              cache.options = angular.extend(cache.options || {}, options);
            }

            //the digest cycle will combine all the animations into one function
            return cache.promise;
          } else {
            element.data(STORAGE_KEY, cache = {
              cl***REMOVED***es: cl***REMOVED***es,
              options: options
            });
          }

          return cache.promise = runAnimationPostDigest(function(done) {
            var parentElement = element.parent();
            var elementNode = extractElementNode(element);
            var parentNode = elementNode.parentNode;
            // TODO(matsko): move this code into the animationsDisabled() function once #8092 is fixed
            if (!parentNode || parentNode['$$NG_REMOVED'] || elementNode['$$NG_REMOVED']) {
              done();
              return;
            }

            var cache = element.data(STORAGE_KEY);
            element.removeData(STORAGE_KEY);

            var state = element.data(NG_ANIMATE_STATE) || {};
            var cl***REMOVED***es = resolveElementCl***REMOVED***es(element, cache, state.active);
            return !cl***REMOVED***es
              ? done()
              : performAnimation('setCl***REMOVED***', cl***REMOVED***es, element, parentElement, null, function() {
                  if (cl***REMOVED***es[0]) $delegate.$$addCl***REMOVED***Immediately(element, cl***REMOVED***es[0]);
                  if (cl***REMOVED***es[1]) $delegate.$$removeCl***REMOVED***Immediately(element, cl***REMOVED***es[1]);
                }, cache.options, done);
          });
        },

        /**
         * @ngdoc method
         * @name $animate#cancel
         * @kind function
         *
         * @param {Promise} animationPromise The animation promise that is returned when an animation is started.
         *
         * @description
         * Cancels the provided animation.
        */
        cancel: function(promise) {
          promise.$$cancelFn();
        },

        /**
         * @ngdoc method
         * @name $animate#enabled
         * @kind function
         *
         * @param {boolean=} value If provided then set the animation on or off.
         * @param {DOMElement=} element If provided then the element will be used to represent the enable/disable operation
         * @return {boolean} Current animation state.
         *
         * @description
         * Globally enables/disables animations.
         *
        */
        enabled: function(value, element) {
          switch (arguments.length) {
            case 2:
              if (value) {
                cleanup(element);
              } else {
                var data = element.data(NG_ANIMATE_STATE) || {};
                data.disabled = true;
                element.data(NG_ANIMATE_STATE, data);
              }
            break;

            case 1:
              rootAnimateState.disabled = !value;
            break;

            default:
              value = !rootAnimateState.disabled;
            break;
          }
          return !!value;
         }
      };

      /*
        all animations call this shared animation triggering function internally.
        The animationEvent variable refers to the JavaScript animation event that will be triggered
        and the cl***REMOVED***Name value is the name of the animation that will be applied within the
        CSS code. Element, `parentElement` and `afterElement` are provided DOM elements for the animation
        and the onComplete callback will be fired once the animation is fully complete.
      */
      function performAnimation(animationEvent, cl***REMOVED***Name, element, parentElement, afterElement, domOperation, options, doneCallback) {
        var noopCancel = noop;
        var runner = animationRunner(element, animationEvent, cl***REMOVED***Name, options);
        if (!runner) {
          fireDOMOperation();
          fireBeforeCallbackAsync();
          fireAfterCallbackAsync();
          closeAnimation();
          return noopCancel;
        }

        animationEvent = runner.event;
        cl***REMOVED***Name = runner.cl***REMOVED***Name;
        var elementEvents = angular.element._data(runner.node);
        elementEvents = elementEvents && elementEvents.events;

        if (!parentElement) {
          parentElement = afterElement ? afterElement.parent() : element.parent();
        }

        //skip the animation if animations are disabled, a parent is already being animated,
        //the element is not currently attached to the document body or then completely close
        //the animation if any matching animations are not found at all.
        //NOTE: IE8 + IE9 should close properly (run closeAnimation()) in case an animation was found.
        if (animationsDisabled(element, parentElement)) {
          fireDOMOperation();
          fireBeforeCallbackAsync();
          fireAfterCallbackAsync();
          closeAnimation();
          return noopCancel;
        }

        var ngAnimateState  = element.data(NG_ANIMATE_STATE) || {};
        var runningAnimations     = ngAnimateState.active || {};
        var totalActiveAnimations = ngAnimateState.totalActive || 0;
        var lastAnimation         = ngAnimateState.last;
        var skipAnimation = false;

        if (totalActiveAnimations > 0) {
          var animationsToCancel = [];
          if (!runner.isCl***REMOVED***Based) {
            if (animationEvent == 'leave' && runningAnimations['ng-leave']) {
              skipAnimation = true;
            } else {
              //cancel all animations when a structural animation takes place
              for (var kl***REMOVED*** in runningAnimations) {
                animationsToCancel.push(runningAnimations[kl***REMOVED***]);
              }
              ngAnimateState = {};
              cleanup(element, true);
            }
          } else if (lastAnimation.event == 'setCl***REMOVED***') {
            animationsToCancel.push(lastAnimation);
            cleanup(element, cl***REMOVED***Name);
          } else if (runningAnimations[cl***REMOVED***Name]) {
            var current = runningAnimations[cl***REMOVED***Name];
            if (current.event == animationEvent) {
              skipAnimation = true;
            } else {
              animationsToCancel.push(current);
              cleanup(element, cl***REMOVED***Name);
            }
          }

          if (animationsToCancel.length > 0) {
            forEach(animationsToCancel, function(operation) {
              operation.cancel();
            });
          }
        }

        if (runner.isCl***REMOVED***Based
            && !runner.isSetCl***REMOVED***Operation
            && animationEvent != 'animate'
            && !skipAnimation) {
          skipAnimation = (animationEvent == 'addCl***REMOVED***') == element.hasCl***REMOVED***(cl***REMOVED***Name); //opposite of XOR
        }

        if (skipAnimation) {
          fireDOMOperation();
          fireBeforeCallbackAsync();
          fireAfterCallbackAsync();
          fireDoneCallbackAsync();
          return noopCancel;
        }

        runningAnimations     = ngAnimateState.active || {};
        totalActiveAnimations = ngAnimateState.totalActive || 0;

        if (animationEvent == 'leave') {
          //there's no need to ever remove the listener since the element
          //will be removed (destroyed) after the leave animation ends or
          //is cancelled midway
          element.one('$destroy', function(e) {
            var element = angular.element(this);
            var state = element.data(NG_ANIMATE_STATE);
            if (state) {
              var activeLeaveAnimation = state.active['ng-leave'];
              if (activeLeaveAnimation) {
                activeLeaveAnimation.cancel();
                cleanup(element, 'ng-leave');
              }
            }
          });
        }

        //the ng-animate cl***REMOVED*** does nothing, but it's here to allow for
        //parent animations to find and cancel child animations when needed
        $$jqLite.addCl***REMOVED***(element, NG_ANIMATE_CLASS_NAME);
        if (options && options.tempCl***REMOVED***es) {
          forEach(options.tempCl***REMOVED***es, function(cl***REMOVED***Name) {
            $$jqLite.addCl***REMOVED***(element, cl***REMOVED***Name);
          });
        }

        var localAnimationCount = globalAnimationCounter++;
        totalActiveAnimations++;
        runningAnimations[cl***REMOVED***Name] = runner;

        element.data(NG_ANIMATE_STATE, {
          last: runner,
          active: runningAnimations,
          index: localAnimationCount,
          totalActive: totalActiveAnimations
        });

        //first we run the before animations and when all of those are complete
        //then we perform the DOM operation and run the next set of animations
        fireBeforeCallbackAsync();
        runner.before(function(cancelled) {
          var data = element.data(NG_ANIMATE_STATE);
          cancelled = cancelled ||
                        !data || !data.active[cl***REMOVED***Name] ||
                        (runner.isCl***REMOVED***Based && data.active[cl***REMOVED***Name].event != animationEvent);

          fireDOMOperation();
          if (cancelled === true) {
            closeAnimation();
          } else {
            fireAfterCallbackAsync();
            runner.after(closeAnimation);
          }
        });

        return runner.cancel;

        function fireDOMCallback(animationPhase) {
          var eventName = '$animate:' + animationPhase;
          if (elementEvents && elementEvents[eventName] && elementEvents[eventName].length > 0) {
            $$asyncCallback(function() {
              element.triggerHandler(eventName, {
                event: animationEvent,
                cl***REMOVED***Name: cl***REMOVED***Name
              });
            });
          }
        }

        function fireBeforeCallbackAsync() {
          fireDOMCallback('before');
        }

        function fireAfterCallbackAsync() {
          fireDOMCallback('after');
        }

        function fireDoneCallbackAsync() {
          fireDOMCallback('close');
          doneCallback();
        }

        //it is less complicated to use a flag than managing and canceling
        //timeouts containing multiple callbacks.
        function fireDOMOperation() {
          if (!fireDOMOperation.hasBeenRun) {
            fireDOMOperation.hasBeenRun = true;
            domOperation();
          }
        }

        function closeAnimation() {
          if (!closeAnimation.hasBeenRun) {
            if (runner) { //the runner doesn't exist if it fails to instantiate
              runner.applyStyles();
            }

            closeAnimation.hasBeenRun = true;
            if (options && options.tempCl***REMOVED***es) {
              forEach(options.tempCl***REMOVED***es, function(cl***REMOVED***Name) {
                $$jqLite.removeCl***REMOVED***(element, cl***REMOVED***Name);
              });
            }

            var data = element.data(NG_ANIMATE_STATE);
            if (data) {

              /* only structural animations wait for reflow before removing an
                 animation, but cl***REMOVED***-based animations don't. An example of this
                 failing would be when a parent HTML tag has a ng-cl***REMOVED*** attribute
                 causing ALL directives below to skip animations during the digest */
              if (runner && runner.isCl***REMOVED***Based) {
                cleanup(element, cl***REMOVED***Name);
              } else {
                $$asyncCallback(function() {
                  var data = element.data(NG_ANIMATE_STATE) || {};
                  if (localAnimationCount == data.index) {
                    cleanup(element, cl***REMOVED***Name, animationEvent);
                  }
                });
                element.data(NG_ANIMATE_STATE, data);
              }
            }
            fireDoneCallbackAsync();
          }
        }
      }

      function cancelChildAnimations(element) {
        var node = extractElementNode(element);
        if (node) {
          var nodes = angular.isFunction(node.getElementsByCl***REMOVED***Name) ?
            node.getElementsByCl***REMOVED***Name(NG_ANIMATE_CLASS_NAME) :
            node.querySelectorAll('.' + NG_ANIMATE_CLASS_NAME);
          forEach(nodes, function(element) {
            element = angular.element(element);
            var data = element.data(NG_ANIMATE_STATE);
            if (data && data.active) {
              forEach(data.active, function(runner) {
                runner.cancel();
              });
            }
          });
        }
      }

      function cleanup(element, cl***REMOVED***Name) {
        if (isMatchingElement(element, $rootElement)) {
          if (!rootAnimateState.disabled) {
            rootAnimateState.running = false;
            rootAnimateState.structural = false;
          }
        } else if (cl***REMOVED***Name) {
          var data = element.data(NG_ANIMATE_STATE) || {};

          var removeAnimations = cl***REMOVED***Name === true;
          if (!removeAnimations && data.active && data.active[cl***REMOVED***Name]) {
            data.totalActive--;
            delete data.active[cl***REMOVED***Name];
          }

          if (removeAnimations || !data.totalActive) {
            $$jqLite.removeCl***REMOVED***(element, NG_ANIMATE_CLASS_NAME);
            element.removeData(NG_ANIMATE_STATE);
          }
        }
      }

      function animationsDisabled(element, parentElement) {
        if (rootAnimateState.disabled) {
          return true;
        }

        if (isMatchingElement(element, $rootElement)) {
          return rootAnimateState.running;
        }

        var allowChildAnimations, parentRunningAnimation, hasParent;
        do {
          //the element did not reach the root element which means that it
          //is not apart of the DOM. Therefore there is no reason to do
          //any animations on it
          if (parentElement.length === 0) break;

          var isRoot = isMatchingElement(parentElement, $rootElement);
          var state = isRoot ? rootAnimateState : (parentElement.data(NG_ANIMATE_STATE) || {});
          if (state.disabled) {
            return true;
          }

          //no matter what, for an animation to work it must reach the root element
          //this implies that the element is attached to the DOM when the animation is run
          if (isRoot) {
            hasParent = true;
          }

          //once a flag is found that is strictly false then everything before
          //it will be discarded and all child animations will be restricted
          if (allowChildAnimations !== false) {
            var animateChildrenFlag = parentElement.data(NG_ANIMATE_CHILDREN);
            if (angular.isDefined(animateChildrenFlag)) {
              allowChildAnimations = animateChildrenFlag;
            }
          }

          parentRunningAnimation = parentRunningAnimation ||
                                   state.running ||
                                   (state.last && !state.last.isCl***REMOVED***Based);
        }
        while (parentElement = parentElement.parent());

        return !hasParent || (!allowChildAnimations && parentRunningAnimation);
      }
    }]);

    $animateProvider.register('', ['$window', '$sniffer', '$timeout', '$$animateReflow',
                           function($window,   $sniffer,   $timeout,   $$animateReflow) {
      // Detect proper transitionend/animationend event names.
      var CSS_PREFIX = '', TRANSITION_PROP, TRANSITIONEND_EVENT, ANIMATION_PROP, ANIMATIONEND_EVENT;

      // If unprefixed events are not supported but webkit-prefixed are, use the latter.
      // Otherwise, just use W3C names, browsers not supporting them at all will just ignore them.
      // Note: Chrome implements `window.onwebkitanimationend` and doesn't implement `window.onanimationend`
      // but at the same time dispatches the `animationend` event and not `webkitAnimationEnd`.
      // Register both events in case `window.onanimationend` is not supported because of that,
      // do the same for `transitionend` as Safari is likely to exhibit similar behavior.
      // Also, the only modern browser that uses vendor prefixes for transitions/keyframes is webkit
      // therefore there is no reason to test anymore for other vendor prefixes: http://caniuse.com/#search=transition
      if (window.ontransitionend === undefined && window.onwebkittransitionend !== undefined) {
        CSS_PREFIX = '-webkit-';
        TRANSITION_PROP = 'WebkitTransition';
        TRANSITIONEND_EVENT = 'webkitTransitionEnd transitionend';
      } else {
        TRANSITION_PROP = 'transition';
        TRANSITIONEND_EVENT = 'transitionend';
      }

      if (window.onanimationend === undefined && window.onwebkitanimationend !== undefined) {
        CSS_PREFIX = '-webkit-';
        ANIMATION_PROP = 'WebkitAnimation';
        ANIMATIONEND_EVENT = 'webkitAnimationEnd animationend';
      } else {
        ANIMATION_PROP = 'animation';
        ANIMATIONEND_EVENT = 'animationend';
      }

      var DURATION_KEY = 'Duration';
      var PROPERTY_KEY = 'Property';
      var DELAY_KEY = 'Delay';
      var ANIMATION_ITERATION_COUNT_KEY = 'IterationCount';
      var ANIMATION_PLAYSTATE_KEY = 'PlayState';
      var NG_ANIMATE_PARENT_KEY = '$$ngAnimateKey';
      var NG_ANIMATE_CSS_DATA_KEY = '$$ngAnimateCSS3Data';
      var ELAPSED_TIME_MAX_DECIMAL_PLACES = 3;
      var CLOSING_TIME_BUFFER = 1.5;
      var ONE_SECOND = 1000;

      var lookupCache = {};
      var parentCounter = 0;
      var animationReflowQueue = [];
      var cancelAnimationReflow;
      function clearCacheAfterReflow() {
        if (!cancelAnimationReflow) {
          cancelAnimationReflow = $$animateReflow(function() {
            animationReflowQueue = [];
            cancelAnimationReflow = null;
            lookupCache = {};
          });
        }
      }

      function afterReflow(element, callback) {
        if (cancelAnimationReflow) {
          cancelAnimationReflow();
        }
        animationReflowQueue.push(callback);
        cancelAnimationReflow = $$animateReflow(function() {
          forEach(animationReflowQueue, function(fn) {
            fn();
          });

          animationReflowQueue = [];
          cancelAnimationReflow = null;
          lookupCache = {};
        });
      }

      var closingTimer = null;
      var closingTimestamp = 0;
      var animationElementQueue = [];
      function animationCloseHandler(element, totalTime) {
        var node = extractElementNode(element);
        element = angular.element(node);

        //this item will be garbage collected by the closing
        //animation timeout
        animationElementQueue.push(element);

        //but it may not need to cancel out the existing timeout
        //if the timestamp is less than the previous one
        var futureTimestamp = Date.now() + totalTime;
        if (futureTimestamp <= closingTimestamp) {
          return;
        }

        $timeout.cancel(closingTimer);

        closingTimestamp = futureTimestamp;
        closingTimer = $timeout(function() {
          closeAllAnimations(animationElementQueue);
          animationElementQueue = [];
        }, totalTime, false);
      }

      function closeAllAnimations(elements) {
        forEach(elements, function(element) {
          var elementData = element.data(NG_ANIMATE_CSS_DATA_KEY);
          if (elementData) {
            forEach(elementData.closeAnimationFns, function(fn) {
              fn();
            });
          }
        });
      }

      function getElementAnimationDetails(element, cacheKey) {
        var data = cacheKey ? lookupCache[cacheKey] : null;
        if (!data) {
          var transitionDuration = 0;
          var transitionDelay = 0;
          var animationDuration = 0;
          var animationDelay = 0;

          //we want all the styles defined before and after
          forEach(element, function(element) {
            if (element.nodeType == ELEMENT_NODE) {
              var elementStyles = $window.getComputedStyle(element) || {};

              var transitionDurationStyle = elementStyles[TRANSITION_PROP + DURATION_KEY];
              transitionDuration = Math.max(parseMaxTime(transitionDurationStyle), transitionDuration);

              var transitionDelayStyle = elementStyles[TRANSITION_PROP + DELAY_KEY];
              transitionDelay  = Math.max(parseMaxTime(transitionDelayStyle), transitionDelay);

              var animationDelayStyle = elementStyles[ANIMATION_PROP + DELAY_KEY];
              animationDelay   = Math.max(parseMaxTime(elementStyles[ANIMATION_PROP + DELAY_KEY]), animationDelay);

              var aDuration  = parseMaxTime(elementStyles[ANIMATION_PROP + DURATION_KEY]);

              if (aDuration > 0) {
                aDuration *= parseInt(elementStyles[ANIMATION_PROP + ANIMATION_ITERATION_COUNT_KEY], 10) || 1;
              }
              animationDuration = Math.max(aDuration, animationDuration);
            }
          });
          data = {
            total: 0,
            transitionDelay: transitionDelay,
            transitionDuration: transitionDuration,
            animationDelay: animationDelay,
            animationDuration: animationDuration
          };
          if (cacheKey) {
            lookupCache[cacheKey] = data;
          }
        }
        return data;
      }

      function parseMaxTime(str) {
        var maxValue = 0;
        var values = isString(str) ?
          str.split(/\s*,\s*/) :
          [];
        forEach(values, function(value) {
          maxValue = Math.max(parseFloat(value) || 0, maxValue);
        });
        return maxValue;
      }

      function getCacheKey(element) {
        var parentElement = element.parent();
        var parentID = parentElement.data(NG_ANIMATE_PARENT_KEY);
        if (!parentID) {
          parentElement.data(NG_ANIMATE_PARENT_KEY, ++parentCounter);
          parentID = parentCounter;
        }
        return parentID + '-' + extractElementNode(element).getAttribute('cl***REMOVED***');
      }

      function animateSetup(animationEvent, element, cl***REMOVED***Name, styles) {
        var structural = ['ng-enter','ng-leave','ng-move'].indexOf(cl***REMOVED***Name) >= 0;

        var cacheKey = getCacheKey(element);
        var eventCacheKey = cacheKey + ' ' + cl***REMOVED***Name;
        var itemIndex = lookupCache[eventCacheKey] ? ++lookupCache[eventCacheKey].total : 0;

        var stagger = {};
        if (itemIndex > 0) {
          var staggerCl***REMOVED***Name = cl***REMOVED***Name + '-stagger';
          var staggerCacheKey = cacheKey + ' ' + staggerCl***REMOVED***Name;
          var applyCl***REMOVED***es = !lookupCache[staggerCacheKey];

          applyCl***REMOVED***es && $$jqLite.addCl***REMOVED***(element, staggerCl***REMOVED***Name);

          stagger = getElementAnimationDetails(element, staggerCacheKey);

          applyCl***REMOVED***es && $$jqLite.removeCl***REMOVED***(element, staggerCl***REMOVED***Name);
        }

        $$jqLite.addCl***REMOVED***(element, cl***REMOVED***Name);

        var formerData = element.data(NG_ANIMATE_CSS_DATA_KEY) || {};
        var timings = getElementAnimationDetails(element, eventCacheKey);
        var transitionDuration = timings.transitionDuration;
        var animationDuration = timings.animationDuration;

        if (structural && transitionDuration === 0 && animationDuration === 0) {
          $$jqLite.removeCl***REMOVED***(element, cl***REMOVED***Name);
          return false;
        }

        var blockTransition = styles || (structural && transitionDuration > 0);
        var blockAnimation = animationDuration > 0 &&
                             stagger.animationDelay > 0 &&
                             stagger.animationDuration === 0;

        var closeAnimationFns = formerData.closeAnimationFns || [];
        element.data(NG_ANIMATE_CSS_DATA_KEY, {
          stagger: stagger,
          cacheKey: eventCacheKey,
          running: formerData.running || 0,
          itemIndex: itemIndex,
          blockTransition: blockTransition,
          closeAnimationFns: closeAnimationFns
        });

        var node = extractElementNode(element);

        if (blockTransition) {
          blockTransitions(node, true);
          if (styles) {
            element.css(styles);
          }
        }

        if (blockAnimation) {
          blockAnimations(node, true);
        }

        return true;
      }

      function animateRun(animationEvent, element, cl***REMOVED***Name, activeAnimationComplete, styles) {
        var node = extractElementNode(element);
        var elementData = element.data(NG_ANIMATE_CSS_DATA_KEY);
        if (node.getAttribute('cl***REMOVED***').indexOf(cl***REMOVED***Name) == -1 || !elementData) {
          activeAnimationComplete();
          return;
        }

        var activeCl***REMOVED***Name = '';
        var pendingCl***REMOVED***Name = '';
        forEach(cl***REMOVED***Name.split(' '), function(kl***REMOVED***, i) {
          var prefix = (i > 0 ? ' ' : '') + kl***REMOVED***;
          activeCl***REMOVED***Name += prefix + '-active';
          pendingCl***REMOVED***Name += prefix + '-pending';
        });

        var style = '';
        var appliedStyles = [];
        var itemIndex = elementData.itemIndex;
        var stagger = elementData.stagger;
        var staggerTime = 0;
        if (itemIndex > 0) {
          var transitionStaggerDelay = 0;
          if (stagger.transitionDelay > 0 && stagger.transitionDuration === 0) {
            transitionStaggerDelay = stagger.transitionDelay * itemIndex;
          }

          var animationStaggerDelay = 0;
          if (stagger.animationDelay > 0 && stagger.animationDuration === 0) {
            animationStaggerDelay = stagger.animationDelay * itemIndex;
            appliedStyles.push(CSS_PREFIX + 'animation-play-state');
          }

          staggerTime = Math.round(Math.max(transitionStaggerDelay, animationStaggerDelay) * 100) / 100;
        }

        if (!staggerTime) {
          $$jqLite.addCl***REMOVED***(element, activeCl***REMOVED***Name);
          if (elementData.blockTransition) {
            blockTransitions(node, false);
          }
        }

        var eventCacheKey = elementData.cacheKey + ' ' + activeCl***REMOVED***Name;
        var timings = getElementAnimationDetails(element, eventCacheKey);
        var maxDuration = Math.max(timings.transitionDuration, timings.animationDuration);
        if (maxDuration === 0) {
          $$jqLite.removeCl***REMOVED***(element, activeCl***REMOVED***Name);
          animateClose(element, cl***REMOVED***Name);
          activeAnimationComplete();
          return;
        }

        if (!staggerTime && styles && Object.keys(styles).length > 0) {
          if (!timings.transitionDuration) {
            element.css('transition', timings.animationDuration + 's linear all');
            appliedStyles.push('transition');
          }
          element.css(styles);
        }

        var maxDelay = Math.max(timings.transitionDelay, timings.animationDelay);
        var maxDelayTime = maxDelay * ONE_SECOND;

        if (appliedStyles.length > 0) {
          //the element being animated may sometimes contain comment nodes in
          //the jqLite object, so we're safe to use a single variable to house
          //the styles since there is always only one element being animated
          var oldStyle = node.getAttribute('style') || '';
          if (oldStyle.charAt(oldStyle.length - 1) !== ';') {
            oldStyle += ';';
          }
          node.setAttribute('style', oldStyle + ' ' + style);
        }

        var startTime = Date.now();
        var css3AnimationEvents = ANIMATIONEND_EVENT + ' ' + TRANSITIONEND_EVENT;
        var animationTime     = (maxDelay + maxDuration) * CLOSING_TIME_BUFFER;
        var totalTime         = (staggerTime + animationTime) * ONE_SECOND;

        var staggerTimeout;
        if (staggerTime > 0) {
          $$jqLite.addCl***REMOVED***(element, pendingCl***REMOVED***Name);
          staggerTimeout = $timeout(function() {
            staggerTimeout = null;

            if (timings.transitionDuration > 0) {
              blockTransitions(node, false);
            }
            if (timings.animationDuration > 0) {
              blockAnimations(node, false);
            }

            $$jqLite.addCl***REMOVED***(element, activeCl***REMOVED***Name);
            $$jqLite.removeCl***REMOVED***(element, pendingCl***REMOVED***Name);

            if (styles) {
              if (timings.transitionDuration === 0) {
                element.css('transition', timings.animationDuration + 's linear all');
              }
              element.css(styles);
              appliedStyles.push('transition');
            }
          }, staggerTime * ONE_SECOND, false);
        }

        element.on(css3AnimationEvents, onAnimationProgress);
        elementData.closeAnimationFns.push(function() {
          onEnd();
          activeAnimationComplete();
        });

        elementData.running++;
        animationCloseHandler(element, totalTime);
        return onEnd;

        // This will automatically be called by $animate so
        // there is no need to attach this internally to the
        // timeout done method.
        function onEnd() {
          element.off(css3AnimationEvents, onAnimationProgress);
          $$jqLite.removeCl***REMOVED***(element, activeCl***REMOVED***Name);
          $$jqLite.removeCl***REMOVED***(element, pendingCl***REMOVED***Name);
          if (staggerTimeout) {
            $timeout.cancel(staggerTimeout);
          }
          animateClose(element, cl***REMOVED***Name);
          var node = extractElementNode(element);
          for (var i in appliedStyles) {
            node.style.removeProperty(appliedStyles[i]);
          }
        }

        function onAnimationProgress(event) {
          event.stopPropagation();
          var ev = event.originalEvent || event;
          var timeStamp = ev.$manualTimeStamp || ev.timeStamp || Date.now();

          /* Firefox (or possibly just Gecko) likes to not round values up
           * when a ms measurement is used for the animation */
          var elapsedTime = parseFloat(ev.elapsedTime.toFixed(ELAPSED_TIME_MAX_DECIMAL_PLACES));

          /* $manualTimeStamp is a mocked timeStamp value which is set
           * within browserTrigger(). This is only here so that tests can
           * mock animations properly. Real events fallback to event.timeStamp,
           * or, if they don't, then a timeStamp is automatically created for them.
           * We're checking to see if the timeStamp surp***REMOVED***es the expected delay,
           * but we're using elapsedTime instead of the timeStamp on the 2nd
           * pre-condition since animations sometimes close off early */
          if (Math.max(timeStamp - startTime, 0) >= maxDelayTime && elapsedTime >= maxDuration) {
            activeAnimationComplete();
          }
        }
      }

      function blockTransitions(node, bool) {
        node.style[TRANSITION_PROP + PROPERTY_KEY] = bool ? 'none' : '';
      }

      function blockAnimations(node, bool) {
        node.style[ANIMATION_PROP + ANIMATION_PLAYSTATE_KEY] = bool ? 'paused' : '';
      }

      function animateBefore(animationEvent, element, cl***REMOVED***Name, styles) {
        if (animateSetup(animationEvent, element, cl***REMOVED***Name, styles)) {
          return function(cancelled) {
            cancelled && animateClose(element, cl***REMOVED***Name);
          };
        }
      }

      function animateAfter(animationEvent, element, cl***REMOVED***Name, afterAnimationComplete, styles) {
        if (element.data(NG_ANIMATE_CSS_DATA_KEY)) {
          return animateRun(animationEvent, element, cl***REMOVED***Name, afterAnimationComplete, styles);
        } else {
          animateClose(element, cl***REMOVED***Name);
          afterAnimationComplete();
        }
      }

      function animate(animationEvent, element, cl***REMOVED***Name, animationComplete, options) {
        //If the animateSetup function doesn't bother returning a
        //cancellation function then it means that there is no animation
        //to perform at all
        var preReflowCancellation = animateBefore(animationEvent, element, cl***REMOVED***Name, options.from);
        if (!preReflowCancellation) {
          clearCacheAfterReflow();
          animationComplete();
          return;
        }

        //There are two cancellation functions: one is before the first
        //reflow animation and the second is during the active state
        //animation. The first function will take care of removing the
        //data from the element which will not make the 2nd animation
        //happen in the first place
        var cancel = preReflowCancellation;
        afterReflow(element, function() {
          //once the reflow is complete then we point cancel to
          //the new cancellation function which will remove all of the
          //animation properties from the active animation
          cancel = animateAfter(animationEvent, element, cl***REMOVED***Name, animationComplete, options.to);
        });

        return function(cancelled) {
          (cancel || noop)(cancelled);
        };
      }

      function animateClose(element, cl***REMOVED***Name) {
        $$jqLite.removeCl***REMOVED***(element, cl***REMOVED***Name);
        var data = element.data(NG_ANIMATE_CSS_DATA_KEY);
        if (data) {
          if (data.running) {
            data.running--;
          }
          if (!data.running || data.running === 0) {
            element.removeData(NG_ANIMATE_CSS_DATA_KEY);
          }
        }
      }

      return {
        animate: function(element, cl***REMOVED***Name, from, to, animationCompleted, options) {
          options = options || {};
          options.from = from;
          options.to = to;
          return animate('animate', element, cl***REMOVED***Name, animationCompleted, options);
        },

        enter: function(element, animationCompleted, options) {
          options = options || {};
          return animate('enter', element, 'ng-enter', animationCompleted, options);
        },

        leave: function(element, animationCompleted, options) {
          options = options || {};
          return animate('leave', element, 'ng-leave', animationCompleted, options);
        },

        move: function(element, animationCompleted, options) {
          options = options || {};
          return animate('move', element, 'ng-move', animationCompleted, options);
        },

        beforeSetCl***REMOVED***: function(element, add, remove, animationCompleted, options) {
          options = options || {};
          var cl***REMOVED***Name = suffixCl***REMOVED***es(remove, '-remove') + ' ' +
                          suffixCl***REMOVED***es(add, '-add');
          var cancellationMethod = animateBefore('setCl***REMOVED***', element, cl***REMOVED***Name, options.from);
          if (cancellationMethod) {
            afterReflow(element, animationCompleted);
            return cancellationMethod;
          }
          clearCacheAfterReflow();
          animationCompleted();
        },

        beforeAddCl***REMOVED***: function(element, cl***REMOVED***Name, animationCompleted, options) {
          options = options || {};
          var cancellationMethod = animateBefore('addCl***REMOVED***', element, suffixCl***REMOVED***es(cl***REMOVED***Name, '-add'), options.from);
          if (cancellationMethod) {
            afterReflow(element, animationCompleted);
            return cancellationMethod;
          }
          clearCacheAfterReflow();
          animationCompleted();
        },

        beforeRemoveCl***REMOVED***: function(element, cl***REMOVED***Name, animationCompleted, options) {
          options = options || {};
          var cancellationMethod = animateBefore('removeCl***REMOVED***', element, suffixCl***REMOVED***es(cl***REMOVED***Name, '-remove'), options.from);
          if (cancellationMethod) {
            afterReflow(element, animationCompleted);
            return cancellationMethod;
          }
          clearCacheAfterReflow();
          animationCompleted();
        },

        setCl***REMOVED***: function(element, add, remove, animationCompleted, options) {
          options = options || {};
          remove = suffixCl***REMOVED***es(remove, '-remove');
          add = suffixCl***REMOVED***es(add, '-add');
          var cl***REMOVED***Name = remove + ' ' + add;
          return animateAfter('setCl***REMOVED***', element, cl***REMOVED***Name, animationCompleted, options.to);
        },

        addCl***REMOVED***: function(element, cl***REMOVED***Name, animationCompleted, options) {
          options = options || {};
          return animateAfter('addCl***REMOVED***', element, suffixCl***REMOVED***es(cl***REMOVED***Name, '-add'), animationCompleted, options.to);
        },

        removeCl***REMOVED***: function(element, cl***REMOVED***Name, animationCompleted, options) {
          options = options || {};
          return animateAfter('removeCl***REMOVED***', element, suffixCl***REMOVED***es(cl***REMOVED***Name, '-remove'), animationCompleted, options.to);
        }
      };

      function suffixCl***REMOVED***es(cl***REMOVED***es, suffix) {
        var cl***REMOVED***Name = '';
        cl***REMOVED***es = isArray(cl***REMOVED***es) ? cl***REMOVED***es : cl***REMOVED***es.split(/\s+/);
        forEach(cl***REMOVED***es, function(kl***REMOVED***, i) {
          if (kl***REMOVED*** && kl***REMOVED***.length > 0) {
            cl***REMOVED***Name += (i > 0 ? ' ' : '') + kl***REMOVED*** + suffix;
          }
        });
        return cl***REMOVED***Name;
      }
    }]);
  }]);


})(window, window.angular);
