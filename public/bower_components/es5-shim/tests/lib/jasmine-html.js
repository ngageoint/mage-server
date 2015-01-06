jasmine.TrivialReporter = function(doc) {
  this.document = doc || document;
  this.suiteDivs = {};
  this.logRunningSpecs = false;
};

jasmine.TrivialReporter.prototype.createDom = function(type, attrs, childrenVarArgs) {
  var el = document.createElement(type);

  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];

    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      if (child) { el.appendChild(child); }
    }
  }

  for (var attr in attrs) {
    if (attr == "cl***REMOVED***Name") {
      el[attr] = attrs[attr];
    } else {
      el.setAttribute(attr, attrs[attr]);
    }
  }

  return el;
};

jasmine.TrivialReporter.prototype.reportRunnerStarting = function(runner) {
  var showP***REMOVED***ed, showSkipped;

  this.outerDiv = this.createDom('div', { cl***REMOVED***Name: 'jasmine_reporter' },
      this.createDom('div', { cl***REMOVED***Name: 'banner' },
        this.createDom('div', { cl***REMOVED***Name: 'logo' },
            this.createDom('span', { cl***REMOVED***Name: 'title' }, "Jasmine"),
            this.createDom('span', { cl***REMOVED***Name: 'version' }, runner.env.versionString())),
        this.createDom('div', { cl***REMOVED***Name: 'options' },
            "Show ",
            showP***REMOVED***ed = this.createDom('input', { id: "__jasmine_TrivialReporter_showP***REMOVED***ed__", type: 'checkbox' }),
            this.createDom('label', { "for": "__jasmine_TrivialReporter_showP***REMOVED***ed__" }, " p***REMOVED***ed "),
            showSkipped = this.createDom('input', { id: "__jasmine_TrivialReporter_showSkipped__", type: 'checkbox' }),
            this.createDom('label', { "for": "__jasmine_TrivialReporter_showSkipped__" }, " skipped")
            )
          ),

      this.runnerDiv = this.createDom('div', { cl***REMOVED***Name: 'runner running' },
          this.createDom('a', { cl***REMOVED***Name: 'run_spec', href: '?' }, "run all"),
          this.runnerMessageSpan = this.createDom('span', {}, "Running..."),
          this.finishedAtSpan = this.createDom('span', { cl***REMOVED***Name: 'finished-at' }, ""))
      );

  this.document.body.appendChild(this.outerDiv);

  var suites = runner.suites();
  for (var i = 0; i < suites.length; i++) {
    var suite = suites[i];
    var suiteDiv = this.createDom('div', { cl***REMOVED***Name: 'suite' },
        this.createDom('a', { cl***REMOVED***Name: 'run_spec', href: '?spec=' + encodeURIComponent(suite.getFullName()) }, "run"),
        this.createDom('a', { cl***REMOVED***Name: 'description', href: '?spec=' + encodeURIComponent(suite.getFullName()) }, suite.description));
    this.suiteDivs[suite.id] = suiteDiv;
    var parentDiv = this.outerDiv;
    if (suite.parentSuite) {
      parentDiv = this.suiteDivs[suite.parentSuite.id];
    }
    parentDiv.appendChild(suiteDiv);
  }

  this.startedAt = new Date();

  var self = this;
  showP***REMOVED***ed.onclick = function(evt) {
    if (showP***REMOVED***ed.checked) {
      self.outerDiv.cl***REMOVED***Name += ' show-p***REMOVED***ed';
    } else {
      self.outerDiv.cl***REMOVED***Name = self.outerDiv.cl***REMOVED***Name.replace(/ show-p***REMOVED***ed/, '');
    }
  };

  showSkipped.onclick = function(evt) {
    if (showSkipped.checked) {
      self.outerDiv.cl***REMOVED***Name += ' show-skipped';
    } else {
      self.outerDiv.cl***REMOVED***Name = self.outerDiv.cl***REMOVED***Name.replace(/ show-skipped/, '');
    }
  };
};

jasmine.TrivialReporter.prototype.reportRunnerResults = function(runner) {
  var results = runner.results();
  var cl***REMOVED***Name = (results.failedCount > 0) ? "runner failed" : "runner p***REMOVED***ed";
  this.runnerDiv.setAttribute("cl***REMOVED***", cl***REMOVED***Name);
  //do it twice for IE
  this.runnerDiv.setAttribute("cl***REMOVED***Name", cl***REMOVED***Name);
  var specs = runner.specs();
  var specCount = 0;
  for (var i = 0; i < specs.length; i++) {
    if (this.specFilter(specs[i])) {
      specCount++;
    }
  }
  var message = "" + specCount + " spec" + (specCount == 1 ? "" : "s" ) + ", " + results.failedCount + " failure" + ((results.failedCount == 1) ? "" : "s");
  message += " in " + ((new Date().getTime() - this.startedAt.getTime()) / 1000) + "s";
  this.runnerMessageSpan.replaceChild(this.createDom('a', { cl***REMOVED***Name: 'description', href: '?'}, message), this.runnerMessageSpan.firstChild);

  this.finishedAtSpan.appendChild(document.createTextNode("Finished at " + new Date().toString()));
};

jasmine.TrivialReporter.prototype.reportSuiteResults = function(suite) {
  var results = suite.results();
  var status = results.p***REMOVED***ed() ? 'p***REMOVED***ed' : 'failed';
  if (results.totalCount === 0) { // todo: change this to check results.skipped
    status = 'skipped';
  }
  this.suiteDivs[suite.id].cl***REMOVED***Name += " " + status;
};

jasmine.TrivialReporter.prototype.reportSpecStarting = function(spec) {
  if (this.logRunningSpecs) {
    this.log('>> Jasmine Running ' + spec.suite.description + ' ' + spec.description + '...');
  }
};

jasmine.TrivialReporter.prototype.reportSpecResults = function(spec) {
  var results = spec.results();
  var status = results.p***REMOVED***ed() ? 'p***REMOVED***ed' : 'failed';
  if (results.skipped) {
    status = 'skipped';
  }
  var specDiv = this.createDom('div', { cl***REMOVED***Name: 'spec '  + status },
      this.createDom('a', { cl***REMOVED***Name: 'run_spec', href: '?spec=' + encodeURIComponent(spec.getFullName()) }, "run"),
      this.createDom('a', {
        cl***REMOVED***Name: 'description',
        href: '?spec=' + encodeURIComponent(spec.getFullName()),
        title: spec.getFullName()
      }, spec.description));


  var resultItems = results.getItems();
  var messagesDiv = this.createDom('div', { cl***REMOVED***Name: 'messages' });
  for (var i = 0; i < resultItems.length; i++) {
    var result = resultItems[i];

    if (result.type == 'log') {
      messagesDiv.appendChild(this.createDom('div', {cl***REMOVED***Name: 'resultMessage log'}, result.toString()));
    } else if (result.type == 'expect' && result.p***REMOVED***ed && !result.p***REMOVED***ed()) {
      messagesDiv.appendChild(this.createDom('div', {cl***REMOVED***Name: 'resultMessage fail'}, result.message));

      if (result.trace.stack) {
        messagesDiv.appendChild(this.createDom('div', {cl***REMOVED***Name: 'stackTrace'}, result.trace.stack));
      }
    }
  }

  if (messagesDiv.childNodes.length > 0) {
    specDiv.appendChild(messagesDiv);
  }

  this.suiteDivs[spec.suite.id].appendChild(specDiv);
};

jasmine.TrivialReporter.prototype.log = function() {
  var console = jasmine.getGlobal().console;
  if (console && console.log) {
    if (console.log.apply) {
      console.log.apply(console, arguments);
    } else {
      console.log(arguments); // ie fix: console.log.apply doesn't exist on ie
    }
  }
};

jasmine.TrivialReporter.prototype.getLocation = function() {
  return this.document.location;
};

jasmine.TrivialReporter.prototype.specFilter = function(spec) {
  var paramMap = {};
  var params = this.getLocation().search.substring(1).split('&');
  for (var i = 0; i < params.length; i++) {
    var p = params[i].split('=');
    paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
  }

  if (!paramMap.spec) {
    return true;
  }
  return spec.getFullName().indexOf(paramMap.spec) === 0;
};
