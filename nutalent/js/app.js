/**
 * @license AngularJS v1.5.9-build.5018+sha.d14c7f3
 * (c) 2010-2016 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular) {'use strict';

/* global shallowCopy: true */

/**
 * Creates a shallow copy of an object, an array or a primitive.
 *
 * Assumes that there are no proto properties for objects.
 */
function shallowCopy(src, dst) {
  if (isArray(src)) {
    dst = dst || [];

    for (var i = 0, ii = src.length; i < ii; i++) {
      dst[i] = src[i];
    }
  } else if (isObject(src)) {
    dst = dst || {};

    for (var key in src) {
      if (!(key.charAt(0) === '$' && key.charAt(1) === '$')) {
        dst[key] = src[key];
      }
    }
  }

  return dst || src;
}

/* global shallowCopy: false */

// `isArray` and `isObject` are necessary for `shallowCopy()` (included via `src/shallowCopy.js`).
// They are initialized inside the `$RouteProvider`, to ensure `window.angular` is available.
var isArray;
var isObject;
var isDefined;

/**
 * @ngdoc module
 * @name ngRoute
 * @description
 *
 * # ngRoute
 *
 * The `ngRoute` module provides routing and deeplinking services and directives for angular apps.
 *
 * ## Example
 * See {@link ngRoute.$route#example $route} for an example of configuring and using `ngRoute`.
 *
 *
 * <div doc-module-components="ngRoute"></div>
 */
/* global -ngRouteModule */
var ngRouteModule = angular.
  module('ngRoute', []).
  provider('$route', $RouteProvider).
  // Ensure `$route` will be instantiated in time to capture the initial `$locationChangeSuccess`
  // event (unless explicitly disabled). This is necessary in case `ngView` is included in an
  // asynchronously loaded template.
  run(instantiateRoute);
var $routeMinErr = angular.$$minErr('ngRoute');
var isEagerInstantiationEnabled;


/**
 * @ngdoc provider
 * @name $routeProvider
 * @this
 *
 * @description
 *
 * Used for configuring routes.
 *
 * ## Example
 * See {@link ngRoute.$route#example $route} for an example of configuring and using `ngRoute`.
 *
 * ## Dependencies
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 */
function $RouteProvider() {
  isArray = angular.isArray;
  isObject = angular.isObject;
  isDefined = angular.isDefined;

  function inherit(parent, extra) {
    return angular.extend(Object.create(parent), extra);
  }

  var routes = {};

  /**
   * @ngdoc method
   * @name $routeProvider#when
   *
   * @param {string} path Route path (matched against `$location.path`). If `$location.path`
   *    contains redundant trailing slash or is missing one, the route will still match and the
   *    `$location.path` will be updated to add or drop the trailing slash to exactly match the
   *    route definition.
   *
   *    * `path` can contain named groups starting with a colon: e.g. `:name`. All characters up
   *        to the next slash are matched and stored in `$routeParams` under the given `name`
   *        when the route matches.
   *    * `path` can contain named groups starting with a colon and ending with a star:
   *        e.g.`:name*`. All characters are eagerly stored in `$routeParams` under the given `name`
   *        when the route matches.
   *    * `path` can contain optional named groups with a question mark: e.g.`:name?`.
   *
   *    For example, routes like `/color/:color/largecode/:largecode*\/edit` will match
   *    `/color/brown/largecode/code/with/slashes/edit` and extract:
   *
   *    * `color: brown`
   *    * `largecode: code/with/slashes`.
   *
   *
   * @param {Object} route Mapping information to be assigned to `$route.current` on route
   *    match.
   *
   *    Object properties:
   *
   *    - `controller` – `{(string|Function)=}` – Controller fn that should be associated with
   *      newly created scope or the name of a {@link angular.Module#controller registered
   *      controller} if passed as a string.
   *    - `controllerAs` – `{string=}` – An identifier name for a reference to the controller.
   *      If present, the controller will be published to scope under the `controllerAs` name.
   *    - `template` – `{(string|Function)=}` – html template as a string or a function that
   *      returns an html template as a string which should be used by {@link
   *      ngRoute.directive:ngView ngView} or {@link ng.directive:ngInclude ngInclude} directives.
   *      This property takes precedence over `templateUrl`.
   *
   *      If `template` is a function, it will be called with the following parameters:
   *
   *      - `{Array.<Object>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route
   *
   *    - `templateUrl` – `{(string|Function)=}` – path or function that returns a path to an html
   *      template that should be used by {@link ngRoute.directive:ngView ngView}.
   *
   *      If `templateUrl` is a function, it will be called with the following parameters:
   *
   *      - `{Array.<Object>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route
   *
   *    - `resolve` - `{Object.<string, Function>=}` - An optional map of dependencies which should
   *      be injected into the controller. If any of these dependencies are promises, the router
   *      will wait for them all to be resolved or one to be rejected before the controller is
   *      instantiated.
   *      If all the promises are resolved successfully, the values of the resolved promises are
   *      injected and {@link ngRoute.$route#$routeChangeSuccess $routeChangeSuccess} event is
   *      fired. If any of the promises are rejected the
   *      {@link ngRoute.$route#$routeChangeError $routeChangeError} event is fired.
   *      For easier access to the resolved dependencies from the template, the `resolve` map will
   *      be available on the scope of the route, under `$resolve` (by default) or a custom name
   *      specified by the `resolveAs` property (see below). This can be particularly useful, when
   *      working with {@link angular.Module#component components} as route templates.<br />
   *      <div class="alert alert-warning">
   *        **Note:** If your scope already contains a property with this name, it will be hidden
   *        or overwritten. Make sure, you specify an appropriate name for this property, that
   *        does not collide with other properties on the scope.
   *      </div>
   *      The map object is:
   *
   *      - `key` – `{string}`: a name of a dependency to be injected into the controller.
   *      - `factory` - `{string|Function}`: If `string` then it is an alias for a service.
   *        Otherwise if function, then it is {@link auto.$injector#invoke injected}
   *        and the return value is treated as the dependency. If the result is a promise, it is
   *        resolved before its value is injected into the controller. Be aware that
   *        `ngRoute.$routeParams` will still refer to the previous route within these resolve
   *        functions.  Use `$route.current.params` to access the new route parameters, instead.
   *
   *    - `resolveAs` - `{string=}` - The name under which the `resolve` map will be available on
   *      the scope of the route. If omitted, defaults to `$resolve`.
   *
   *    - `redirectTo` – `{(string|Function)=}` – value to update
   *      {@link ng.$location $location} path with and trigger route redirection.
   *
   *      If `redirectTo` is a function, it will be called with the following parameters:
   *
   *      - `{Object.<string>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route templateUrl.
   *      - `{string}` - current `$location.path()`
   *      - `{Object}` - current `$location.search()`
   *
   *      The custom `redirectTo` function is expected to return a string which will be used
   *      to update `$location.url()`. If the function throws an error, no further processing will
   *      take place and the {@link ngRoute.$route#$routeChangeError $routeChangeError} event will
   *      be fired.
   *
   *      Routes that specify `redirectTo` will not have their controllers, template functions
   *      or resolves called, the `$location` will be changed to the redirect url and route
   *      processing will stop. The exception to this is if the `redirectTo` is a function that
   *      returns `undefined`. In this case the route transition occurs as though there was no
   *      redirection.
   *
   *    - `resolveRedirectTo` – `{Function=}` – a function that will (eventually) return the value
   *      to update {@link ng.$location $location} URL with and trigger route redirection. In
   *      contrast to `redirectTo`, dependencies can be injected into `resolveRedirectTo` and the
   *      return value can be either a string or a promise that will be resolved to a string.
   *
   *      Similar to `redirectTo`, if the return value is `undefined` (or a promise that gets
   *      resolved to `undefined`), no redirection takes place and the route transition occurs as
   *      though there was no redirection.
   *
   *      If the function throws an error or the returned promise gets rejected, no further
   *      processing will take place and the
   *      {@link ngRoute.$route#$routeChangeError $routeChangeError} event will be fired.
   *
   *      `redirectTo` takes precedence over `resolveRedirectTo`, so specifying both on the same
   *      route definition, will cause the latter to be ignored.
   *
   *    - `[reloadOnSearch=true]` - `{boolean=}` - reload route when only `$location.search()`
   *      or `$location.hash()` changes.
   *
   *      If the option is set to `false` and url in the browser changes, then
   *      `$routeUpdate` event is broadcasted on the root scope.
   *
   *    - `[caseInsensitiveMatch=false]` - `{boolean=}` - match routes without being case sensitive
   *
   *      If the option is set to `true`, then the particular route can be matched without being
   *      case sensitive
   *
   * @returns {Object} self
   *
   * @description
   * Adds a new route definition to the `$route` service.
   */
  this.when = function(path, route) {
    //copy original route object to preserve params inherited from proto chain
    var routeCopy = shallowCopy(route);
    if (angular.isUndefined(routeCopy.reloadOnSearch)) {
      routeCopy.reloadOnSearch = true;
    }
    if (angular.isUndefined(routeCopy.caseInsensitiveMatch)) {
      routeCopy.caseInsensitiveMatch = this.caseInsensitiveMatch;
    }
    routes[path] = angular.extend(
      routeCopy,
      path && pathRegExp(path, routeCopy)
    );

    // create redirection for trailing slashes
    if (path) {
      var redirectPath = (path[path.length - 1] === '/')
            ? path.substr(0, path.length - 1)
            : path + '/';

      routes[redirectPath] = angular.extend(
        {redirectTo: path},
        pathRegExp(redirectPath, routeCopy)
      );
    }

    return this;
  };

  /**
   * @ngdoc property
   * @name $routeProvider#caseInsensitiveMatch
   * @description
   *
   * A boolean property indicating if routes defined
   * using this provider should be matched using a case insensitive
   * algorithm. Defaults to `false`.
   */
  this.caseInsensitiveMatch = false;

   /**
    * @param path {string} path
    * @param opts {Object} options
    * @return {?Object}
    *
    * @description
    * Normalizes the given path, returning a regular expression
    * and the original path.
    *
    * Inspired by pathRexp in visionmedia/express/lib/utils.js.
    */
  function pathRegExp(path, opts) {
    var insensitive = opts.caseInsensitiveMatch,
        ret = {
          originalPath: path,
          regexp: path
        },
        keys = ret.keys = [];

    path = path
      .replace(/([().])/g, '\\$1')
      .replace(/(\/)?:(\w+)(\*\?|[\?\*])?/g, function(_, slash, key, option) {
        var optional = (option === '?' || option === '*?') ? '?' : null;
        var star = (option === '*' || option === '*?') ? '*' : null;
        keys.push({ name: key, optional: !!optional });
        slash = slash || '';
        return ''
          + (optional ? '' : slash)
          + '(?:'
          + (optional ? slash : '')
          + (star && '(.+?)' || '([^/]+)')
          + (optional || '')
          + ')'
          + (optional || '');
      })
      .replace(/([\/$\*])/g, '\\$1');

    ret.regexp = new RegExp('^' + path + '$', insensitive ? 'i' : '');
    return ret;
  }

  /**
   * @ngdoc method
   * @name $routeProvider#otherwise
   *
   * @description
   * Sets route definition that will be used on route change when no other route definition
   * is matched.
   *
   * @param {Object|string} params Mapping information to be assigned to `$route.current`.
   * If called with a string, the value maps to `redirectTo`.
   * @returns {Object} self
   */
  this.otherwise = function(params) {
    if (typeof params === 'string') {
      params = {redirectTo: params};
    }
    this.when(null, params);
    return this;
  };

  /**
   * @ngdoc method
   * @name $routeProvider#eagerInstantiationEnabled
   * @kind function
   *
   * @description
   * Call this method as a setter to enable/disable eager instantiation of the
   * {@link ngRoute.$route $route} service upon application bootstrap. You can also call it as a
   * getter (i.e. without any arguments) to get the current value of the
   * `eagerInstantiationEnabled` flag.
   *
   * Instantiating `$route` early is necessary for capturing the initial
   * {@link ng.$location#$locationChangeStart $locationChangeStart} event and navigating to the
   * appropriate route. Usually, `$route` is instantiated in time by the
   * {@link ngRoute.ngView ngView} directive. Yet, in cases where `ngView` is included in an
   * asynchronously loaded template (e.g. in another directive's template), the directive factory
   * might not be called soon enough for `$route` to be instantiated _before_ the initial
   * `$locationChangeSuccess` event is fired. Eager instantiation ensures that `$route` is always
   * instantiated in time, regardless of when `ngView` will be loaded.
   *
   * The default value is true.
   *
   * **Note**:<br />
   * You may want to disable the default behavior when unit-testing modules that depend on
   * `ngRoute`, in order to avoid an unexpected request for the default route's template.
   *
   * @param {boolean=} enabled - If provided, update the internal `eagerInstantiationEnabled` flag.
   *
   * @returns {*} The current value of the `eagerInstantiationEnabled` flag if used as a getter or
   *     itself (for chaining) if used as a setter.
   */
  isEagerInstantiationEnabled = true;
  this.eagerInstantiationEnabled = function eagerInstantiationEnabled(enabled) {
    if (isDefined(enabled)) {
      isEagerInstantiationEnabled = enabled;
      return this;
    }

    return isEagerInstantiationEnabled;
  };


  this.$get = ['$rootScope',
               '$location',
               '$routeParams',
               '$q',
               '$injector',
               '$templateRequest',
               '$sce',
      function($rootScope, $location, $routeParams, $q, $injector, $templateRequest, $sce) {

    /**
     * @ngdoc service
     * @name $route
     * @requires $location
     * @requires $routeParams
     *
     * @property {Object} current Reference to the current route definition.
     * The route definition contains:
     *
     *   - `controller`: The controller constructor as defined in the route definition.
     *   - `locals`: A map of locals which is used by {@link ng.$controller $controller} service for
     *     controller instantiation. The `locals` contain
     *     the resolved values of the `resolve` map. Additionally the `locals` also contain:
     *
     *     - `$scope` - The current route scope.
     *     - `$template` - The current route template HTML.
     *
     *     The `locals` will be assigned to the route scope's `$resolve` property. You can override
     *     the property name, using `resolveAs` in the route definition. See
     *     {@link ngRoute.$routeProvider $routeProvider} for more info.
     *
     * @property {Object} routes Object with all route configuration Objects as its properties.
     *
     * @description
     * `$route` is used for deep-linking URLs to controllers and views (HTML partials).
     * It watches `$location.url()` and tries to map the path to an existing route definition.
     *
     * Requires the {@link ngRoute `ngRoute`} module to be installed.
     *
     * You can define routes through {@link ngRoute.$routeProvider $routeProvider}'s API.
     *
     * The `$route` service is typically used in conjunction with the
     * {@link ngRoute.directive:ngView `ngView`} directive and the
     * {@link ngRoute.$routeParams `$routeParams`} service.
     *
     * @example
     * This example shows how changing the URL hash causes the `$route` to match a route against the
     * URL, and the `ngView` pulls in the partial.
     *
     * <example name="$route-service" module="ngRouteExample"
     *          deps="angular-route.js" fixBase="true">
     *   <file name="index.html">
     *     <div ng-controller="MainController">
     *       Choose:
     *       <a href="Book/Moby">Moby</a> |
     *       <a href="Book/Moby/ch/1">Moby: Ch1</a> |
     *       <a href="Book/Gatsby">Gatsby</a> |
     *       <a href="Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
     *       <a href="Book/Scarlet">Scarlet Letter</a><br/>
     *
     *       <div ng-view></div>
     *
     *       <hr />
     *
     *       <pre>$location.path() = {{$location.path()}}</pre>
     *       <pre>$route.current.templateUrl = {{$route.current.templateUrl}}</pre>
     *       <pre>$route.current.params = {{$route.current.params}}</pre>
     *       <pre>$route.current.scope.name = {{$route.current.scope.name}}</pre>
     *       <pre>$routeParams = {{$routeParams}}</pre>
     *     </div>
     *   </file>
     *
     *   <file name="book.html">
     *     controller: {{name}}<br />
     *     Book Id: {{params.bookId}}<br />
     *   </file>
     *
     *   <file name="chapter.html">
     *     controller: {{name}}<br />
     *     Book Id: {{params.bookId}}<br />
     *     Chapter Id: {{params.chapterId}}
     *   </file>
     *
     *   <file name="script.js">
     *     angular.module('ngRouteExample', ['ngRoute'])
     *
     *      .controller('MainController', function($scope, $route, $routeParams, $location) {
     *          $scope.$route = $route;
     *          $scope.$location = $location;
     *          $scope.$routeParams = $routeParams;
     *      })
     *
     *      .controller('BookController', function($scope, $routeParams) {
     *          $scope.name = 'BookController';
     *          $scope.params = $routeParams;
     *      })
     *
     *      .controller('ChapterController', function($scope, $routeParams) {
     *          $scope.name = 'ChapterController';
     *          $scope.params = $routeParams;
     *      })
     *
     *     .config(function($routeProvider, $locationProvider) {
     *       $routeProvider
     *        .when('/Book/:bookId', {
     *         templateUrl: 'book.html',
     *         controller: 'BookController',
     *         resolve: {
     *           // I will cause a 1 second delay
     *           delay: function($q, $timeout) {
     *             var delay = $q.defer();
     *             $timeout(delay.resolve, 1000);
     *             return delay.promise;
     *           }
     *         }
     *       })
     *       .when('/Book/:bookId/ch/:chapterId', {
     *         templateUrl: 'chapter.html',
     *         controller: 'ChapterController'
     *       });
     *
     *       // configure html5 to get links working on jsfiddle
     *       $locationProvider.html5Mode(true);
     *     });
     *
     *   </file>
     *
     *   <file name="protractor.js" type="protractor">
     *     it('should load and compile correct template', function() {
     *       element(by.linkText('Moby: Ch1')).click();
     *       var content = element(by.css('[ng-view]')).getText();
     *       expect(content).toMatch(/controller: ChapterController/);
     *       expect(content).toMatch(/Book Id: Moby/);
     *       expect(content).toMatch(/Chapter Id: 1/);
     *
     *       element(by.partialLinkText('Scarlet')).click();
     *
     *       content = element(by.css('[ng-view]')).getText();
     *       expect(content).toMatch(/controller: BookController/);
     *       expect(content).toMatch(/Book Id: Scarlet/);
     *     });
     *   </file>
     * </example>
     */

    /**
     * @ngdoc event
     * @name $route#$routeChangeStart
     * @eventType broadcast on root scope
     * @description
     * Broadcasted before a route change. At this  point the route services starts
     * resolving all of the dependencies needed for the route change to occur.
     * Typically this involves fetching the view template as well as any dependencies
     * defined in `resolve` route property. Once  all of the dependencies are resolved
     * `$routeChangeSuccess` is fired.
     *
     * The route change (and the `$location` change that triggered it) can be prevented
     * by calling `preventDefault` method of the event. See {@link ng.$rootScope.Scope#$on}
     * for more details about event object.
     *
     * @param {Object} angularEvent Synthetic event object.
     * @param {Route} next Future route information.
     * @param {Route} current Current route information.
     */

    /**
     * @ngdoc event
     * @name $route#$routeChangeSuccess
     * @eventType broadcast on root scope
     * @description
     * Broadcasted after a route change has happened successfully.
     * The `resolve` dependencies are now available in the `current.locals` property.
     *
     * {@link ngRoute.directive:ngView ngView} listens for the directive
     * to instantiate the controller and render the view.
     *
     * @param {Object} angularEvent Synthetic event object.
     * @param {Route} current Current route information.
     * @param {Route|Undefined} previous Previous route information, or undefined if current is
     * first route entered.
     */

    /**
     * @ngdoc event
     * @name $route#$routeChangeError
     * @eventType broadcast on root scope
     * @description
     * Broadcasted if a redirection function fails or any redirection or resolve promises are
     * rejected.
     *
     * @param {Object} angularEvent Synthetic event object
     * @param {Route} current Current route information.
     * @param {Route} previous Previous route information.
     * @param {Route} rejection The thrown error or the rejection reason of the promise. Usually
     * the rejection reason is the error that caused the promise to get rejected.
     */

    /**
     * @ngdoc event
     * @name $route#$routeUpdate
     * @eventType broadcast on root scope
     * @description
     * The `reloadOnSearch` property has been set to false, and we are reusing the same
     * instance of the Controller.
     *
     * @param {Object} angularEvent Synthetic event object
     * @param {Route} current Current/previous route information.
     */

    var forceReload = false,
        preparedRoute,
        preparedRouteIsUpdateOnly,
        $route = {
          routes: routes,

          /**
           * @ngdoc method
           * @name $route#reload
           *
           * @description
           * Causes `$route` service to reload the current route even if
           * {@link ng.$location $location} hasn't changed.
           *
           * As a result of that, {@link ngRoute.directive:ngView ngView}
           * creates new scope and reinstantiates the controller.
           */
          reload: function() {
            forceReload = true;

            var fakeLocationEvent = {
              defaultPrevented: false,
              preventDefault: function fakePreventDefault() {
                this.defaultPrevented = true;
                forceReload = false;
              }
            };

            $rootScope.$evalAsync(function() {
              prepareRoute(fakeLocationEvent);
              if (!fakeLocationEvent.defaultPrevented) commitRoute();
            });
          },

          /**
           * @ngdoc method
           * @name $route#updateParams
           *
           * @description
           * Causes `$route` service to update the current URL, replacing
           * current route parameters with those specified in `newParams`.
           * Provided property names that match the route's path segment
           * definitions will be interpolated into the location's path, while
           * remaining properties will be treated as query params.
           *
           * @param {!Object<string, string>} newParams mapping of URL parameter names to values
           */
          updateParams: function(newParams) {
            if (this.current && this.current.$$route) {
              newParams = angular.extend({}, this.current.params, newParams);
              $location.path(interpolate(this.current.$$route.originalPath, newParams));
              // interpolate modifies newParams, only query params are left
              $location.search(newParams);
            } else {
              throw $routeMinErr('norout', 'Tried updating route when with no current route');
            }
          }
        };

    $rootScope.$on('$locationChangeStart', prepareRoute);
    $rootScope.$on('$locationChangeSuccess', commitRoute);

    return $route;

    /////////////////////////////////////////////////////

    /**
     * @param on {string} current url
     * @param route {Object} route regexp to match the url against
     * @return {?Object}
     *
     * @description
     * Check if the route matches the current url.
     *
     * Inspired by match in
     * visionmedia/express/lib/router/router.js.
     */
    function switchRouteMatcher(on, route) {
      var keys = route.keys,
          params = {};

      if (!route.regexp) return null;

      var m = route.regexp.exec(on);
      if (!m) return null;

      for (var i = 1, len = m.length; i < len; ++i) {
        var key = keys[i - 1];

        var val = m[i];

        if (key && val) {
          params[key.name] = val;
        }
      }
      return params;
    }

    function prepareRoute($locationEvent) {
      var lastRoute = $route.current;

      preparedRoute = parseRoute();
      preparedRouteIsUpdateOnly = preparedRoute && lastRoute && preparedRoute.$$route === lastRoute.$$route
          && angular.equals(preparedRoute.pathParams, lastRoute.pathParams)
          && !preparedRoute.reloadOnSearch && !forceReload;

      if (!preparedRouteIsUpdateOnly && (lastRoute || preparedRoute)) {
        if ($rootScope.$broadcast('$routeChangeStart', preparedRoute, lastRoute).defaultPrevented) {
          if ($locationEvent) {
            $locationEvent.preventDefault();
          }
        }
      }
    }

    function commitRoute() {
      var lastRoute = $route.current;
      var nextRoute = preparedRoute;

      if (preparedRouteIsUpdateOnly) {
        lastRoute.params = nextRoute.params;
        angular.copy(lastRoute.params, $routeParams);
        $rootScope.$broadcast('$routeUpdate', lastRoute);
      } else if (nextRoute || lastRoute) {
        forceReload = false;
        $route.current = nextRoute;

        var nextRoutePromise = $q.resolve(nextRoute);

        nextRoutePromise.
          then(getRedirectionData).
          then(handlePossibleRedirection).
          then(function(keepProcessingRoute) {
            return keepProcessingRoute && nextRoutePromise.
              then(resolveLocals).
              then(function(locals) {
                // after route change
                if (nextRoute === $route.current) {
                  if (nextRoute) {
                    nextRoute.locals = locals;
                    angular.copy(nextRoute.params, $routeParams);
                  }
                  $rootScope.$broadcast('$routeChangeSuccess', nextRoute, lastRoute);
                }
              });
          }).catch(function(error) {
            if (nextRoute === $route.current) {
              $rootScope.$broadcast('$routeChangeError', nextRoute, lastRoute, error);
            }
          });
      }
    }

    function getRedirectionData(route) {
      var data = {
        route: route,
        hasRedirection: false
      };

      if (route) {
        if (route.redirectTo) {
          if (angular.isString(route.redirectTo)) {
            data.path = interpolate(route.redirectTo, route.params);
            data.search = route.params;
            data.hasRedirection = true;
          } else {
            var oldPath = $location.path();
            var oldSearch = $location.search();
            var newUrl = route.redirectTo(route.pathParams, oldPath, oldSearch);

            if (angular.isDefined(newUrl)) {
              data.url = newUrl;
              data.hasRedirection = true;
            }
          }
        } else if (route.resolveRedirectTo) {
          return $q.
            resolve($injector.invoke(route.resolveRedirectTo)).
            then(function(newUrl) {
              if (angular.isDefined(newUrl)) {
                data.url = newUrl;
                data.hasRedirection = true;
              }

              return data;
            });
        }
      }

      return data;
    }

    function handlePossibleRedirection(data) {
      var keepProcessingRoute = true;

      if (data.route !== $route.current) {
        keepProcessingRoute = false;
      } else if (data.hasRedirection) {
        var oldUrl = $location.url();
        var newUrl = data.url;

        if (newUrl) {
          $location.
            url(newUrl).
            replace();
        } else {
          newUrl = $location.
            path(data.path).
            search(data.search).
            replace().
            url();
        }

        if (newUrl !== oldUrl) {
          // Exit out and don't process current next value,
          // wait for next location change from redirect
          keepProcessingRoute = false;
        }
      }

      return keepProcessingRoute;
    }

    function resolveLocals(route) {
      if (route) {
        var locals = angular.extend({}, route.resolve);
        angular.forEach(locals, function(value, key) {
          locals[key] = angular.isString(value) ?
              $injector.get(value) :
              $injector.invoke(value, null, null, key);
        });
        var template = getTemplateFor(route);
        if (angular.isDefined(template)) {
          locals['$template'] = template;
        }
        return $q.all(locals);
      }
    }

    function getTemplateFor(route) {
      var template, templateUrl;
      if (angular.isDefined(template = route.template)) {
        if (angular.isFunction(template)) {
          template = template(route.params);
        }
      } else if (angular.isDefined(templateUrl = route.templateUrl)) {
        if (angular.isFunction(templateUrl)) {
          templateUrl = templateUrl(route.params);
        }
        if (angular.isDefined(templateUrl)) {
          route.loadedTemplateUrl = $sce.valueOf(templateUrl);
          template = $templateRequest(templateUrl);
        }
      }
      return template;
    }

    /**
     * @returns {Object} the current active route, by matching it against the URL
     */
    function parseRoute() {
      // Match a route
      var params, match;
      angular.forEach(routes, function(route, path) {
        if (!match && (params = switchRouteMatcher($location.path(), route))) {
          match = inherit(route, {
            params: angular.extend({}, $location.search(), params),
            pathParams: params});
          match.$$route = route;
        }
      });
      // No route matched; fallback to "otherwise" route
      return match || routes[null] && inherit(routes[null], {params: {}, pathParams:{}});
    }

    /**
     * @returns {string} interpolation of the redirect path with the parameters
     */
    function interpolate(string, params) {
      var result = [];
      angular.forEach((string || '').split(':'), function(segment, i) {
        if (i === 0) {
          result.push(segment);
        } else {
          var segmentMatch = segment.match(/(\w+)(?:[?*])?(.*)/);
          var key = segmentMatch[1];
          result.push(params[key]);
          result.push(segmentMatch[2] || '');
          delete params[key];
        }
      });
      return result.join('');
    }
  }];
}

instantiateRoute.$inject = ['$injector'];
function instantiateRoute($injector) {
  if (isEagerInstantiationEnabled) {
    // Instantiate `$route`
    $injector.get('$route');
  }
}

ngRouteModule.provider('$routeParams', $RouteParamsProvider);


/**
 * @ngdoc service
 * @name $routeParams
 * @requires $route
 * @this
 *
 * @description
 * The `$routeParams` service allows you to retrieve the current set of route parameters.
 *
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 *
 * The route parameters are a combination of {@link ng.$location `$location`}'s
 * {@link ng.$location#search `search()`} and {@link ng.$location#path `path()`}.
 * The `path` parameters are extracted when the {@link ngRoute.$route `$route`} path is matched.
 *
 * In case of parameter name collision, `path` params take precedence over `search` params.
 *
 * The service guarantees that the identity of the `$routeParams` object will remain unchanged
 * (but its properties will likely change) even when a route change occurs.
 *
 * Note that the `$routeParams` are only updated *after* a route change completes successfully.
 * This means that you cannot rely on `$routeParams` being correct in route resolve functions.
 * Instead you can use `$route.current.params` to access the new route's parameters.
 *
 * @example
 * ```js
 *  // Given:
 *  // URL: http://server.com/index.html#/Chapter/1/Section/2?search=moby
 *  // Route: /Chapter/:chapterId/Section/:sectionId
 *  //
 *  // Then
 *  $routeParams ==> {chapterId:'1', sectionId:'2', search:'moby'}
 * ```
 */
function $RouteParamsProvider() {
  this.$get = function() { return {}; };
}

ngRouteModule.directive('ngView', ngViewFactory);
ngRouteModule.directive('ngView', ngViewFillContentFactory);


/**
 * @ngdoc directive
 * @name ngView
 * @restrict ECA
 *
 * @description
 * # Overview
 * `ngView` is a directive that complements the {@link ngRoute.$route $route} service by
 * including the rendered template of the current route into the main layout (`index.html`) file.
 * Every time the current route changes, the included view changes with it according to the
 * configuration of the `$route` service.
 *
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 *
 * @animations
 * | Animation                        | Occurs                              |
 * |----------------------------------|-------------------------------------|
 * | {@link ng.$animate#enter enter}  | when the new element is inserted to the DOM |
 * | {@link ng.$animate#leave leave}  | when the old element is removed from to the DOM  |
 *
 * The enter and leave animation occur concurrently.
 *
 * @knownIssue If `ngView` is contained in an asynchronously loaded template (e.g. in another
 *             directive's templateUrl or in a template loaded using `ngInclude`), then you need to
 *             make sure that `$route` is instantiated in time to capture the initial
 *             `$locationChangeStart` event and load the appropriate view. One way to achieve this
 *             is to have it as a dependency in a `.run` block:
 *             `myModule.run(['$route', function() {}]);`
 *
 * @scope
 * @priority 400
 * @param {string=} onload Expression to evaluate whenever the view updates.
 *
 * @param {string=} autoscroll Whether `ngView` should call {@link ng.$anchorScroll
 *                  $anchorScroll} to scroll the viewport after the view is updated.
 *
 *                  - If the attribute is not set, disable scrolling.
 *                  - If the attribute is set without value, enable scrolling.
 *                  - Otherwise enable scrolling only if the `autoscroll` attribute value evaluated
 *                    as an expression yields a truthy value.
 * @example
    <example name="ngView-directive" module="ngViewExample"
             deps="angular-route.js;angular-animate.js"
             animations="true" fixBase="true">
      <file name="index.html">
        <div ng-controller="MainCtrl as main">
          Choose:
          <a href="Book/Moby">Moby</a> |
          <a href="Book/Moby/ch/1">Moby: Ch1</a> |
          <a href="Book/Gatsby">Gatsby</a> |
          <a href="Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
          <a href="Book/Scarlet">Scarlet Letter</a><br/>
          <div class="view-animate-container">
            <div ng-view class="view-animate"></div>
          </div>
          <hr />
          <pre>$location.path() = {{main.$location.path()}}</pre>
          <pre>$route.current.templateUrl = {{main.$route.current.templateUrl}}</pre>
          <pre>$route.current.params = {{main.$route.current.params}}</pre>
          <pre>$routeParams = {{main.$routeParams}}</pre>
        </div>
      </file>
      <file name="book.html">
        <div>
          controller: {{book.name}}<br />
          Book Id: {{book.params.bookId}}<br />
        </div>
      </file>
      <file name="chapter.html">
        <div>
          controller: {{chapter.name}}<br />
          Book Id: {{chapter.params.bookId}}<br />
          Chapter Id: {{chapter.params.chapterId}}
        </div>
      </file>
      <file name="animations.css">
        .view-animate-container {
          position:relative;
          height:100px!important;
          background:white;
          border:1px solid black;
          height:40px;
          overflow:hidden;
        }
        .view-animate {
          padding:10px;
        }
        .view-animate.ng-enter, .view-animate.ng-leave {
          transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
          display:block;
          width:100%;
          border-left:1px solid black;
          position:absolute;
          top:0;
          left:0;
          right:0;
          bottom:0;
          padding:10px;
        }
        .view-animate.ng-enter {
          left:100%;
        }
        .view-animate.ng-enter.ng-enter-active {
          left:0;
        }
        .view-animate.ng-leave.ng-leave-active {
          left:-100%;
        }
      </file>
      <file name="script.js">
        angular.module('ngViewExample', ['ngRoute', 'ngAnimate'])
          .config(['$routeProvider', '$locationProvider',
            function($routeProvider, $locationProvider) {
              $routeProvider
                .when('/Book/:bookId', {
                  templateUrl: 'book.html',
                  controller: 'BookCtrl',
                  controllerAs: 'book'
                })
                .when('/Book/:bookId/ch/:chapterId', {
                  templateUrl: 'chapter.html',
                  controller: 'ChapterCtrl',
                  controllerAs: 'chapter'
                });
              $locationProvider.html5Mode(true);
          }])
          .controller('MainCtrl', ['$route', '$routeParams', '$location',
            function MainCtrl($route, $routeParams, $location) {
              this.$route = $route;
              this.$location = $location;
              this.$routeParams = $routeParams;
          }])
          .controller('BookCtrl', ['$routeParams', function BookCtrl($routeParams) {
            this.name = 'BookCtrl';
            this.params = $routeParams;
          }])
          .controller('ChapterCtrl', ['$routeParams', function ChapterCtrl($routeParams) {
            this.name = 'ChapterCtrl';
            this.params = $routeParams;
          }]);
      </file>
      <file name="protractor.js" type="protractor">
        it('should load and compile correct template', function() {
          element(by.linkText('Moby: Ch1')).click();
          var content = element(by.css('[ng-view]')).getText();
          expect(content).toMatch(/controller: ChapterCtrl/);
          expect(content).toMatch(/Book Id: Moby/);
          expect(content).toMatch(/Chapter Id: 1/);
          element(by.partialLinkText('Scarlet')).click();
          content = element(by.css('[ng-view]')).getText();
          expect(content).toMatch(/controller: BookCtrl/);
          expect(content).toMatch(/Book Id: Scarlet/);
        });
      </file>
    </example>
 */


/**
 * @ngdoc event
 * @name ngView#$viewContentLoaded
 * @eventType emit on the current ngView scope
 * @description
 * Emitted every time the ngView content is reloaded.
 */
ngViewFactory.$inject = ['$route', '$anchorScroll', '$animate'];
function ngViewFactory($route, $anchorScroll, $animate) {
  return {
    restrict: 'ECA',
    terminal: true,
    priority: 400,
    transclude: 'element',
    link: function(scope, $element, attr, ctrl, $transclude) {
        var currentScope,
            currentElement,
            previousLeaveAnimation,
            autoScrollExp = attr.autoscroll,
            onloadExp = attr.onload || '';

        scope.$on('$routeChangeSuccess', update);
        update();

        function cleanupLastView() {
          if (previousLeaveAnimation) {
            $animate.cancel(previousLeaveAnimation);
            previousLeaveAnimation = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }
          if (currentElement) {
            previousLeaveAnimation = $animate.leave(currentElement);
            previousLeaveAnimation.then(function() {
              previousLeaveAnimation = null;
            });
            currentElement = null;
          }
        }

        function update() {
          var locals = $route.current && $route.current.locals,
              template = locals && locals.$template;

          if (angular.isDefined(template)) {
            var newScope = scope.$new();
            var current = $route.current;

            // Note: This will also link all children of ng-view that were contained in the original
            // html. If that content contains controllers, ... they could pollute/change the scope.
            // However, using ng-view on an element with additional content does not make sense...
            // Note: We can't remove them in the cloneAttchFn of $transclude as that
            // function is called before linking the content, which would apply child
            // directives to non existing elements.
            var clone = $transclude(newScope, function(clone) {
              $animate.enter(clone, null, currentElement || $element).then(function onNgViewEnter() {
                if (angular.isDefined(autoScrollExp)
                  && (!autoScrollExp || scope.$eval(autoScrollExp))) {
                  $anchorScroll();
                }
              });
              cleanupLastView();
            });

            currentElement = clone;
            currentScope = current.scope = newScope;
            currentScope.$emit('$viewContentLoaded');
            currentScope.$eval(onloadExp);
          } else {
            cleanupLastView();
          }
        }
    }
  };
}

// This directive is called during the $transclude call of the first `ngView` directive.
// It will replace and compile the content of the element with the loaded template.
// We need this directive so that the element content is already filled when
// the link function of another directive on the same element as ngView
// is called.
ngViewFillContentFactory.$inject = ['$compile', '$controller', '$route'];
function ngViewFillContentFactory($compile, $controller, $route) {
  return {
    restrict: 'ECA',
    priority: -400,
    link: function(scope, $element) {
      var current = $route.current,
          locals = current.locals;

      $element.html(locals.$template);

      var link = $compile($element.contents());

      if (current.controller) {
        locals.$scope = scope;
        var controller = $controller(current.controller, locals);
        if (current.controllerAs) {
          scope[current.controllerAs] = controller;
        }
        $element.data('$ngControllerController', controller);
        $element.children().data('$ngControllerController', controller);
      }
      scope[current.resolveAs || '$resolve'] = locals;

      link(scope);
    }
  };
}


})(window, window.angular);

// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js

var app = angular.module('app', [
    'ionic',
    'ngRoute',
    'ngCordova',
    'ngOpenFB',
    'ngCordovaOauth',
    'dibari.angular-ellipsis',
    //'timer',
    'jrCrop'
  ]),

  //host = 'https://nutalent.co.id',
  host = '/api',
  hostAPI = host + '/api/v201',
  db,
  profileAvatar = "",
  imagePictURI = "",
  confirmPhotoMode = false;

//add startsWith prototype
if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str) {
    return this.indexOf(str) === 0;
  };
}

//check if run on livereload or emulator -- for develop and debuging only
if (!document.URL.startsWith('file:///')) {
  //update proxy - > ionic.config.json`
  window.host = 'https://nutalent.co.id';
  window.hostAPI = host + '/api/v201';

  console.log('not device');
  this.isLiveReload = true;
} else {
  window.host = 'https://nutalent.co.id';
  window.hostAPI = host + '/api/v201';

  console.log('device');
}

app.config(function ($sceDelegateProvider, $ionicConfigProvider) {
  $ionicConfigProvider.views.maxCache(0);
  $sceDelegateProvider.resourceUrlWhitelist([
    // Allow same origin resource loads.
    'self',
    // Allow loading from our assets domain.  Notice the difference between * and **.
    //'https://nutalent.co.id',
    'https://www.youtube.com/**',
    'https://nutalent.co.id/**'
  ]);
});

app.api = {
  url: hostAPI,
  login: '/login_post',
  loginSocmed: '/login_or_register_sosmed',
  register: '/register_post',
  category_follow: '/category_follow',
  follow_user: '/follow_toggle',
  password: {
    forgot: '/forgot_post'
  },
  home: '/home',
  program: {
    list: '/projects_index',
    detail: '/projects_detail'
  },
  profile: '/profile_index',
  profile_lain: '/profile_user',
  profile_edit: '/profile_edit_post',
  upload: {
    avatar: '/profile_edit_upload_post'
  },
  video: {
    like: '/video_like_post',
    list: {
      populer: 'video/list/populer',
      pick: 'video/list/pick',
    }
  },
  gallery: {
    list: '/gallery_index',
    detail: '/gallery_detail',
  },
  comment: '/comment_index',
  comment_post: '/comment_post',
  notification: '/notifs'
};

app.run(function ($rootScope, $state, $ionicPlatform, $cordovaSQLite, $cordovaDevice, $filter, $ionicScrollDelegate, $window, $timeout, $cordovaNetwork, $interval, $localstorage, $ionicHistory ) {
  //internet connection
  //console.log('check: ', $cordovaNetwork)

  window.addEventListener('native.keyboardShow', function () {
    cordova.plugins.Keyboard.disableScroll(true);
  });

  // $rootScope.checkInternetConnection = function () {
  //   $rootScope.online = navigator.onLine;
  //   $window.addEventListener("offline", function () {
  //     $rootScope.$apply(function () {
  //       $rootScope.online = false;
  //     });
  //   }, false);

  //   $window.addEventListener("online", function () {
  //     $rootScope.$apply(function () {
  //       $rootScope.online = true;
  //     });
  //   }, false);

  //   if ($cordovaNetwork.getNetwork() == 'none' || $cordovaNetwork.getNetwork() == 'unknown') {
  //     $rootScope.online = false;
  //   } else {
  //     $rootScope.online = true;
  //   };

  //   $timeout(function () {
  //     console.log('status now: ', $cordovaNetwork.getNetwork());
  //     $rootScope.checkInternetConnection();
  //   }, 2000);
  // }

  // $rootScope.checkInternetConnection();

  $rootScope.killApp = false;

  var backgroundCheck = function () {
    $rootScope.killApp = false;
    // $rootScope.online = true;
    $rootScope.timeInterval = 0;
    $rootScope.whenToCloseApp = $interval(function () {
      $rootScope.timeInterval++
    }, 1000)
  }

  var resumeCheck = function () {
    $rootScope.online = true;
    $interval.cancel($rootScope.whenToCloseApp);
    console.log('time interval is: ', $rootScope.timeInterval);
    if ($rootScope.timeInterval > 900000) {
      $rootScope.killApp = true;
      console.log('kill app, ', $rootScope.killApp)
    }
  }

  document.addEventListener('pause', backgroundCheck, false)
  document.addEventListener('resume', resumeCheck, false)

  $rootScope.$on('$stateChangeSuccess', function () {
    // $rootScope.checkInternetConnection();
  });


  //dummy config
  $rootScope.CONFIG = {
    firstBoot: false,
    deviceData: {
      device_type: null
    },
    isLogin: false,
    userLogin: {},
    //set status request
    status: {}
  }

  console.log(Object.keys($localstorage.getObject('userLogin')).length);

  //check user isLogin
  if (Object.keys($localstorage.getObject('userLogin')).length) {
    console.log('user exist');
    $rootScope.CONFIG.userLogin = $localstorage.getObject('userLogin');
    $rootScope.CONFIG.isLogin = true;
  }

  $ionicPlatform.registerBackButtonAction(function(e) {
    if ($state.current.name == 'index') {
      window.plugins.appMinimize.minimize();
    } else if ($state.current.name == 'gate') {
      window.plugins.appMinimize.minimize();
    } else if ($state.current.name == 'home.index') {
      window.plugins.appMinimize.minimize();
    } else {
      $ionicHistory.goBack();
    }
    e.preventDefault();
    return false;
  }, 101);

  //ionic ready
  $ionicPlatform.ready(function () {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins
      .Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(false);
    }

    if (window.StatusBar) {
      // window.StatusBar.styleBlackOpaque();
      if (ionic.Platform.isIOS()) {
        window.StatusBar.overlaysWebView(true);
      } else {
        window.StatusBar.overlaysWebView(false);
      }

      // window.StatusBar.backgroundColorByHexString('#000000');
      window.StatusBar.styleLightContent();
      // org.apache.cordova.statusbar required
    }

    if (navigator.splashscreen) {
      navigator.splashscreen.hide();
    }

    //set devicetype
    $rootScope.CONFIG.deviceData.device_type = ionic.Platform.isIOS() ?
      'ios' : 'android';

    //set device web view value
    $rootScope.CONFIG.deviceData.isWebView = ionic.Platform.isWebView();

    if (ionic.Platform.isWebView()) {

    } else {
      //for develop in browser
    }


  });
});

app.controller('globalCtrl', ['$rootScope', '$ionicSideMenuDelegate', '$scope', '$stateParams', '$state', '$timeout', '$window', '$ionicLoading', '$ionicListDelegate', '$ionicScrollDelegate', '$ionicBackdrop', '$ionicHistory', '$ionicViewSwitcher', '$ionicPopup', '$ionicNavBarDelegate', '$location', '$ionicPlatform', '$filter', "$interval", '$localstorage', '$cordovaSocialSharing',
    // You can include any angular dependencies as parameters for this function
    // TIP: Access Route Parameters for your page via $stateParams.parameterName
    function ($rootScope, $ionicSideMenuDelegate, $scope, $stateParams, $state, $timeout, $window, $ionicLoading, $ionicListDelegate, $ionicScrollDelegate, $ionicBackdrop, $ionicHistory, $ionicViewSwitcher, $ionicPopup, $ionicNavBarDelegate, $location, $ionicPlatform, $filter, $interval, $localstorage, $cordovaSocialSharing) {
      // -------------------------------------------------------------------

      $ionicNavBarDelegate.showBackButton(true);

      // $ionicLoading.show({
      //   animation: 'fade-in',
      //   showBackdrop: true
      // });

      $timeout(function () {
        //detect if user login
      }, 0)

      if ($rootScope.CONFIG.isLogin == false) {
        $state.go('home.profile');
      }

      // console.log($rootScope.CONFIG);

      $scope.event = {};

      $rootScope.state = {
        prev: '',
        current: $state.current.name
      };

      $rootScope.event = $scope.event;

      $scope.Math = window.Math;

      $rootScope.closeMenu = function() {
        $ionicSideMenuDelegate.toggleRight();
        console.log('toggle');
      }

      $rootScope.hubKami = function() {
        $ionicSideMenuDelegate.toggleRight();
        $window.open("https://nutalent.co.id/page/s/contact-us","_self");
      }


      //global function
      $rootScope.logOut = function () {
        var confirmPopup = $ionicPopup.confirm({
          title: 'Logout',
          template: 'Apakah Anda yakin ingin keluar?'
        });

        confirmPopup.then(function (res) {
          if (res) {
            $ionicLoading.show({
              animation: 'fade-in',
              showBackdrop: true
            });

            $ionicViewSwitcher.nextDirection('back');

            $timeout(function () {
              $localstorage.remove('userLogin');
              $window.localStorage.removeItem('isUserLogin');
              $window.localStorage.removeItem('isGuestLogin');
              $rootScope.CONFIG.isLogin = false;
            }, 0)

            $timeout(function () {

              //remove user login
              $state.go('gate');
              $ionicLoading.hide();
            }, 10);

          }
        });
      }

      $rootScope.shareSheet = function (message, subject, file, link) {
        console.log('run share sheet');
        // $timeout(function () {
        //   console.log(link);
        // }, 0)
        // return false;
        $cordovaSocialSharing
          .share(message, subject, file, link) // Share via native share sheet
          .then(function (result) {
            console.log(result);
            // Success!
          }, function (err) {
            console.log(err);
            // An error occured. Show a message to the user
          });
      }

      // ------ disable back button on landing pages ------
      $ionicPlatform.registerBackButtonAction(function (event) {
        if ($location.path() === "/gallery/detail" ||
          $location.path() === "/profile/edit"
        ) {
          console.log('disable');
          event.preventDefault();
        } else {
          console.log('normal');
          $ionicHistory.goBack();
        }
      }, 100);

      //event for disabled scroll while swipe
      $window.localStorage["Scroll"] = JSON.stringify(true);
      angular.element($window).bind('touchmove', function (e) {

        var scroll = JSON.parse($window.localStorage["Scroll"]);

        if (!scroll) {
          e.preventDefault();
        }

      });

      $scope.disableVerticalScrolling = function () {
        var scrollPos = $ionicScrollDelegate.getScrollPosition().top;
        $ionicScrollDelegate.scrollTo(0, scrollPos, false);
      }

      $scope.$on('$ionicView.leave', function (event) {
        $rootScope.state.current = $rootScope.state.prev;
      });

      $scope.$on('$ionicView.enter', function (event) {
        $rootScope.state.prev = $state.current.name;
      });
      // ------------------------------------------------------------------- FINISH


      $scope.$on('$ionicView.beforeEnter', function (event) {
        $timeout(function () {
          $rootScope.auto_logout = function () {
            //set expired true
            $rootScope.expired = true;
            var alertPopup = $ionicPopup.alert({
              title: $filter('translate')('TOKEN_EXPIRED'),
              template: $filter('translate')('RE_LOGIN'),
              buttons: [{
                text: $filter('translate')('BUTTON_OK')
              }]
            });

            alertPopup.then(function (res) {
              //set expired false
              $rootScope.expired = false;
              $rootScope.hideTabs = false;
              $scope.user.logout();

              if (!ionic.Platform.isWebView()) {
                //window.open('', '_self').close();
              }
            });
          };


          // event for rate & popup agent
          if ($rootScope.userLogin !== undefined) {

          }
        }, 0);
      });

      // $ionicPlatform.registerBackButtonAction(function (event) {
      //   if ($ionicHistory.backView() === null) { // no more previous screen in the history stack, so "back" would exit
      //     $ionicPopup.confirm({
      //       title: 'Please confirm',
      //       template: 'Are you sure you want to exit the app?'
      //     }).then(function (res) {
      //       if (res) {
      //         ionic.Platform.exitApp();
      //       }
      //     })
      //   } else {
      //     $ionicHistory.goBack();
      //   }
      // }, 100); // 100 = previous view
    }
  ])

  .controller('otherCtrl', ['$scope', '$stateParams', '$timeout', '$ionicHistory', '$ionicNavBarDelegate',
    function ($scope, $stateParams, $timeout, $ionicHistory, $ionicNavBarDelegate) {
      $ionicNavBarDelegate.showBackButton(true);

      /*$ionicHistory.nextViewOptions({
          disableBack: false
        });*/

      $scope.showBackdrop = true;


      $scope.$on('$ionicView.beforeEnter', function (event) {
        $('iframe').on('load', function () {
          $timeout(function () {
            //$scope.showBackdrop = false;

            //remove backdrop
            $timeout(function () {
              $scope.showBackdrop = 'hide'
            }, 300);
          }, 0)
        });
      });
    }
  ])

// global regex for validation
var numReg = /^[0-9]+$/;
var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

app.directive('blankDirective', [function () {

}]);

app.directive('wmBlock', function ($parse) {
  return {
    scope: {
      wmBlockLength: '='
    },
    link: function (scope, elm, attrs) {

      elm.bind('keypress', function (e) {

        if (elm[0].value.length > scope.wmBlockLength) {
          e.preventDefault();
          return false;
        }
      });
    }
  }
});

app.directive('hideTabs', function ($rootScope, $timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attributes) {
      scope.$on('$ionicView.beforeEnter', function () {
        scope.$watch(attributes.hideTabs, function (value) {
          $timeout(function () {
            $rootScope.hideTabs = value;
          }, 0);
        });
      });
      /*scope.$on('$ionicView.beforeEnter', function() {
          scope.$watch(attributes.hideTabs, function(value) {
              $rootScope.hideTabs = value;

              scope.$on('$ionicView.beforeLeave', function() {
                  if (value == false) {
                      $rootScope.hideTabs = false;
                  }
              });
          });

      });*/
    }
  };
});

app.directive('elasticHeader', function ($ionicScrollDelegate) {
  return {
    restrict: 'A',
    link: function (scope, scroller, attr) {
      var scrollerHandle = $ionicScrollDelegate.$getByHandle(attr.delegateHandle);
      var header = document.getElementById(attr.elasticHeader);
      var headerHeight = header.clientHeight;
      var translateAmt, scaleAmt, scrollTop, lastScrollTop;
      var ticking = false;


      // Set transform origin to top:
      header.style[ionic.CSS.TRANSFORM + 'Origin'] = 'center bottom';

      // Update header height on resize:
      window.addEventListener('resize', function () {
        console.log('resize');
        headerHeight = header.clientHeight;
      }, false);

      scroller[0].addEventListener('scroll', requestTick);

      function requestTick() {
        if (!ticking) {
          ionic.requestAnimationFrame(updateElasticHeader);
        }
        ticking = true;
      }

      function updateElasticHeader() {
        scrollTop = scrollerHandle.getScrollPosition().top;

        if (scrollTop >= 0) {
          // Scrolling up. Header should shrink:
          translateAmt = scrollTop / 2;
          scaleAmt = 1;
        } else {
          // Scrolling down. Header should expand:
          translateAmt = 0;
          scaleAmt = -scrollTop / headerHeight + 1;
        }

        // Update header with new position/size:
        header.style[ionic.CSS.TRANSFORM] = 'translate3d(0,' + translateAmt + 'px,0) scale(' + scaleAmt + ',' + scaleAmt + ')';

        ticking = false;
      }
    }
  }
});

app.directive('autoFocus', function ($timeout) {
  return {
    //restrict: 'AC',
    link: function (_scope, _element) {
      $timeout(function () {
        console.log('auto focus');
        _element[0].focus();
      }, 0);
    }
  };
});

app.directive('focusMe', function ($timeout, $parse) {
  return {
    scope: {
      trigger: '@focusMe'
    },
    link: function (scope, element) {
      scope.$watch('trigger', function (value) {
        if (value === "true") {
          $timeout(function () {
            //element[0].focus();
          }, 150);
        }
      });
    }
  };
});

/*app.directive('focusMe', function($timeout) {
  return {
    link: function(scope, element, attrs) {
      $timeout(function() {
        console.log('test');
        element[0].focus();
        if(typeof(cordova) != "undefined") {
            cordova.plugins.Keyboard.show();
        }
      }, 150);
    }
  };
});*/

app.directive('relativeTime', function ($timeout) {

  function update(scope, element) {
    var _date = new Date(scope.actualTime.replace(/-/g, "/") + ' UTC');

    //console.log(getRelativeDateTimeString(_date));

    element.text(getRelativeDateTimeString(_date));
    $timeout(function () {
      update(scope, element);
    }, 1000);
  }

  return {
    scope: {
      actualTime: '=relativeTime'
    },
    link: function (scope, element) {
      update(scope, element);
    }
  };
});

function getRelativeDateTimeString(dt) {
  if (!dt) return "undefined ago";

  var delta = parseInt(((new Date().getTime()) - dt.getTime()) / 1000),
    minutes = 60,
    hours = 60 * minutes,
    days = hours * 24,
    time = '';

  if (delta < (2 * minutes)) {
    time = "1 Min";
  } else {
    //for hours
    if (delta >= hours && delta < days) {
      time = Math.floor(delta / hours);
      time = (time == 1) ? time + " Hour" : time + " Hours";
    }

    //for days
    else if (delta >= days) {
      time = Math.floor(delta / days);
      time = (time == 1) ? time + " Day" : time + " Days";
    }

    //for minutes
    else {
      time = Math.floor(delta / minutes) + " Mins";
    }
  }

  return time;
}

app.directive('timeStatus', function ($timeout) {

  function update(scope, element) {
    var _date = new Date(scope.actualTime.replace(/-/g, "/") + ' UTC'),
      _class = $(element).attr('class').split(' ')[2],
      _minutes,
      _status;

    //element.text(getRelativeDateTimeString(_date));
    $timeout(function () {
      update(scope, element);
    }, 1000);

    var delta = parseInt(((new Date().getTime()) - _date.getTime()) / 1000);

    //get time
    if (delta < 2 * 60) {
      _minutes = 1;
    } else {
      _minutes = Math.floor(delta / 60);
    }

    //get new status
    if (_minutes > 17) {
      _status = 'main__red'
    } else if (_minutes > 8) {
      _status = 'main__yellow'
    } else {
      _status = 'main__green'
    }

    //replace old status
    if (_class == undefined) {
      $(element).addClass(_status);
    } else {
      if (_class != _status) {
        $(element).removeClass(_class).addClass(_status);
      }
    }
  }

  return {
    scope: {
      actualTime: '=timeStatus'
    },
    link: function (scope, element) {
      update(scope, element);
    }
  };
});

app.directive('parseStyle', function ($interpolate) {
  return function (scope, elem) {
    var exp = $interpolate(elem.html()),
      watchFunc = function () {
        return exp(scope);
      };

    scope.$watch(watchFunc, function (html) {
      elem.html(html);
    });
  };
});

app.directive('checkImageBg', function ($http) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      attrs.$observe('ngSrc', function (ngSrc) {
        $http.get(ngSrc).success(function () {
          console.log('image exist');
        }).error(function () {
          console.log('image not exist');
          element.attr('src', 'https://leafii.com/images/defaultProfilePic.png'); // set default image
        });
      });
    }
  };
});

app.directive('file', function () {
  return {
    scope: {
      file: '='
    },
    link: function (scope, el, attrs) {
      el.bind('change', function (event) {
        var file = event.target.files[0];
        scope.file = file ? file : undefined;
        scope.$apply();
      });
    }
  };
});

app.directive('customOnChange', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var onChangeFunc = scope.$eval(attrs.customOnChange);
      element.bind('change', function (event) {
        var file = event.target.files;
        onChangeFunc(file);
      });

      element.bind('click', function () {
        element.val('');
      });
    }
  };
});

app.directive('activeTab', function ($timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attributes) {
      scope.$on('$ionicView.beforeEnter', function () {
        if (attributes.active == attributes.activeTab) {
          $timeout(function () {
            element.addClass('active');
          }, 0);
        } else {
          $timeout(function () {
            element.removeClass('active');
          }, 0);
        }
      });
    }
  };
});

app.directive('myRepeatDirective', function ($timeout) {
    return function (scope, element, attrs) {
      if (scope.$last) {
        $timeout(function () {
          scope.content.loaded = false;
        }, 800);
      }
    };
  })
  .directive('myMainDirective', function () {
    return function (scope, element, attrs) {
      //angular.element(element).css('border','5px solid red');
    };
  });

app.directive('dateFormat', function () {
  return {
    require: 'ngModel',
    link: function (scope, element, attr, ngModelCtrl) {
      //Angular 1.3 insert a formater that force to set model to date object, otherwise throw exception.
      //Reset default angular formatters/parsers
      ngModelCtrl.$formatters.length = 0;
      ngModelCtrl.$parsers.length = 0;
    }
  };
});


app.directive('ngEnter', function () {
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if (event.which === 13) {
        scope.$apply(function () {
          scope.$eval(attrs.ngEnter);
        });

        event.preventDefault();
      }
    });
  };
});


angular.module('dibari.angular-ellipsis', []).directive('ellipsis', ['$timeout', '$window', '$sce', function ($timeout, $window, $sce) {

  var AsyncDigest = function (delay) {
    var timeout = null;
    var queue = [];

    this.remove = function (fn) {
      if (queue.indexOf(fn) !== -1) {
        queue.splice(queue.indexOf(fn), 1);
        if (queue.length === 0) {
          $timeout.cancel(timeout);
          timeout = null;
        }
      }
    };
    this.add = function (fn) {
      if (queue.indexOf(fn) === -1) {
        queue.push(fn);
      }
      if (!timeout) {
        timeout = $timeout(function () {
          var copy = queue.slice();
          timeout = null;
          // reset scheduled array first in case one of the functions throws an error
          queue.length = 0;
          copy.forEach(function (fn) {
            fn();
          });
        }, delay);
      }
    };
  };

  var asyncDigestImmediate = new AsyncDigest(0);
  var asyncDigestDebounced = new AsyncDigest(75);

  return {
    restrict: 'A',
    scope: {
      ngShow: '=',
      ngBind: '=',
      ngBindHtml: '=',
      ellipsisAppend: '@',
      ellipsisAppendClick: '&',
      ellipsisSymbol: '@',
      ellipsisSeparator: '@',
      useParent: "@",
      ellipsisSeparatorReg: '=',
      ellipsisFallbackFontSize: '@'
    },
    compile: function (elem, attr, linker) {

      return function (scope, element, attributes) {
        /* Window Resize Variables */
        attributes.lastWindowResizeTime = 0;
        attributes.lastWindowResizeWidth = 0;
        attributes.lastWindowResizeHeight = 0;
        attributes.lastWindowTimeoutEvent = null;
        /* State Variables */
        attributes.isTruncated = false;

        function _isDefined(value) {
          return typeof (value) !== 'undefined';
        }

        function getParentHeight(element) {
          var heightOfChildren = 0;
          angular.forEach(element.parent().children(), function (child) {
            if (child != element[0]) {
              heightOfChildren += child.clientHeight;
            }
          });
          return element.parent()[0].clientHeight - heightOfChildren;
        }

        function buildEllipsis() {
          var binding = scope.ngBind || scope.ngBindHtml;
          var isTrustedHTML = false;
          if ($sce.isEnabled() && angular.isObject(binding) && $sce.getTrustedHtml(binding)) {
            isTrustedHTML = true;
            binding = $sce.getTrustedHtml(binding);
          }
          if (binding) {
            var isHtml = (!(!!scope.ngBind) && !!(scope.ngBindHtml));
            var i = 0,
              ellipsisSymbol = (typeof (attributes.ellipsisSymbol) !== 'undefined') ? attributes.ellipsisSymbol : '&hellip;',
              ellipsisSeparator = (typeof (scope.ellipsisSeparator) !== 'undefined') ? attributes.ellipsisSeparator : ' ',
              ellipsisSeparatorReg = (typeof (scope.ellipsisSeparatorReg) !== 'undefined') ? scope.ellipsisSeparatorReg : false,
              appendString = (typeof (scope.ellipsisAppend) !== 'undefined' && scope.ellipsisAppend !== '') ? ellipsisSymbol + "<span class='angular-ellipsis-append'>" + scope.ellipsisAppend + '</span>' : ellipsisSymbol,
              bindArray = ellipsisSeparatorReg ? binding.match(ellipsisSeparatorReg) : binding.split(ellipsisSeparator);

            attributes.isTruncated = false;
            if (isHtml) {
              element.html(binding);
            } else {
              element.text(binding);
            }

            if (_isDefined(attributes.ellipsisFallbackFontSize) && isOverflowed(element)) {
              element.css('font-size', attributes.ellipsisFallbackFontSize);
            }

            // If text has overflow
            if (isOverflowed(element, scope.useParent)) {
              var bindArrayStartingLength = bindArray.length,
                initialMaxHeight = scope.useParent ? getParentHeight(element) : element[0].clientHeight;

              if (isHtml) {
                element.html(binding + appendString);
              } else {
                element.text(binding).html(element.html() + appendString);
              }
              //Set data-overflow on element for targeting
              element.attr('data-overflowed', 'true');

              // Set complete text and remove one word at a time, until there is no overflow
              for (; i < bindArrayStartingLength; i++) {
                var current = bindArray.pop();

                //if the last string still overflowed, then truncate the last string
                if (bindArray.length === 0) {
                  bindArray[0] = current.substring(0, Math.min(current.length, 5));
                }

                if (isHtml) {
                  element.html(bindArray.join(ellipsisSeparator) + appendString);
                } else {
                  element.text(bindArray.join(ellipsisSeparator)).html(element.html() + appendString);
                }

                if ((scope.useParent ? element.parent()[0] : element[0]).scrollHeight < initialMaxHeight || isOverflowed(element, scope.useParent) === false) {
                  attributes.isTruncated = true;
                  break;
                }
              }

              // If append string was passed and append click function included
              if (ellipsisSymbol != appendString && typeof (scope.ellipsisAppendClick) !== 'undefined' && scope.ellipsisAppendClick !== '') {
                element.find('span.angular-ellipsis-append').bind("click", function (e) {
                  scope.$apply(function () {
                    scope.ellipsisAppendClick.call(scope, {
                      event: e
                    });
                  });
                });
              }

              if (!isTrustedHTML && $sce.isEnabled()) {
                $sce.trustAsHtml(binding);
              }
            } else {
              element.attr('data-overflowed', 'false');
            }
          }
        }

        /**
         *	Test if element has overflow of text beyond height or max-height
         *
         *	@param element (DOM object)
         *
         *	@return bool
         *
         */
        function isOverflowed(thisElement, useParent) {
          thisElement = useParent ? thisElement.parent() : thisElement;
          return thisElement[0].scrollHeight > thisElement[0].clientHeight;
        }

        /**
         *	Watchers
         */

        /**
         *	Execute ellipsis truncate on ngShow update
         */
        scope.$watch('ngShow', function () {
          asyncDigestImmediate.add(buildEllipsis);
        });

        /**
         *	Execute ellipsis truncate on ngBind update
         */
        scope.$watch('ngBind', function () {
          asyncDigestImmediate.add(buildEllipsis);
        });

        /**
         *	Execute ellipsis truncate on ngBindHtml update
         */
        scope.$watch('ngBindHtml', function () {
          asyncDigestImmediate.add(buildEllipsis);
        });

        /**
         *	Execute ellipsis truncate on ngBind update
         */
        scope.$watch('ellipsisAppend', function () {
          buildEllipsis();
        });

        /**
         *	Execute ellipsis truncate when element becomes visible
         */
        scope.$watch(function () {
          return element[0].offsetWidth != 0 && element[0].offsetHeight != 0
        }, function () {
          asyncDigestDebounced.add(buildEllipsis);
        });

        function checkWindowForRebuild() {
          if (attributes.lastWindowResizeWidth != window.innerWidth || attributes.lastWindowResizeHeight != window.innerHeight) {
            buildEllipsis();
          }

          attributes.lastWindowResizeWidth = window.innerWidth;
          attributes.lastWindowResizeHeight = window.innerHeight;
        }

        var unbindRefreshEllipsis = scope.$on('dibari:refresh-ellipsis', function () {
          asyncDigestImmediate.add(buildEllipsis);
        });
        /**
         *	When window width or height changes - re-init truncation
         */

        function onResize() {
          asyncDigestDebounced.add(checkWindowForRebuild);
        }

        var $win = angular.element($window);
        $win.bind('resize', onResize);

        /**
         * Clean up after ourselves
         */
        scope.$on('$destroy', function () {
          $win.unbind('resize', onResize);
          asyncDigestImmediate.remove(buildEllipsis);
          asyncDigestDebounced.remove(checkWindowForRebuild);
          if (unbindRefreshEllipsis) {
            unbindRefreshEllipsis();
            unbindRefreshEllipsis = null;
          }
        });


      };
    }
  };
}]);

app.filter('requestStatus', function ($rootScope) {
    return function (text) {
      text = parseInt(text);

      if (text > 17) {
        return 'main__red'
      } else if (text > 8) {
        return 'main__yellow'
      } else {
        return 'main__green'
      }
      //return text ? String(text).replace(/<[^>]+>/gm, '') : '';
    };
  })

  .filter('nameFilter', [function () {
    return function (data, keyword) {
      var result = {};

      if (data == undefined) return false;

      angular.forEach(data, function (value, key) {
        var _name = value.employee.first_name + ' ' + value.employee.last_name;

        if (keyword == undefined) {
          result[key] = value;
        } else {
          if (_name.toLowerCase().indexOf(keyword.toLowerCase()) >= 0) {
            result[key] = value;
          }
        }
      });

      return result;
    };
  }])

  .filter('requestCopyStatus', function ($rootScope) {
    return function (text, data, status, specialist) {
      text = parseInt(text);

      if ((status != undefined) || (status != null)) {
        text = 7;
      }

      specialist_name = "";
      if (specialist != undefined || specialist != null) {
        specialist_name = specialist.first_name + ' ' + specialist.last_name;
      }

      //return data[text] + specialist_name;
      return data[text];
    };
  })

  .filter('requestCopyBadgeActivity', function ($rootScope) {
    return function (text, data, status) {
      text = parseInt(text);

      if ((status != undefined) || (status != null)) {
        text = 7;
      }

      return data[text];
    };
  })

  .filter('generateReqID', function () {
    return function (value) {
      if (value == undefined) return false;

      var fullID = '';
      for (j = 5; j > 0; j--) {
        if (j > value.toString().length) {
          fullID += '0';
        } else {
          fullID += value.toString();
          break;
        }
      }
      return fullID;
    };
  })

  .filter('decodeReqStatus', function () {
    return function (value) {
      var text;
      switch (value) {
        case '1':
          text = 'Looking for a mortgage specialist'
          break;
        case '2':
          text = 'Waiting for <mortgage_specialist_name>'
          break;
        case '3':
          text = 'Waiting for call'
          break;
      }
      return text;
    };
  })

  .filter('convertDate', function () {
    return function (value) {
      if (value == undefined) return false;

      var _monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        _newDate = new Date(value),
        _formattedDate = _newDate.getDate() + ' ' + _monthNames[_newDate.getMonth()] + ' ' + _newDate.getFullYear();

      return _formattedDate;
    }
  })

  .filter('timeLineIcon', function () {
    return function (value) {
      var text = "";

      if (value == undefined) return false;

      switch (value.request_status) {
        case '1':
          text = 'type-post';
          break;
        case '2':
          if (value.log_subtitle == 'request accepted') {
            text = 'type-accept';
          } else {
            text = 'type-assign';
          }
          break;
        case '3':
          text = 'type-call';
          break;
        case '4':
          text = 'type-post';
          break;
        case '5':
          text = 'type-post';
          break;
          // case '2':
          //     text = 'type-assign'
          //     break;

      }

      return text;
    };
  })

  .filter('timeLineText', function ($filter, $rootScope) {
    return function (value) {
      var text = "";

      if (value == undefined) return false;

      switch (value.request_status) {
        case '1':
          if ($rootScope.userLogin.is_agent == 1) {
            if (value.log_title == 'Created by') {
              text = $filter('translate')('LABEL_REQUEST_CREATED_BY');
            } else {
              text = $filter('translate')('LABEL_REQUEST_REJECTED_BY');
            }
          } else {
            if (value.log_title == 'Created by') {
              text = $filter('translate')('LABEL_LEAD_CREATED_BY');
            } else if (value.log_title == 'Request assign by manager to') {
              text = $filter('translate')('LABEL_ASSIGNED_BY_MANAGER');
            } else {
              text = $filter('translate')('LABEL_LEAD_REJECTED_BY');
            }
          }

          break;
        case '2':
          if ($rootScope.userLogin.is_agent == 1) {
            if (value.log_title == 'request accepted') {
              text = $filter('translate')('LABEL_REQUEST_ACCEPTED_BY');
            } else {
              text = $filter('translate')('LABEL_REQUEST_ASSIGNED');
            }
          } else {
            if (value.log_title == 'request accepted') {
              text = $filter('translate')('LABEL_LEAD_ACCEPTED_BY');
            } else if (value.log_title == 'Accepted by') {
              text = $filter('translate')('LABEL_REQUEST_ACCEPTED_BY');
            } else {
              text = $filter('translate')('LABEL_LEAD_ASSIGNED_TO');
            }
          }
          break;
        case '3':
          if (value.log_title != 'Rated Canceled by') {
            text = $filter('translate')('LABEL_CALLED_BY');
          } else {
            text = $filter('translate')('LABEL_RATE_CANCELED_BY');
          }
          break;
        case '4':
          if ($rootScope.userLogin.is_agent == 1) {
            text = $filter('translate')('LABEL_REQUEST_COMPLETED');
          } else {
            text = $filter('translate')('LABEL_LEAD_COMPLETED');
          }
          break;
        case '5':
          if ($rootScope.userLogin.is_agent == 1) {
            text = $filter('translate')('LABEL_REQUEST_CANCELED_BY');
          } else {
            text = $filter('translate')('LABEL_LEAD_CANCELED_BY');
          }
          break;

      }

      return text;
    };
  })

  .filter('timeLineData', function () {
    return function (value, type) {
      if (value == undefined) return false;

      var data = JSON.parse(value),
        text;

      switch (type) {
        case 'created':
          text = data.customer_name
          break;
      }

      return text;
    };
  })

  .filter('timeLineName', function () {
    return function (value, type) {
      var data = JSON.parse(value.data),
        text;

      switch (value.request_status) {
        case '3':
          if (value.log_title != 'Rated Canceled by') {
            text = data.employee.name;
          } else {
            text = value.log_subtitle;
          }
          break;
        default:
          text = value.log_subtitle;
      }

      return text;
    };
  })

  .filter('secondToTime', function () {
    return function (secs) {

      var hours = Math.floor((secs / 1000) / 3600),
        minutes = Math.floor((secs / 1000 / 60) % 60),
        seconds = Math.floor((secs / 1000) % 60),
        result = hours + "h : " + minutes + "m : " + seconds + "s";
      return result;

    };
  })

  .filter('timeStamp', function () {
    return function (text) {
      text = new Date(text).getTime();

      return text;
    }
  })

  .filter('incomingType', function () {
    return function (value) {
      var text;
      switch (value) {
        case 1:
          text = 'active'
          break;
        case 2:
          text = 'second'
          break;
        case 3:
          text = 'third'
          break;
        default:
          text = 'passive'
      }
      return text;
    };
  })

  .filter('catchImage', function () {
    return function (image) {
      if (image == null) {
        image = 'img/defaults/default-profile-bg.svg'
      }

      return image;
    };
  })

  .filter('currencyLabel', function () {
    return function (val) {
      if (val == undefined) return '';

      while (/(\d+)(\d{3})/.test(val.toString())) {
        val = val.toString().replace(/(\d+)(\d{3})/, '$1' + '.' + '$2');
      }
      var val = 'SGD ' + val;
      return val;
    };
  })

  .filter('capitalize', function () {
    return function (input) {
      return (!!input) ? input.split(' ').map(function (wrd) {
        return wrd.charAt(0).toUpperCase() + wrd.substr(1).toLowerCase();
      }).join(' ') : '';
    }
  })

  .filter('updatePhone', function ($rootScope) {
    return function (input) {
      if (input!==undefined) {
        if (input.charAt(0) == '0') {
          console.log('code : ' + $rootScope.config.country.selected.code + input.substring(1));
          return $rootScope.config.country.selected.code + input.substring(1);
        } else {
          return '+' + input;
        }
      }
    };
  })
  .filter('activeTab', function ($rootScope) {
    return function (data, input) {
      console.log(data, input);
      if (data == input) {
        return 'active';
      } else {
        return '';
      }
    }
  })
  .filter('assigmentText', function ($rootScope, $filter) {
    return function (data, type) {
      //console.log('data:', data);
      var _text = '-';

      if(data!=undefined) {
        switch (type) {
          case 'manager-request':
              if(data.is_specific==0 && data.assignment_status==1) {
                _text = $filter('translate')('LABEL_FIRST_ASSIGNMENT');
              }
              else if (data.is_specific==0 && data.assignment_status==2) {
                _text = $filter('translate')('LABEL_SECOND_ASSIGNMENT');
              }
              else if (data.is_specific==0 && data.assignment_status==3) {
                _text = $filter('translate')('LABEL_FINAL_ASSIGNMENT');
              }
              else if(data.is_specific==1) {

              }
              else {
                _text = $filter('translate')('ANY_BANKER');
              }
            break;
          case 'ms-accept':
              if(data.is_specific==0 && data.assignment_status==1) {
                _text = $filter('translate')('LABEL_FIRST_ASSIGNMENT');
              }
              else if (data.is_specific==0 && data.assignment_status==2) {
                _text = $filter('translate')('LABEL_SECOND_ASSIGNMENT');
              }
              else if (data.is_specific==0 && data.assignment_status==3) {
                _text = $filter('translate')('LABEL_FINAL_ASSIGNMENT');
              }
              else {
                _text = $filter('translate')('LABEL_YOUR_REQUEST_INSTRUCTION');
              }
            break;
        }
      }

      return _text;
    }
  });

app.config([
  '$stateProvider',
  '$urlRouterProvider',
  '$ionicConfigProvider',
  '$httpProvider',
  '$provide',

  function ($stateProvider, $urlRouterProvider, $ionicConfigProvider, $httpProvider, $translateProvider, $provide) {
    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js

    $ionicConfigProvider.views.maxCache(0);

    // note that you can also chain configs
    $ionicConfigProvider.backButton.text('');

    // Remove back button text completely
    $ionicConfigProvider.backButton.previousTitleText(false).text('');

    // Remove IOS Swipe Back
    $ionicConfigProvider.views.swipeBackEnabled(false);

    // Ionic Style IOS (Android + IOS)
    $ionicConfigProvider.views.transition('ios');
    $ionicConfigProvider.tabs.style('standard').position('bottom');
    $ionicConfigProvider.navBar.alignTitle('center').positionPrimaryButtons('left');

    //native scrolling
    if (!ionic.Platform.isIOS()) {
      console.log('use native scroll');
      $ionicConfigProvider.scrolling.jsScrolling(false);
    }

    $stateProvider
      //index
      .state('index', {
        url: '/',
        templateUrl: 'templates/index.html',
        controller: 'landingCtrl'
      })

      //gate
      .state('gate', {
        url: '/gate',
        cache: false,
        templateUrl: 'templates/gate/index.html',
        controller: 'gateCtrl',
      })

      //greeting
      .state('greeting', {
        url: '/greeting',
        cache: false,
        templateUrl: 'templates/greeting/index.html',
        controller: 'greetingCtrl',
      })

      //greeting category
      .state('greeting-category', {
        url: '/greeting-category',
        cache: false,
        templateUrl: 'templates/greeting/category.html',
        controller: 'greetingCtrl',
      })

      //greeting vide
      .state('greeting-video', {
        url: '/greeting-video',
        cache: false,
        templateUrl: 'templates/greeting/video.html',
        controller: 'greetingCtrl',
      })

      //login
      .state('login', {
        url: '/login',
        cache: false,
        templateUrl: 'templates/auth/login/index.html',
        controller: 'loginCtrl',
      })

      //register
      .state('register', {
        url: '/register',
        cache: false,
        templateUrl: 'templates/auth/register/index.html',
        controller: 'registerCtrl',
      })

      //forgot password
      .state('forgot', {
        url: '/forgot',
        templateUrl: 'templates/auth/forgot/index.html',
        controller: 'forgotPasswordCtrl',
      })

      //home
      .state('home', {
        url: '/home',
        abstract: true,
        cache: false,
        templateUrl: 'templates/home/index.html',
        controller: 'homeCtrl',
      })

      .state('home.index', {
        url: "/index",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/landing/index.html',
          }
        }
      })

      //home detail gallery
      .state('home.detailGallery', {
        url: "/index/gallery/:slug",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/gallery/detail/fromHome/index.html',
            controller: 'galleryDetailCtrl',
          }
        }
      })

      //home another user
      .state('home.anotherUser', {
        url: "/index/profile/:slug",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/gallery/profile/fromHome.html',
            controller: 'profileLainCtrl',
          }
        }
      })

      //home search
      .state('home.search', {
        url: "/index/search",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/search/index.html',
            controller: 'searchCtrl',
          }
        }
      })

      //route search detail
      .state('home.searchDetail', {
        url: "/index/search/:slug",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/gallery/detail/index.html',
            controller: 'galleryDetailCtrl',
          }
        }
      })

      .state('home.indexProgram', {
        url: "/index/:slug",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/landing/program/index.html',
            controller: 'programCtrl',
          }
        }
      })

      .state('home.indexProgramDetail', {
        url: "/index/program/:slug",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/landing/program/detail/index.html',
            controller: 'programDetailCtrl',
          }
        }
      })

      .state('home.indexArticleDetail', {
        url: "/index/article/:body/:title",
        views: {
          'home-tab': {
            templateUrl: 'templates/home/landing/article/index.html',
            controller: 'articleDetailCtrl',
          }
        }
      })

      // gallery
      .state('home.gallery', {
        url: '/gallery',
        views: {
          'gallery-tab': {
            templateUrl: 'templates/home/gallery/index.html',
            controller: 'galleryCtrl',
          }
        }
      })

      .state('home.galleryDetail', {
        url: '/gallery/:slug',
        views: {
          'gallery-tab': {
            templateUrl: 'templates/home/gallery/detail/index.html',
            controller: 'galleryDetailCtrl',
          }
        }
      })

      .state('home.galleryProfile', {
        url: '/gallery/profile/:slug',
        views: {
          'gallery-tab': {
            templateUrl: 'templates/home/gallery/profile/index.html',
            controller: 'profileLainCtrl',
          }
        }
      })

      // notification
      .state('home.activity', {
        url: "/activity",
        views: {
          'activity-tab': {
            templateUrl: 'templates/home/activity/index.html',
            controller: 'activityCtrl',
          }
        }
      })

      //profile
      .state('home.profile', {
        url: "/profile",
        views: {
          'profile-tab': {
            templateUrl: 'templates/home/profile/index.html',
            controller: 'profileCtrl',
          }
        }
      })

      //profile edit
      .state('home.profileEdit', {
        url: "/profile/edit",
        views: {
          'profile-tab': {
            templateUrl: 'templates/home/profile/edit.html',
            controller: 'profileCtrl',
          }
        }
      })

      //tnc page
      .state('home.tnc', {
        url: '/tnc',
        views: {
          'other-tab': {
            templateUrl: 'templates/home/landing/tnc.html',
            controller: 'tncCtrl',
          }
        }
      });

    $urlRouterProvider.otherwise('/home/index');

    //respon
    // $httpProvider.interceptors.push('responseObserver');
    // $httpProvider.interceptors.push('tokenExpiredObserver');

    // //exception
    // $provide.decorator("$exceptionHandler", ['$delegate', function ($delegate) {
    //   return function (exception, cause) {
    //     $delegate(exception, cause);

    //     // Decorating standard exception handling behaviour by sending exception to crashlytics plugin
    //     var message = exception.toString();
    //     // Here, I rely on stacktrace-js (http://www.stacktracejs.com/) to format exception stacktraces before
    //     // sending it to the native bridge
    //     var stacktrace = exception.stack.toLocaleString();
    //     if (navigator.crashlytics != undefined) {
    //       navigator.crashlytics.logException("ERROR: " + message + ", stacktrace: " + stacktrace);
    //     }
    //   };
    // }]);
  }
])

app.factory('globalFactory', [function () {

  }])

  .service('globalService', ['$rootScope', '$state', '$stateParams', '$timeout', '$http', '$q', '$cordovaCamera', '$cordovaImagePicker', '$jrCrop', '$ionicLoading', '$ionicPopup', function ($rootScope, $state, $stateParams, $timeout, $http, $q, $cordovaCamera, $cordovaImagePicker, $jrCrop, $ionicLoading, $ionicPopup) {
    var _this = this;
    // validate
    this.validate = function (selector, timer, topSpace) {

      var _numReg = /^[0-9]+$/,
        _emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

      $('.err-msg').hide().removeClass('is-error');

      // Check input required
      $('.vld-required').each(function () {

        var $this = $(this),
          $errorMsg = $this.next('.err-msg'),
          _textMsg = $errorMsg.attr('data-errrequired');

        if ($(this).val() == '' || $(this).val() == " ") {

          //check recaptcha
          if ($('#recaptcha').length) {
            if ($this.attr('id') == 'recaptcha') {
              if (grecaptcha.getResponse() != '') {
                return false;
              }
            }
          }

          if ($this.hasClass('vld-predifened')) {
            $errorMsg = $this.parent().next('.err-msg');
            _textMsg = $errorMsg.attr('data-errrequired');
          }

          // Show Mesaage and Form is Error
          $errorMsg.text(_textMsg).show().addClass('is-error');
          // Scroll to input error index 0
          $("html, body").animate({
            scrollTop: $('.is-error').eq(0).offset().top - topSpace
          }, timer);
        }

      });

      // Check input number
      $('.vld-number').each(function () {
        var $this = $(this),
          $errorMsg = $this.next('.err-msg'),
          _textMsg = $errorMsg.attr('data-errnumber');

        if (!_numReg.test($(this).val()) && $(this).val() != "" && $(this).val() != " ") {
          if ($this.hasClass('vld-predifened')) {
            $errorMsg = $this.parent().next('.err-msg');
            _textMsg = $errorMsg.attr('data-errrequired');
          }

          // Show Mesaage and Form is Error
          $errorMsg.text(_textMsg).show().addClass('is-error');
          // Scroll to input error index 0
          $("html, body").animate({
            scrollTop: $('.is-error').eq(0).offset().top - topSpace
          }, timer);
        }

      });

      // Check input email
      $('.vld-email').each(function () {
        var $this = $(this),
          $errorMsg = $this.next('.err-msg'),
          _textMsg = $errorMsg.attr('data-notvalid');

        if (!_emailReg.test($(this).val()) && $(this).val() != "" && $(this).val() != " ") {
          // Show Mesaage and Form is Error
          $errorMsg.text(_textMsg).show().addClass('is-error');
          // Scroll to input error index 0
          $("html, body").animate({
            scrollTop: $('.is-error').eq(0).offset().top - topSpace
          }, timer);
        }

      });

      // IF not Error
      if ($('.is-error').length == 0) {
        selector.addClass('form-is-valid');
      }

    }

    //password
    this.password = {
      toggle: function (selector) {
        var $this = selector,
          $parent = $this.parents('.input-field__password'),
          _status = $this.attr('data-toggle'),
          _icon;

        switch (_status) {
          case 'show':
            $parent.find('input').attr('type', 'password');
            $this.attr('data-toggle', 'hide');
            _icon = "visibility";
            if ($this.hasClass('linked')) {
              $parent.siblings('.input-field__password').find('input').attr('type', 'password');
            }
            break;
          case 'hide':
            $parent.find('input').attr('type', 'text');
            $this.attr('data-toggle', 'show');
            _icon = "visibility_off";
            if ($this.hasClass('linked')) {
              $parent.siblings('.input-field__password').find('input').attr('type', 'text');
            }
            break;
        }
        $this.find('i').html(_icon);

        return _icon;

      },
      show: function (selector, type) {
        $this = selector,
          $parent = $this.parents('.input-field__password');

        switch (type) {
          case 'show':
            $parent.find('input').attr('type', 'text');
            break;
          case 'hide':
            $parent.find('input').attr('type', 'password');
            break;
        }
      },
      edit: {
        validate: function (password) {
          var _result;

          if (password.new == password.retype) {
            _result = {
              status: 1,
              messages: 'success'
            }
          } else {
            _result = {
              status: 0,
              messages: 'New password not match'
            }
          }

          return _result;
        },
        submit: function (password) {
          var _type = $rootScope.userLogin.is_agent == 1 ? 'agent' : 'employee',
            _data = $.param({
              password_old: password.current,
              password_new: password.new,
              password_verify: password.retype
            }),
            _config = {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
                'Accept-Language': $rootScope.config.country.selected.language.code,
                'token_kadaluarsa': _type + '&' + $rootScope.userLogin.api_token
              }
            },
            promise = $http.post(app.api.url + app.api.employee.password, _data, _config),
            deferObject = deferObject || $q.defer();

          promise.then(
            // OnSuccess function
            function (answer) {
              deferObject.resolve(answer.data);
            },
            // OnFailure function
            function (reason) {
              deferObject.resolve(this.data);
            }
          );
          return deferObject.promise;
        },
      }

    }

    this.more = {
      profile: {
        edit: {
          validate: function (profile) {

          },
          submit: function (profile) {
            var _type = $rootScope.userLogin.is_agent == 1 ? 'agent' : 'employee',
              _data = {
                first_name: profile.first_name,
                last_name: profile.last_name,
                primary_phone: $rootScope.config.country.selected.phonePrefix + profile.phone,
                email: profile.email,
              },
              _config = {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
                  'token_kadaluarsa': _type + '&' + $rootScope.userLogin.api_token
                }
              },
              _api = _type == 'agent' ? app.api.agent.update : app.api.employee.update,
              //call api
              promise,
              deferObject = deferObject || $q.defer();

            if (_type == 'agent') {
              _data.agencies_id = profile.agencies_id;
            }

            console.log(profile);

            //_data = $.param({_data});
            promise = $http.post(app.api.url + _api, _data, _config);

            promise.then(
              // OnSuccess function
              function (answer) {
                deferObject.resolve(answer.data);
                console.log(answer);
              },
              // OnFailure function
              function (error) {
                deferObject.reject(error);
              }
            );
            return deferObject.promise;
          }
        },
        available: {
          status: function () {
            var _data = $.param({
                is_available: $rootScope.userLogin.is_available == 1 ? 0 : 1,
              }),
              _config = {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
                  'token_kadaluarsa': 'employee&' + $rootScope.userLogin.api_token
                }
              },
              _api = app.api.employee.available,
              //call api
              promise = $http.post(app.api.url + _api, _data, _config),
              deferObject = deferObject || $q.defer();

            promise.then(
              // OnSuccess function
              function (answer) {
                deferObject.resolve(answer.data);
              },
              // OnFailure function
              function (error) {
                deferObject.reject(error);
              }
            );
            return deferObject.promise;
          }
        },
        photo: {
          submit: function (image) {
            console.log('upload image');
            $ionicLoading.show({
              template: '<ion-spinner icon="ios" class="white"></ion-spinner>',
              hideOnStateChange: true,
            });

            var _image = _this.camera.b64toBlob(image, 'image/jpeg'),
              _type = $rootScope.userLogin.is_agent == 1 ? 'agent' : 'employee',
              _data = new FormData(),
              _config = {
                headers: {
                  //'Content-Type': 'multipart/form-data',
                  //'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
                  'token_kadaluarsa': _type + '&' + $rootScope.userLogin.api_token
                }
              },
              _api = _type == 'agent' ? app.api.agent.photo.update : app.api.employee.photo.update,
              deferObject = deferObject || $q.defer(),
              promise;

            _data.append('user_image', _image);
            if ($rootScope.userLogin.is_agent == 1) {
              _data.append('agent_id', $rootScope.userLogin.id);
            } else {
              _data.append('employee_id', $rootScope.userLogin.id);
            }

            console.log(_data);

            //call api
            promise = $http.post(app.api.url + _api, _data, _config);

            $http({
              url: app.api.url + _api,
              method: 'post',
              headers: {
                'Content-Type': undefined,
                'token_kadaluarsa': _type + '&' + $rootScope.userLogin.api_token
              },
              data: _data
            }).then(
              function (answer) {
                console.log('success');
                console.log(answer);
                if (answer.data.status == 1) {
                  //updata file image
                  console.log('succes');
                  $rootScope.userLogin.image_url = $rootScope.uploadImage;

                  //update to localstorage userLogin
                  window.localStorage.setItem("userLogin", JSON.stringify($rootScope.userLogin));
                } else {
                  console.log('failed');
                  // An alert dialog
                  var alertPopup = $ionicPopup.alert({
                    title: 'Failed',
                    template: answer.data.messages[0]
                  });
                  alertPopup.then(function (res) {

                  });
                }
                $ionicLoading.hide();
              },
              function (error) {
                console.log('error');
                console.log(error);
                $ionicLoading.hide();

                var alertPopup = $ionicPopup.alert({
                  title: 'Failed',
                  template: '<p class="center">Upload Image Failed!!!.</p>'
                });
                alertPopup.then(function (res) {

                });
              }
            );

            /*promise.then(
                // OnSuccess function
                function(answer){
                    deferObject.resolve(answer.data);
                    console.log(answer);
                    if(answer.status==1) {
                        //updata file image
                        console.log('succes');
                        $rootScope. userLogin.image_url = $rootScope.uploadImage;
                    }
                    else {
                        console.log('failed');
                        // An alert dialog
                        var alertPopup = $ionicPopup.alert({
                            title: 'Failed',
                            template: answer.data.messages[0]
                        });
                        alertPopup.then(function(res) {

                        });
                    }
                    $ionicLoading.hide();
                },
                // OnFailure function
                function(error){
                    deferObject.resolve(error);
                    console.log(error);
                    $ionicLoading.hide();

                    var alertPopup = $ionicPopup.alert({
                        title: 'Failed',
                        template: '<p class="center">Upload Image Failed!!!.</p>'
                    });
                    alertPopup.then(function(res) {

                    });
                }
            );
            return deferObject.promise;*/
          }
        }
      },
      contact: {
        submit: function (contact) {
          var _data = $.param({
              title: contact.title,
              body: contact.body,
            }),
            _config = {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
                'Accept-Language': $rootScope.config.country.selected.language.code,
                'token_kadaluarsa': 'agent&' + $rootScope.userLogin.api_token
              }
            },
            _api = app.api.agent.contact,
            //call api
            promise = $http.post(app.api.url + _api, _data, _config),
            deferObject = deferObject || $q.defer();

          promise.then(
            // OnSuccess function
            function (answer) {
              deferObject.resolve(answer.data);
            },
            // OnFailure function
            function (reason) {
              deferObject.resolve(reason);
            }
          );
          return deferObject.promise;
        }
      },
      commissions: {
        list: function () {
          var _config = {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
                'Accept-Language': $rootScope.config.country.selected.language.code,
                'token_kadaluarsa': 'agent&' + $rootScope.userLogin.api_token
              }
            },
            _api = app.api.agent.commissions.list,
            //call api
            promise = $http.get(app.api.url + _api + $rootScope.userLogin.id + '/type/detail', _config),
            deferObject = deferObject || $q.defer();

          promise.then(
            // OnSuccess function
            function (answer) {
              deferObject.resolve(answer.data);
            },
            // OnFailure function
            function (reason) {
              deferObject.resolve(reason);
            }
          );
          return deferObject.promise;
        },
        detail: function () {
          var _config = {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
                'Accept-Language': $rootScope.config.country.selected.language.code,
                'token_kadaluarsa': 'agent&' + $rootScope.userLogin.api_token
              }
            },
            _api = app.api.agent.commissions.list,
            //call api
            promise = $http.get(app.api.url + _api + $rootScope.userLogin.id, _config),
            deferObject = deferObject || $q.defer();

          promise.then(
            // OnSuccess function
            function (answer) {
              deferObject.resolve(answer.data);
            },
            // OnFailure function
            function (reason) {
              deferObject.resolve(reason);
            }
          );
          return deferObject.promise;
        }
      }
    }

    //camera
    this.camera = {
      takePicture: function (state) {
        console.log('takePicture');

        var options = {
          quality: 100,
          destinationType: Camera.DestinationType.DATA_URL,
          sourceType: Camera.PictureSourceType.CAMERA,
          allowEdit: true,
          encodingType: Camera.EncodingType.JPEG,
          cameraDirection: 1,
          targetWidth: 600,
          targetHeight: 600,
          popoverOptions: CameraPopoverOptions,
          saveToPhotoAlbum: false,
          correctOrientation: false
        };

        $cordovaCamera.getPicture(options).then(function (imageData) {
          console.log('get image');
          //set file data
          imagePictURI = 'data:image/jpeg;base64,' + imageData;

          $jrCrop.crop({
            url: imagePictURI,
            width: screen.width - 40,
            height: screen.width - 40,
            circle: true,
            title: 'Move and Scale'
          }).then(function (canvas) {
            //set file data
            $rootScope.uploadImage = canvas.toDataURL('image/jpeg', 0.5);
            _this.more.profile.photo.submit($rootScope.uploadImage);
          });

          /*$('#scale-element').attr('src', 'data:image/jpeg;base64,' + imageData);
          $("#beforeSnapTitle").hide();
          $("#beforeSnapButton").html('Retake photo');
          $("#beforeSnapButton").removeClass("active-center");

          $("#afterSnapTitle").show();
          $("#afterSnapButton").show();*/

        }, function (err) {
          // An error occured. Show a message to the user
        });

      },
      readyTakePicture: function (state) {
        console.log('readyTakePicture');

        $("#change-photo").removeClass("show");
        $("#change_photo_bg_modal").removeClass("show");

        //$state.go('agentLanding.takePhoto');
        confirmPhotoMode = true;
        imagePictURI = "";
        $state.go(state + '.takePhoto');
      },
      chooseFromGallery: function (state) {
        console.log('from gallery');

        var options = {
          maximumImagesCount: 1,
          width: 800,
          height: 800,
          quality: 100
        };

        $cordovaImagePicker.getPictures(options).then(
          function (results) {
            console.log(results);
            for (var i = 0; i < results.length; i++) {
              imagePictURI = results[i];
              confirmPhotoMode = true;
              //$state.go(state+'.takePhoto');

              $jrCrop.crop({
                url: imagePictURI,
                width: screen.width - 40,
                height: screen.width - 40,
                circle: true,
                title: 'Move and Scale'
              }).then(function (canvas) {
                //set file data
                $rootScope.uploadImage = canvas.toDataURL('image/jpeg', 0.5);
                _this.more.profile.photo.submit($rootScope.uploadImage);
              });
            }

          },
          function (error) {
            // error getting photos
          });
      },
      b64toBlob: function (b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data.split(',')[1]);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
          var slice = byteCharacters.slice(offset, offset + sliceSize);

          var byteNumbers = new Array(slice.length);
          for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }

          var byteArray = new Uint8Array(byteNumbers);

          byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {
          type: contentType
        });
        return blob;
      },

      browsePicture: function (state) {

        var _imagePictURI = state;
        /* console.log('from browse image');
        console.log(_imagePictURI); */

        $jrCrop.crop({
          url: _imagePictURI,
          width: screen.width - 40,
          height: screen.width - 40,
          circle: true,
          title: 'Move and Scale'
        }).then(function (canvas) {
          //set file data
          $rootScope.uploadImage = canvas.toDataURL('image/jpeg', 0.5);
          _this.more.profile.photo.submit($rootScope.uploadImage);
        });

      },
      cropImage: function (image) {
        $jrCrop.crop({
          url: image,
          width: screen.width - 40,
          height: screen.width - 40,
          circle: true,
          title: 'Move and Scale'
        }).then(function (canvas) {
          //set file data
          $rootScope.uploadImage = canvas.toDataURL('image/jpeg', 0.5);
          _this.more.profile.photo.submit($rootScope.uploadImage);
        });
      }
    }

    //modal
    this.modal = {
      show: {
        input: {
          after: function () {
            return {
              name: ''
            }
          }
        }
      }
    }

    //user service
    this.user = {
      profile: function () {
        var _type = $rootScope.userLogin.is_agent == 1 ? 'agent' : 'employee',
          _config = {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
              'Accept-Language': $rootScope.config.country.selected.language.code,
              'token_kadaluarsa': _type + '&' + $rootScope.userLogin.api_token
            }
          },
          _api = _type == 'agent' ? app.api.agent.profile : app.api.employee.profile,
          //call api area id
          promise = $http.get(app.api.url + _api, _config),
          deferObject = deferObject || $q.defer();

        promise.then(
          // OnSuccess function
          function (answer) {
            deferObject.resolve(answer.data);
          },
          // OnFailure function
          function (reason) {
            deferObject.resolve(this.data);
          }
        );
        return deferObject.promise;
      },
      edit: function (profile) {
        var _type = $rootScope.userLogin.is_agent == 1 ? 'agent' : 'employee',
          _data = _type == 'agent' ? $.param({
            first_name: profile.first_name,
            last_name: profile.last_name,
            // phone: $rootScope.config.country.selected.phonePrefix + profile.phone,
            phone: '0' + profile.phone,
            email: profile.email,
            agencies_id: profile.agencies_id,
            type: CONFIG.webApp == 'true' ? 'web' : 'mobile'
          }) : $.param({
            first_name: profile.first_name,
            last_name: profile.last_name,
            // primary_phone: $rootScope.config.country.selected.phonePrefix + profile.phone,
            primary_phone: '0' + profile.phone,
            email: profile.email
          }),
          _config = {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
              'Accept-Language': $rootScope.config.country.selected.language.code,
              'token_kadaluarsa': _type + '&' + $rootScope.userLogin.api_token
            }
          },
          _api = $rootScope.userLogin.is_agent == 1 ? app.api.agent.update : app.api.employee.update,
          promise = $http.post(app.api.url + _api, _data, _config),
          deferObject = deferObject || $q.defer();

        promise.then(
          // OnSuccess function
          function (answer) {
            deferObject.resolve(answer.data);
          },
          // OnFailure function
          function (error) {
            deferObject.resolve(error);
          }
        );
        return deferObject.promise;
      },
      nameContainNumber: function (name) {
        function hasNumbers(str) {
          var patt1 = /[0-9]/g;
          return str.match(patt1);
        }

        var _result;

        if (hasNumbers(name) == null) {
          _result = {
            status: 1,
            messages: 'success'
          }
        } else {
          _result = {
            status: 0,
            messages: 'error, contain number'
          }
        }

        return _result;
      },
    }

    //check firstboot
    this.boot = {
      check: function () {
        console.log('test');
      }
    }

    //add device for urbanairship
    this.addDevice = function (deviceData) {
      var deferObject = deferObject || $q.defer();
      var promise = $http.post(app.api.urbanUrl + app.api.login.device, deviceData);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer.data);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );

      return deferObject.promise;
    };

    this.requests = {
      rate: function () {
        var _config = {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
              'Accept-Language': $rootScope.config.country.selected.language.code,
              'token_kadaluarsa': 'agent&' + $rootScope.userLogin.api_token
            }
          },
          deferObject = deferObject || $q.defer(),
          promise = $http.get(app.api.url + app.api.agent.incomingRate, _config);

        promise.then(
          function (answer) {
            deferObject.resolve(answer.data);
          },
          function (error) {
            deferObject.reject(error);
          }
        );

        return deferObject.promise;
      },

      incoming: function () {
        var _config = {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
              'Accept-Language': $rootScope.config.country.selected.language.code,
              'token_kadaluarsa': 'employee&' + $rootScope.userLogin.api_token
            }
          },
          deferObject = deferObject || $q.defer(),
          promise = $http.get(app.api.url + app.api.agent.incoming, _config);

        promise.then(
          function (answer) {
            deferObject.resolve(answer.data);
          },
          function (error) {
            deferObject.reject(error);
          }
        );

        return deferObject.promise;
      },

      popupSuccess: function () {
        var _config = {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
              'Accept-Language': $rootScope.config.country.selected.language.code,
              'token_kadaluarsa': 'agent&' + $rootScope.userLogin.api_token
            }
          },
          deferObject = deferObject || $q.defer(),
          promise = $http.get(app.api.url + app.api.agent.popup.success, _config);

        promise.then(
          function (answer) {
            deferObject.resolve(answer.data);
          },
          function (error) {
            deferObject.reject(error);
          }
        );

        return deferObject.promise;
      },

      popupReject: function () {
        var _config = {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;',
              'Accept-Language': $rootScope.config.country.selected.language.code,
              'token_kadaluarsa': 'agent&' + $rootScope.userLogin.api_token
            }
          },
          deferObject = deferObject || $q.defer(),
          promise = $http.get(app.api.url + app.api.agent.popup.reject, _config);

        promise.then(
          function (answer) {
            deferObject.resolve(answer.data);
          },
          function (error) {
            deferObject.reject(error);
          }
        );

        return deferObject.promise;
      },
    }
  }]);

app.factory('responseObserver', function responseObserver($q, $window) {
  return {
    responseError: function (errorResponse) {
      switch (errorResponse.status) {
        case 403:
          console.log("403");
          break;
        case 500:
          console.log("500");
          break;
        default:
      }

      return $q.reject(errorResponse);
    }
  };
});

app.factory('tokenExpiredObserver', function tokenExpiredObserver($q, $window, $rootScope) {
  return {
    response: function (response) {
      switch (response.data.status) {
        case -1:
          //detect if popup show
          if ($rootScope.expired != true) {
            // Remove for UAT purpose
            $rootScope.auto_logout();
          }
          break;
        default:
      }

      return $q.resolve(response);
    }
  }
})

app.controller('landingCtrl', ['$rootScope', '$ionicSlideBoxDelegate', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$localstorage',
  function ($rootScope, $ionicSlideBoxDelegate, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $localstorage) {

    $ionicNavBarDelegate.showBackButton(true);

    // $ionicHistory.clearCache().then(function () {
    //   $ionicHistory.clearHistory();
    // });

    console.log($localstorage.getObject('userLogin'))

    $scope.$on('$ionicView.beforeEnter', function () {

    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
      $timeout(function () {
        $('.flash-slider-first').addClass('show-logo');
      }, 150);
      $timeout(function () {
        $('.flash-slider-first,.slider-pager').addClass('show');
      }, 1150);
    });

    $scope.$on("$ionicSlides.sliderInitialized", function (event, data) {
      // data.slider is the instance of Swiper
      $scope.slider = data.slider;
    });

    $scope.$on("$ionicSlides.slideChangeStart", function (event, data) {
      console.log('Slide change is beginning');
    });

    $scope.$on("$ionicSlides.slideChangeEnd", function (event, data) {
      console.log(1);
      // note: the indexes are 0-based
      $scope.activeIndex = data.slider.activeIndex;
      $scope.previousIndex = data.slider.previousIndex;
    });

    //  Slide Change
    $scope.slideChanged = function (index) {
      $timeout(function () {
        $('.slider-slide[data-index="' + index + '"]').find('.flash-slider-item').addClass('show');
      }, 150);
    }

    $scope.slideTo = function(to) {
      // $scope.currentSlide = to;
      console.log('clicked '+to);
      $ionicSlideBoxDelegate.slide(to);
    }

  }
])

app.controller('tncCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$localstorage',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $localstorage) {
    $ionicNavBarDelegate.showBackButton(false);
    $scope.$on('$ionicView.beforeEnter', function () {

    });
    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });
  }
])

app.factory('authFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.login = function (data) {
      var _data = {
          'orang_email': data.email,
          'orang_password': data.password
        },
        _config = {},
        promise,
        deferObject = deferObject || $q.defer();

      _data = JSON.stringify(_data);

      promise = $http.post(app.api.url + app.api.login, _data, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.loginSocmed = function (data) {
      var _data = $.param({
          'sosmed': data.sosmed,
          'email': data.email,
          'avatar': data.avatar,
          'username': data.username,
        }),
        _config = {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      promise = $http.post(app.api.url + app.api.loginSocmed, _data, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.register = function (data) {
      var _data = {
          'orang_email': data.email,
          'orang_password': data.password
        },
        _config = {},
        promise,
        deferObject = deferObject || $q.defer();

      _data = JSON.stringify(_data);

      promise = $http.post(app.api.url + app.api.register, _data, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('commentsFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.data = function (id) {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.get(app.api.url + app.api.comment + '?castvid_id=' + id, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.add = function (data) {
      var _data = {
          'castvid_id': data.id,
          'vidcomment_body': data.body
        },
        _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      _data = JSON.stringify(_data);

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.post(app.api.url + app.api.comment_post, _data, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('galleryDetailFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.data = function (id) {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.get(app.api.url + app.api.gallery.detail + '?id=' +id, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('galleryFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.data = function () {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.get(app.api.url + app.api.gallery.list, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('greetingFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.cat_follow = function (id) {
      var _data = {
        'category_levels': id
      }
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      promise = $http.post(app.api.url + app.api.category_follow, _data, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('homeFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.data = function (id) {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      promise = $http.get(app.api.url + app.api.home, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.video = {
      like: function (id) {
        var _data = {
            'castvid_id': id

          },
          _config = {
            headers: {
              'JWT': $rootScope.CONFIG.userLogin.token
            }
          },
          promise,
          deferObject = deferObject || $q.defer();

        _data = JSON.stringify(_data);

        promise = $http.post(app.api.url + app.api.video.like, _data, _config);

        promise.then(
          // OnSuccess function
          function (answer) {
            deferObject.resolve(answer);
          },
          // OnFailure function
          function (error) {
            deferObject.reject(error);
          }
        );
        return deferObject.promise;
      }
    }

    return dataFactory;
  }
])

app.factory('notificationFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.getNotif = function () {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      promise = $http.get(app.api.url + app.api.notification, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('profileFactory', ['$rootScope', '$http', '$q', '$timeout', '$state', '$cordovaCamera', '$cordovaImagePicker', '$jrCrop', '$cordovaFileTransfer', '$ionicLoading',
  function ($rootScope, $http, $q, $timeout, $state, $cordovaCamera, $cordovaImagePicker, $jrCrop, $cordovaFileTransfer, $ionicLoading) {
    var dataFactory = {};

    dataFactory.data = function () {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.get(app.api.url + app.api.profile, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.edit = function (data) {
      var _date = data.talent_datebirth,
        _data = {
          'talent_name': data.talent_name,
          'talent_nickname': data.talent_nickname,
          'talent_gender': data.talent_gender,
          'talent_ktp': data.talent_ktp,
          'talent_datebirth': _date,
          'talent_phone': data.talent_phone,
          'talent_address': data.talent_address,
          'talent_tinggi': data.talent_tinggi,
          'talent_berat': data.talent_berat,
          'talent_suku': data.talent_suku,
          'talent_hobi': data.talent_hobi,
          'talent_brief': data.talent_brief
        },
        _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      _data = JSON.stringify(_data);

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.post(app.api.url + app.api.profile_edit, _data, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.camera = {
      takePicture: function (state) {
        navigator.camera.getPicture(dataFactory.upload,
          function (message) {
            alert('get picture failed');
          }, {
            quality: 50,
            allowEdit: true,
            destinationType: navigator.camera.PictureSourceType.FILE_URI,
            sourceType: navigator.camera.PictureSourceType.CAMERA,
            mediaType: navigator.camera.MediaType.ALLMEDIA
          });

      },
      chooseFromGallery: function (state) {
        navigator.camera.getPicture(dataFactory.upload,
          function (message) {
            alert('get picture failed');
          }, {
            quality: 50,
            allowEdit: true,
            destinationType: navigator.camera.PictureSourceType.FILE_URI,
            sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
            mediaType: navigator.camera.MediaType.ALLMEDIA
          });
      }
    }

    dataFactory.upload = function (imageURI) {
      $ionicLoading.show({
        animation: 'fade-in',
        showBackdrop: true
      });

      var options = new FileUploadOptions();
      options.fileKey = "file";
      options.fileName = imageURI.substr(imageURI.lastIndexOf('/') + 1);
      options.mimeType = "image/jpeg";
      options.chunkedMode = false;

      var params = new Object();
      params.value1 = "param";
      options.params = params;

      var headers = {
        'headerParam': 'headerValue',
        'JWT': $rootScope.CONFIG.userLogin.token,
      };
      options.headers = headers;

      var ft = new FileTransfer();
      ft.onprogress = function (progressEvent) {
        if (progressEvent.lengthComputable) {
          //var perc = loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
          var perc = progressEvent.loaded / progressEvent.total;
          //statusDomAvatar.innerHTML = Math.floor(perc * 100) + "%";
        } else {
          //var perc = loadingStatus.increment();
          //statusDomAvatar.innerHTML = "Sedang mengupload...";
        }
      };
      ft.upload(imageURI, "https://nutalent.co.id/api/v201/profile_index_uploadavatar_post", onSuccessUploadAvatar, onErrorUploadAvatar, options);

      function onSuccessUploadAvatar(r) {
        $ionicLoading.hide();
        var _data = JSON.parse(r.response);
        console.log(_data.data.talent.talent_photo);
        $rootScope.profileData.talent.talent_photo = _data.data.talent.talent_photo;
      }

      function onErrorUploadAvatar(error) {
        console.log(error);
        /* Jika gagal tetapi sudah upload di 99%, bilang berhasil dan teruskan ke halaman selanjutnya */
        if ($('#upload_avatar_status').html() == "99%") {

          alert("Gagal 99")

        } else {
          alert('Gagal');
        }
        $ionicLoading.hide();
      }
    }

    return dataFactory;
  }
])

app.factory('profileLainFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.data = function (id) {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.get(app.api.url + app.api.profile_lain + '?id=' + id, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.follow = function (data) {
      var _data = {
          'follow_this_id': data
        },
        _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      // _data = JSON.stringify(_data);

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.post(app.api.url + app.api.follow_user, _data, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('programDetailFactory', ['$rootScope', '$http', '$q', '$timeout', '$state',
  function ($rootScope, $http, $q, $timeout, $state) {
    var dataFactory = {};

    dataFactory.data = function (id) {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.get(app.api.url + app.api.program.detail + '?sinopchar_id=' + id, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    return dataFactory;
  }
])

app.factory('programFactory', ['$rootScope', '$http', '$q', '$timeout', '$state', '$ionicLoading', '$stateParams', '$ionicPopup',
  function ($rootScope, $http, $q, $timeout, $state, $ionicLoading, $stateParams, $ionicPopup) {
    var dataFactory = {};

    dataFactory.data = function (id) {
      var _config = {
          headers: {
            'JWT': $rootScope.CONFIG.userLogin.token,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        },
        promise,
        deferObject = deferObject || $q.defer();

      //promise = $http.get(app.api.url + app.api.profile, _config);
      promise = $http.get(app.api.url + app.api.program.list + '?category_level=' + id, _config);

      promise.then(
        // OnSuccess function
        function (answer) {
          deferObject.resolve(answer);
        },
        // OnFailure function
        function (error) {
          deferObject.reject(error);
        }
      );
      return deferObject.promise;
    }

    dataFactory.camera = {
      takeVideo: function (params) {
        $rootScope.sinopchar_id = params.slug;
        navigator.device.capture.captureVideo(captureSuccess, captureError, {
          limit: 1
        });

        function captureSuccess(mediaFiles) {
          console.log(mediaFiles);
          dataFactory.upload(mediaFiles[0].fullPath);
        }

        function captureError(e) {
          // $('.hiddendiv').remove();
          // $('.drag-target').remove();
          // $('.lean-overlay').remove();
          console.log("capture error: " + JSON.stringify(e));
        }

      },
      chooseFromGallery: function (params) {
        $rootScope.sinopchar_id = params.slug;
        navigator.camera.getPicture(dataFactory.upload,
          function (message) {
            alert('get picture failed');
          }, {
            quality: 50,
            allowEdit: true,
            destinationType: navigator.camera.PictureSourceType.FILE_URI,
            sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
            mediaType: Camera.MediaType.VIDEO
          });
      }
    }

    dataFactory.upload = function (imageURI) {
      $ionicLoading.show({
        animation: 'fade-in',
        showBackdrop: true
      });

      var sinopchar_id = $rootScope.sinopchar_id,
        options = new FileUploadOptions();
      options.fileKey = "file";
      options.fileName = imageURI.substr(imageURI.lastIndexOf('/') + 1);
      options.mimeType = "video/mp4";
      options.chunkedMode = false;

      var params = new Object();
      params.sinopchar_id = sinopchar_id;
      options.params = params;

      var headers = {
        'headerParam': 'headerValue',
        'JWT': $rootScope.CONFIG.userLogin.token,
      };
      options.headers = headers;

      var ft = new FileTransfer();
      ft.onprogress = function (progressEvent) {
        if (progressEvent.lengthComputable) {
          //var perc = loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
          var perc = progressEvent.loaded / progressEvent.total;
          //statusDomAvatar.innerHTML = Math.floor(perc * 100) + "%";
        } else {
          //var perc = loadingStatus.increment();
          //statusDomAvatar.innerHTML = "Sedang mengupload...";
        }
      };
      ft.upload(imageURI, "https://nutalent.co.id/api/v201/projects_detail_post", onSuccessUploadVideo, onErrorUploadVideo, options);

      function onSuccessUploadVideo(r) {
        $ionicLoading.hide();
        var _data = JSON.parse(r.response);
        var alertPopup = $ionicPopup.alert({
          title: 'Berhasil',
          template: 'Video Anda berhasil diupload'
        });
      }

      function onErrorUploadVideo(error) {
        console.log(error);
        /* Jika gagal tetapi sudah upload di 99%, bilang berhasil dan teruskan ke halaman selanjutnya */
        if ($('#upload_avatar_status').html() == "99%") {
          //alert("Gagal 99")
          var alertPopup = $ionicPopup.alert({
            title: 'Gagal',
            template: 'Video Anda gagal diupload'
          });

        } else {
          //alert('Gagal');
          var alertPopup = $ionicPopup.alert({
            title: 'Gagal',
            template: 'Video Anda gagal diupload'
          });
        }
        $ionicLoading.hide();
      }
    }

    return dataFactory;
  }
])

app.controller('forgotPasswordCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading) {
    // $ionicHistory.clearCache().then(function () {
    //   $ionicHistory.clearHistory();
    // });

    $scope.$on('$ionicView.beforeEnter', function () {

    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });
  }
])

app.controller('galleryCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'galleryFactory', '$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, galleryFactory, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
    }, 0);

    $ionicNavBarDelegate.showBackButton(false);
    $ionicHistory.nextViewOptions({
      disableAnimate: true
    });

    // $ionicHistory.clearCache().then(function () {
    //   $ionicHistory.clearHistory();
    // });

    $scope.getDataGallery = function () {
      galleryFactory.data().then(
        function (answer) {
          $scope.galleryData = answer;

          angular.forEach(answer.data.datas, function (v, i) {
            $scope.galleryData.data.datas[i].relative_time = moment(v.created_at).fromNow();
          });

          $timeout(function () {
            console.log($scope.galleryData);
            $scope.showSkeleton = false;
            $ionicScrollDelegate.freezeAllScrolls(false);
          }, 750);
        }
      );
    }

    $scope.doRefresh = function () {
      $timeout(function () {
        $scope.getDataGallery();
        $scope.$broadcast('scroll.refreshComplete');
      }, 500);
    };

    $scope.$on('$ionicView.beforeEnter', function () {

    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });

    // Load Data Gallery
    $scope.getDataGallery();

  }
])

app.controller('galleryDetailCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'galleryDetailFactory', 'commentsFactory', '$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, galleryDetailFactory, commentsFactory, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
    }, 0);

    //comments add
    $scope.newComment = null;
    $scope.showCommentInput = false;

    $scope.event = {
      showCommentInput: function () {
        if ($scope.showCommentInput != true) {
          $scope.showCommentInput = true;
        } else {
          $scope.showCommentInput = false;
        }
      },
      addComment: function (data) {
        var _data = {
          id: $state.params.slug,
          body: data
        }

        $('textarea[data-input=""]').val('');
        $scope.showCommentInput = false;

        commentsFactory.add(_data).then(
          function (answer) {
            $scope.getCommentData();
            $scope.commentInputData = answer;
            console.log(_data);
            $scope.newComment = null;
          }
        );
      }
    }

    $ionicNavBarDelegate.showBackButton(true);

    $scope.shareSheetGallery = function (message, subject, file, link) {
      console.log('run share sheet');
      $timeout(function () {
        console.log(message);
      }, 0)
      return false;
      $cordovaSocialSharing
        .share(message, subject, file, link) // Share via native share sheet
        .then(function (result) {
          console.log(result);
          // Success!
        }, function (err) {
          console.log(err);
          // An error occured. Show a message to the user
        });
    }

    galleryDetailFactory.data($state.params.slug).then(
      function (answer) {
        $scope.galleryDetailData = answer;
        console.log($scope.galleryDetailData);
        $scope.galleryDetailData.data.mainvid.relative_time = moment($scope.galleryDetailData.data.mainvid.created_at).fromNow();

        $scope.galleryDetailData.data.listvid.forEach(function (v, i) {
          $scope.galleryDetailData.data.listvid[i].relative_time = moment(v.created_at).fromNow();
        });
      }
    );

    $scope.getCommentData = function () {
      commentsFactory.data($state.params.slug).then(
        function (answer) {
          $scope.commentsData = answer;
          console.log($scope.commentsData);
          $timeout(function () {
            $scope.showSkeleton = false;
            $ionicScrollDelegate.freezeAllScrolls(false);
          }, 750);
        }
      );
    }

    $scope.youtubeIframeSrc = function (videoId) {
      //return 'https://www.youtube.com/embed/' + videoId + '?controls=0&amp;showinfo=0&amp;rel=0'
      return 'https://www.youtube.com/embed/' + videoId + '?controls=0&amp;showinfo=0&amp;rel=0&amp;modestbranding=1'
    };

    $scope.$on('$ionicView.beforeEnter', function () {
      $scope.getCommentData();
    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });
  }
])

app.controller('profileLainCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'profileLainFactory','$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, profileLainFactory, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
    }, 0);

    // $ionicNavBarDelegate.showBackButton(true);

    profileLainFactory.data($state.params.slug).then(
      function (answer) {
        $scope.profileLainData = answer.data;

        console.log($scope.profileLainData);
        $timeout(function () {
          $scope.showSkeleton = false;
          $ionicScrollDelegate.freezeAllScrolls(false);
        }, 750);

        $scope.isFollow = $scope.profileLainData.am_i_following_this_talent;
        if($scope.isFollow == true){
          document.getElementById('btnFollow').classList.add('btn-followed');
        }else {
          document.getElementById('btnFollow').classList.add('btn-follow');
        }
      }
    );
    
    $scope.followUser = function(data){
        $ionicLoading.show({
          animation: 'fade-in',
          showBackdrop: true
        });
        console.log('click follow');
        profileLainFactory.follow(data).then(
          function (answer) {
            if (answer.data.r_status == "fail") {
              $ionicLoading.hide();
              console.log(answer.data.r_status);
              // An alert dialog
              var alertPopup = $ionicPopup.alert({
                cssClass: 'popup-error',
                title: 'Gagal',
                template: answer.data.msg
              });
            } else {
              $scope.profileLainData.follower_count = answer.data.data.follower_count_for_this_user;
              $scope.profileLainData.following_count = answer.data.data.following_count_for_this_user;
              if(answer.data.data.following_this_user == true){
                $timeout(function () {
                  document.getElementById('btnFollow').classList.remove('btn-follow');
                  document.getElementById('btnFollow').classList.add('btn-followed');
                  $ionicLoading.hide();
                }, 750);
              } else {
                $timeout(function () {
                  document.getElementById('btnFollow').classList.remove('btn-followed');
                  document.getElementById('btnFollow').classList.add('btn-follow');
                  $ionicLoading.hide();
                }, 750);
              }
              console.log(answer.data);
              console.log(answer.data.data.following_this_user);
            }
          },
          function (reason) {
            console.log('-e-');
            console.log(reason);
            $ionicLoading.hide();
          }
        );
    }

    $scope.$on('$ionicView.beforeEnter', function () {

    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });
  }
])

app.controller('gateCtrl', ['$rootScope', '$ionicSlideBoxDelegate', '$scope', '$window', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', 'authFactory', '$localstorage', '$ionicViewSwitcher', '$ionicModal', 'ngFB', '$cordovaOauth', 'authFactory', '$ionicViewSwitcher',
  function ($rootScope, $ionicSlideBoxDelegate, $scope, $window, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, authFactory, $localstorage, $ionicViewSwitcher, $ionicModal, ngFB, $cordovaOauth, authFactory, $ionicViewSwitcher) {

    // $ionicHistory.clearCache().then(function () {
    //   $ionicHistory.clearHistory();
    // });

    // Defaults to sessionStorage for storing the Facebook token
    openFB.init({
      appId: '2056045551352182'
    });

    $scope.loginFacebook = function () {
      // $ionicLoading.show({
      //   animation: 'fade-in',
      //   showBackdrop: true
      // });
      console.log('loginfacebook entry');

      openFB.login(
        function (response) {
          if (response.status === 'connected') {
            $scope.getUserData();
            console.log('connected');
          } else {
            $ionicLoading.hide();
            alert('Facebook login failed: ' + response.error);
          }
        }, {
          scope: 'email'
        });

    }

    $scope.getUserData = function () {
      ngFB.api({
          path: '/me',
          params: {
            fields: 'id,name,picture,email'
          }
        })
        .then(function (user) {
            var _data = {};
            $rootScope.CONFIG.userLogin = user;

            _data.sosmed = 'facebook';
            _data.email = $rootScope.CONFIG.userLogin.email;
            _data.username = $rootScope.CONFIG.userLogin.name;
            _data.avatar = $rootScope.CONFIG.userLogin.picture.data.url;

            $scope.loginSocmed(_data);
          },
          function (error) {
            console.log(error);
            //alert('Facebook error: ' + error.error_description);
          }
        )
    }

    $scope.loginSocmed = function (data) {
      authFactory.loginSocmed(data).then(
        function (answer) {
          if (answer.data.r_status == "fail") {
            console.log(answer.data.r_status);

            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: 'popup-error',
              title: 'Gagal',
              template: answer.data.msg
            });
          } else {
            console.log(answer);

            //redirect to home page
            data.id = answer.data.orang_id;
            data.level = answer.data.orang_level;
            data.token = answer.data.token;
            $localstorage.setObject('userLogin', data);
            $rootScope.CONFIG.userLogin = data;
            $rootScope.CONFIG.isLogin = true;
            $window.localStorage.setItem('isUserLogin','true');
            // $state.go('home.index');
            $state.go('greeting');
          }
        },
        function (reason) {
          console.log('-e-');
          console.log(reason);
          $scope.content.loaded = false;
        }
      )
    }

    $scope.googleLogin = function () {
      // console.log('test');
      // $cordovaOauth.google("appId12345.apps.googleusercontent.com", ["email", "profile"]).then(function (result) {
      //   $scope.details = result.access_token;
      //   console.log($scope.details);
      // }, function (error) {
      //   $scope.details = "error";
      //   console.log(error);
      // });
      $state.go('greeting');
    }

    $scope.twitterLogin = function () {

      $cordovaOauth.twitter("consumer-key", "consumer-secret-api", {
        redirect_uri: "http://10.0.2.2/callback"
      }).then(function (result) {
        alert('success');
      }, function (error) {
        alert('error');
      });
    }

    // Login
    $ionicModal.fromTemplateUrl('templates/auth/login/index.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.modalLogin = modal;
    });

    // Register
    $scope.registerLayer = 'first';

    // Register Slide Up
    $ionicModal.fromTemplateUrl('templates/auth/register/index.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function (modal) {
      $scope.modalRegisterSlideUp = modal;
    });

    // Register Slide Left
    $ionicModal.fromTemplateUrl('templates/auth/register/index.html', {
      scope: $scope,
      animation: 'slide-in-left'
    }).then(function (modal) {
      $scope.modalRegisterSlideLeft = modal;
    });


    // Open Modal
    $scope.openModal = function (form, layer) {
      if (form == 'login') {
        $scope.modalLogin.show();
      } else if (form == 'register-slide-up') {
        $scope.modalRegisterSlideUp.show();
        $scope.registerLayer = 'first';
      } else if (form == 'register-slide-left') {
        $scope.registerLayer = 'stack';
        $scope.modalRegisterSlideLeft.show();
      }
    };

    // Close Modal
    $scope.closeModal = function (form, layer) {
      if (form == 'login') {
        $scope.modalLogin.hide();
      } else if (form == 'register-slide-up') {
        $scope.registerLayer = 'first';
        $scope.modalRegisterSlideUp.hide();
      } else if (form == 'register-slide-left') {
        $scope.registerLayer = 'stack';
        $scope.modalRegisterSlideLeft.hide();
      } else if (form == 'greeting') {
        $scope.modalGreeting.hide();
    }
    };

    // Change Form Register
    $scope.changeForm = function (form) {
      $scope.currentForm = form;
    }

    //login form
    $scope.formSubmit = function (data) {
      $ionicLoading.show({
        animation: 'fade-in',
        showBackdrop: true
      });

      authFactory.login(data).then(
        function (answer) {
          $ionicLoading.hide();
          if (answer.data.r_status == "fail") {
            console.log(answer.data.r_status);

            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: 'popup-error',
              title: 'Gagal',
              template: answer.data.msg
            });
          } else {
            console.log(answer);
            $scope.modalLogin.hide();

            //redirect to home page
            data.userId = answer.data.orang_id;
            data.level = answer.data.orang_level;
            data.token = answer.data.token;
            $localstorage.setObject('userLogin', data);
            $rootScope.CONFIG.userLogin = data;
            $rootScope.CONFIG.isLogin = true;
            $window.localStorage.setItem('isUserLogin','true');

            console.log('redirect from login');
            console.log($rootScope.CONFIG.userLogin);

            $ionicViewSwitcher.nextDirection('forward');
            $timeout(function () {
              $state.go('greeting');
            }, 0)
          }
        },
        function (reason) {
          console.log('-e-');
          console.log(reason);
          $scope.content.loaded = false;
          $ionicLoading.hide();
        }
      )
    }

    //register form
    $scope.formRegisterSubmit = function (data) {
      $ionicLoading.show({
        animation: 'fade-in',
        showBackdrop: true
      });

      authFactory.register(data).then(
        function (answer) {
          $ionicLoading.hide();
          if (answer.data.r_status == "fail") {
            console.log(answer.data.r_status);

            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: 'popup-error',
              title: 'Gagal',
              template: answer.data.msg
            });
          } else {
            console.log(answer);
            //redirect to home page
            data.id = answer.data.orang_id;
            data.level = answer.data.orang_level;
            data.token = answer.data.token;
            $localstorage.setObject('userLogin', data);
            $rootScope.CONFIG.userLogin = data;
            $rootScope.CONFIG.isLogin = true;
            $window.localStorage.setItem('isUserLogin','true');

            console.log('redirect from register');
            console.log($rootScope.CONFIG.userLogin);

            $ionicViewSwitcher.nextDirection('forward');

            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: '',
              title: 'Berhasil',
              template: 'Anda berhasil mendaftar, tekan tombol oke untuk lanjut'
            });

            alertPopup.then(function (res) {
              $scope.modalRegisterSlideUp.hide();
              $scope.modalRegisterSlideLeft.hide();
              $timeout(function () {
                $scope.formSubmit(data);
              }, 0)
            });
          }
        },
        function (reason) {
          console.log('-e-');
          console.log(reason);
          $scope.content.loaded = false;
          $ionicLoading.hide();
        }
      )
    }

    //login guest
    $scope.loginGuest = function () {
      $rootScope.CONFIG.isLogin = false;
      $window.localStorage.setItem('isGuestLogin','true');
      $state.go('home.index');
    }



  }
])

app.controller('greetingCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', 'authFactory', '$localstorage', '$ionicViewSwitcher', '$ionicModal', 'ngFB', '$cordovaOauth', 'greetingFactory', '$ionicViewSwitcher',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, authFactory, $localstorage, $ionicViewSwitcher, $ionicModal, ngFB, $cordovaOauth, greetingFactory, $ionicViewSwitcher) {
    $localstorage.set('01', 0);
    $localstorage.set('02', 0);
    $localstorage.set('03', 0);
    $localstorage.set('04', 0);
    $localstorage.set('05', 0);
    $scope.cat_counter = 0;
    $scope.cat_follow = [];

    $scope.getIframeSrc = function (id) {
      if(id===undefined){
        $scope.generateNumber()
      }else {
        return 'https://nutalent.co.id/signup-video/' + id + '.mp4';
      }

    };

    $scope.generateNumber = function() {
      $scope.min = 1;
      $scope.max = 6;
      $scope.randomNumber = Math.floor(Math.random()*($scope.max-$scope.min+1)+$scope.min);
    }

    $scope.goToCategory = function () {
      $state.go('greeting-category');
    }

    $scope.goToVideo = function () {
      $state.go('greeting-video');
    }

    $scope.goToHome = function() {
      $ionicLoading.show({
        animation: 'fade-in',
        showBackdrop: true
      });

      greetingFactory.cat_follow($scope.cat_follow.toString()).then(
        function (answer) {
          $ionicLoading.hide();
          if (answer.data.r_status == "fail") {
            console.log(answer.data.r_status);
            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: 'popup-error',
              title: 'Gagal',
              template: answer.data.msg
            });
          } else {
            console.log(answer);
            $ionicViewSwitcher.nextDirection('forward');
            $state.go('home.index');
          }
        },
        function (reason) {
          console.log('-e-');
          console.log(reason);
          $ionicLoading.hide();
        }
      )
    }

    $scope.selectCategory = function (category) {
      if($localstorage.get(category)==0){
        $scope.cat_counter = $scope.cat_counter + 1;
        $localstorage.set(category, 1);
        document.getElementById(category).classList.add('cat-selected');
        $scope.cat_follow.push(category);
        console.log('push '+$scope.cat_follow);
      } else {
        for( var i = 0; i <= $scope.cat_follow.length-1; i++){
          if ( $scope.cat_follow[i] === category) {
            $scope.cat_follow.splice(i, 1);
          }
        }
        $scope.cat_counter = $scope.cat_counter - 1;
        $localstorage.set(category, 0);
        document.getElementById(category).classList.remove('cat-selected');
        console.log('splice '+$scope.cat_follow);
      }

    }

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
      $scope.generateNumber();
    });
  }
])

app.controller('activityCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'notificationFactory', '$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, notificationFactory, $ionicScrollDelegate) {

    $scope.showSkeleton = true;

    $scope.doRefresh = function () {
      $timeout(function () {
        $scope.getNotification();
        $scope.$broadcast('scroll.refreshComplete');
      }, 500);
    };

    $ionicNavBarDelegate.showBackButton(false);

    $ionicHistory.clearCache().then(function () {
      $ionicHistory.clearHistory();
    });

    $ionicHistory.nextViewOptions({
      disableAnimate: false
    });

    $scope.getNotification = function(){
      console.log('getNotification')
      notificationFactory.getNotif().then(
        function (answer) {
          $scope.notifData = answer.data;
          console.log($scope.notifData);

          $timeout(function () {
            $scope.showSkeleton = false;
            $ionicLoading.hide();
          }, 750);
        }
      );
    };

    $scope.$on('$ionicView.beforeEnter', function () {
      //console.log($rootScope.CONFIG);
      // $ionicLoading.show({
      //   animation: 'fade-in',
      //   showBackdrop: true
      // });
    });

    $scope.$on('$ionicView.enter', function () {
      $scope.getNotification();
    });

    $scope.$on('$ionicView.beforeLeave', function () {
      // $ionicHistory.nextViewOptions({
      //   disableAnimate: false
      // })
      // $ionicViewSwitcher.nextDirection('forward')
    });

  }
]);

app.controller('articleDetailCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'profileFactory', '$ionicActionSheet','$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, profileFactory, $ionicActionSheet, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
      $scope.title = $stateParams.title;
      $scope.body = $stateParams.body;
      console.log($scope.body);
    }, 0);

    // if ($state.current.name == 'home.profile') {
    //   $ionicNavBarDelegate.showBackButton(false);
    //
    //   // $ionicHistory.clearCache().then(function () {
    //   //   $ionicHistory.clearHistory();
    //   // });
    // } else {
    //   $ionicNavBarDelegate.showBackButton(true);
    // }
    $ionicNavBarDelegate.showBackButton(true);

    $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
      console.log($rootScope.CONFIG);
    });

    $scope.$on('$ionicView.enter', function () {
      $scope.showSkeleton = false;
    });
  }
])

app.controller('homeCtrl', ['$rootScope', '$scope', '$window', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'homeFactory', '$ionicScrollDelegate',
  function ($rootScope, $scope, $window, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, homeFactory, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $scope.cekIsLogin();
      $ionicScrollDelegate.freezeAllScrolls(true);
      $scope.getHomeData();
    }, 0);

    $ionicNavBarDelegate.showBackButton(true);

    $ionicHistory.clearCache().then(function () {
      $ionicHistory.clearHistory();
    });

    $ionicHistory.nextViewOptions({
      disableAnimate: false
    });

    $scope.doRefresh = function () {
      $timeout(function () {
        $scope.getHomeData();
        $scope.$broadcast('scroll.refreshComplete');
      }, 500);
    };

    //function global
    $scope.cekIsLogin = function() {
      console.log($window.localStorage.getItem('isUserLogin'));
      console.log($window.localStorage.getItem('isGuestLogin'));

      if($window.localStorage.getItem('isUserLogin') == 'true' || $window.localStorage.getItem('isGuestLogin') == 'true'){
        console.log('logged in as guest/user');
      } else {
        $state.go('index');
      }
    };

    //like video
    $rootScope.likeVideo = function (type, id, $event) {
      var $selector = $($event.currentTarget);
      homeFactory.video.like(id).then(
        function (answer) {
          var _dataLike = answer.data.data.jumlah_like_video_ini,
            _liked = answer.data.data.user_ini_suka_video_ini;

          switch (type) {
            case 'galleryDetail':
              $('span[data-like=""]').text(_dataLike + ' like');
              break;
            case 'home':
              $('span[data-like=""]').text(_dataLike + ' like');
              break;
          }

          if (_liked == 'ya') {
            $selector.addClass('like-actived')
          } else {
            $selector.removeClass('like-actived')
          }
        }
      );
    }

    $scope.submitSearch = function (data) {
      console.log(data);
      $ionicViewSwitcher.nextDirection('forward');
      $state.go('home.search');
    }
    $scope.getHomeData = function(){
      homeFactory.data($state.params.slug).then(
        function (answer) {
          $scope.homeData = answer.data;

          console.log($scope.homeData);

          angular.forEach($scope.homeData.timeline, function (v, i) {
            $scope.homeData.timeline[i].relative_time = moment(v.created_at).fromNow();
          });

          $timeout(function () {
            $scope.showSkeleton = false;
            $ionicScrollDelegate.freezeAllScrolls(false);
          }, 750);

          // _liked = answer.data.data.user_ini_suka_video_ini;
          // if (_liked == 'ya') {
          //   $selector.addClass('like-actived')
          // } else {
          //   $selector.removeClass('like-actived')
          // }

        }
      );
    };

    $scope.btnSelengkapnya = function(body, title) {
      // alert(id.concat('body'));
      // hide and show button selengkapnya
      // if($rootScope.id!=1){
      //   $rootScope.id = 1;
      //   document.getElementById(id.concat('btn')).textContent = 'Sembunyikan';
      //   document.getElementById(id.concat('body')).classList.remove('max-lines');
      //   document.getElementById(id.concat('body')).classList.add('no-max-lines');
      // }else{
      //   $rootScope.id = 0;
      //   document.getElementById(id.concat('btn')).textContent = 'Selengkapnya';
      //   document.getElementById(id.concat('body')).classList.remove('no-max-lines');
      //   document.getElementById(id.concat('body')).classList.add('max-lines');
      // }
      $state.go('home.indexArticleDetail', {body: body, title: title});


    };

    $scope.$on('$ionicView.beforeEnter', function () {
      //console.log($rootScope.CONFIG);
      // $ionicLoading.show({
      //   animation: 'fade-in',
      //   showBackdrop: true
      // });
    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });

    $scope.$on('$ionicView.beforeLeave', function () {
      $ionicHistory.nextViewOptions({
        disableAnimate: false
      })
      $ionicViewSwitcher.nextDirection('forward')
    });

  }
]);

app.controller('profileCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'profileFactory', '$ionicActionSheet','$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, profileFactory, $ionicActionSheet, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
    }, 0);

    // if ($state.current.name == 'home.profile') {
    //   $ionicNavBarDelegate.showBackButton(false);
    //
    //   // $ionicHistory.clearCache().then(function () {
    //   //   $ionicHistory.clearHistory();
    //   // });
    // } else {
    //   $ionicNavBarDelegate.showBackButton(true);
    // }
    $ionicNavBarDelegate.showBackButton(true);

    $scope.updateDate = function (dateIn) {
      var yyyy = dateIn.getFullYear();
      var mm = dateIn.getMonth() + 1; // getMonth() is zero-based
      var dd = dateIn.getDate();
      return String(10000 * yyyy + 100 * mm + dd); // Leading zeros for mm and dd
    }

    //get profile data
    $scope.getProfileData = function () {
      profileFactory.data().then(
        function (answer) {
          if (answer.data.r_status == "fail") {
            console.log(answer.data.r_status);

            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: 'popup-error',
              title: 'Gagal',
              template: answer.data.msg
            });

            alertPopup();
          } else {
            $rootScope.profileData = answer.data;
            $rootScope.profileData.talent.talent_birth = new Date(answer.data.talent.talent_birth);
            console.log('rootscope profile data')
            console.log($rootScope.profileData);

            $timeout(function () {
              $scope.showSkeleton = false;
              $ionicScrollDelegate.freezeAllScrolls(false);
            }, 750);

            if ($state.current.name == 'home.profileEdit') {
              $scope.profileEdit = $rootScope.profileData.talent;
            }
          }
        },
        function (reason) {
          console.log('-e-');
          console.log(reason);
          $scope.content.loaded = false;
        }
      )
    }

    //take camera
    $scope.avatarChange = function () {
      //call plugin permissions
      var permissions = cordova.plugins.permissions;
      permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, _success, _error);

      function _error() {
        var alertPopup = $ionicPopup.alert({
          title: $filter('translate')('ERROR_GLOBAL_TITLE'),
          template: $filter('translate')('Camera permission is not turned on'),
        });
        alertPopup.then(function (res) {

        });
      }

      function _success(status) {
        if (!status.hasPermission) {
          _error();
        } else {
          _run();
        }
      }

      function _run() {
        $ionicActionSheet.show({
          // titleText: 'ActionSheet Example',
          buttons: [{
              text: 'Ambil Foto'
            },
            {
              text: 'Pilih Gambar'
            },
          ],
          buttonClicked: function (index) {
            switch (index) {
              case 0:
                //show camera
                profileFactory.camera.takePicture();
                console.log('camera');
                break;
              case 1:
                profileFactory.camera.chooseFromGallery();
                console.log('dari galeri');
                break;
            }
            return true;
          },
          //cancelText: 'Cancel'
        });
      }
    }

    //update profile
    $scope.profileEditSubmit = function (data) {
      console.log(data);
      profileFactory.edit(data).then(
        function (answer) {
          if (answer.data.r_status == "fail") {
            console.log(answer.data.r_status);

            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: 'popup-error',
              title: 'Gagal',
              template: answer.data.msg
            });
          } else {
            // An alert dialog
            var alertPopup = $ionicPopup.alert({
              cssClass: '',
              title: 'Berhasil',
              template: 'Profil Anda berhasil di ubah'
            });

            $rootScope.profileData.talent = $scope.profileEdit;
            console.log($rootScope.profileData);

            if ($state.current.name == 'home.profileEdit') {
              $scope.profileEdit = $rootScope.profileData.talent;
            }
          }
        },
        function (reason) {
          console.log('-e-');
          console.log(reason);
          $scope.content.loaded = false;
        }
      )
    }

    $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
      $scope.getProfileData();
      // $scope.getOtherProfileData($state.params.slug);
      console.log($rootScope.CONFIG);
    });

    $scope.$on('$ionicView.enter', function () {});
  }
])

app.controller('programCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'programFactory','$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, programFactory, $ionicScrollDelegate) {
    $scope.programDataTitle = '';
    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
    }, 0);

    $ionicNavBarDelegate.showBackButton(true);

    programFactory.data($state.params.slug).then(
      function (answer) {
        $scope.programData = answer.data;
        console.log($scope.programData);
        console.log($state.params.slug);

        $timeout(function () {
          $scope.showSkeleton = false;
          $ionicScrollDelegate.freezeAllScrolls(false);
          $scope.programDataTitle = answer.data.page_title;
        }, 750);

      }
    );

    $scope.$on('$ionicView.beforeEnter', function () {

    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });
  }
])

app.controller('programDetailCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', '$ionicActionSheet', 'programFactory', 'programDetailFactory','$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, $ionicActionSheet, programFactory, programDetailFactory, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
    }, 0);

    $ionicNavBarDelegate.showBackButton(true);

    $scope.tab = 1;

    $scope.setTab = function (newTab) {
      $scope.tab = newTab;
    };

    $scope.isSet = function (tabNum) {
      return $scope.tab === tabNum;
    };

    //take camera
    $scope.startCasting = function () {
      //call plugin permissions

      var permissions = cordova.plugins.permissions;
      var permission = 'android.permission.WRITE_EXTERNAL_STORAGE';
      // var permission = permissions.WRITE_EXTERNAL_STORAGE;
      permissions.checkPermission(permission, _success, _error);
      permissions.requestPermission(permission, _success, _error);

      function _error() {
        // var alertPopup = $ionicPopup.alert({
        //   title: $filter('translate')('ERROR_GLOBAL_TITLE'),
        //   template: $filter('translate')('Camera permission is not turned on'),
        // });
        // alertPopup.then(function (res) {
        //
        // });
        console.warn('permission is not turned on');
      }

      function _success(status) {
        if (!status.hasPermission) {
          _error();
        } else {
          _run();
        }
      }

      function _run() {
        $ionicActionSheet.show({
          // titleText: 'ActionSheet Example',
          buttons: [{
              text: 'Ambil Video'
            },
            {
              text: 'Pilih Video'
            },
          ],
          buttonClicked: function (index) {
            switch (index) {
              case 0:
                //show camera
                programFactory.camera.takeVideo($stateParams);
                console.log('camera');
                break;
              case 1:
                programFactory.camera.chooseFromGallery($stateParams);
                console.log('dari galeri');
                break;
            }
            return true;
          },
          //cancelText: 'Cancel'
        });
      }
    }

    programDetailFactory.data($state.params.slug).then(
      function (answer) {
        $scope.programDetailData = answer.data;

        $timeout(function () {
          $scope.showSkeleton = false;
          $ionicScrollDelegate.freezeAllScrolls(false);
        }, 750);
      }
    );

    $scope.$on('$ionicView.beforeEnter', function () {

    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });
  }
])

app.controller('searchCtrl', ['$rootScope', '$scope', '$stateParams', '$state', '$timeout', '$http', '$ionicHistory', '$ionicNavBarDelegate', '$ionicHistory', '$location', '$filter', '$ionicPopup', '$ionicLoading', '$ionicViewSwitcher', 'galleryFactory', '$ionicScrollDelegate',
  function ($rootScope, $scope, $stateParams, $state, $timeout, $http, $ionicHistory, $ionicNavBarDelegate, $ionicHistory, $location, $filter, $ionicPopup, $ionicLoading, $ionicViewSwitcher, galleryFactory, $ionicScrollDelegate) {

    $scope.showSkeleton = true;
    $timeout(function () {
      $ionicScrollDelegate.freezeAllScrolls(true);
    }, 0);

    $ionicNavBarDelegate.showBackButton(true);

    $scope.getDataGallery = function () {
      galleryFactory.data().then(
        function (answer) {
          $scope.galleryData = answer;

          angular.forEach(answer.data.datas, function (v, i) {
            $scope.galleryData.data.datas[i].relative_time = moment(v.created_at).fromNow();
          });

          $timeout(function () {
            $scope.showSkeleton = false;
            $ionicScrollDelegate.freezeAllScrolls(false);
          }, 750);
        }
      );
    }

    $scope.doRefresh = function () {
      $timeout(function () {
        $scope.getDataGallery();
        $scope.$broadcast('scroll.refreshComplete');
      }, 500);
    };

    $scope.$on('$ionicView.beforeEnter', function () {

    });

    $scope.$on('$ionicView.enter', function () {
      $ionicLoading.hide();
    });

    $scope.submitSearch = function (data) {
      console.log(data);
      $ionicViewSwitcher.nextDirection('forward');
      $state.go('home.search');
    }

    // Load Data Gallery
    $scope.getDataGallery();
  }
]);

app.factory('$localstorage', ['$window', function ($window) {
  return {
    set: function (key, value) {
      $window.localStorage[key] = value;
    },
    get: function (key, defaultValue) {
      return $window.localStorage[key] || defaultValue;
    },
    setObject: function (key, value) {
      $window.localStorage[key] = JSON.stringify(value);
    },
    getObject: function (key) {
      return JSON.parse($window.localStorage[key] || '{}');
    },
    remove: function (key) {
      $window.localStorage.removeItem(key);
    }
  }
}]);
/**
 * Angular wrapper for the OpenFB library
 * Allows you to use OpenFB "the Angular way":
 *  - As an Angular service instead of a global object
 *  - Using promises instead of callbacks
 * @author Christophe Coenraets @ccoenraets
 * @version 0.5
 */
angular.module('ngOpenFB', [])

    .factory('ngFB', function ($q, $window) {

        function init(params) {
            return $window.openFB.init(params);
        }

        function login(options) {
            var deferred = $q.defer();
            $window.openFB.login(function(result) {
                if (result.status === "connected") {
                    deferred.resolve(result);
                } else {
                    deferred.reject(result);
                }
            }, options);
            return deferred.promise;
        }

        function logout() {
            var deferred = $q.defer();
            $window.openFB.logout(function() {
                deferred.resolve();
            });
            return deferred.promise;
        }

        function api(obj) {
            var deferred = $q.defer();
            obj.success = function(result) {
                deferred.resolve(result);
            };
            obj.error = function(error) {
                deferred.reject(error);
            };
            $window.openFB.api(obj);
            return deferred.promise;
        }

        function revokePermissions() {
            var deferred = $q.defer();
            $window.openFB.revokePermissions(
                function() {
                    deferred.resolve();
                },
                function() {
                    deferred.reject();
                }
            );
            return deferred.promise;
        }

        function getLoginStatus() {
            var deferred = $q.defer();
            $window.openFB.getLoginStatus(
                function(result) {
                    deferred.resolve(result);
                }
            );
            return deferred.promise;
        }

        return {
            init: init,
            login: login,
            logout: logout,
            revokePermissions: revokePermissions,
            api: api,
            getLoginStatus: getLoginStatus
        };

    });