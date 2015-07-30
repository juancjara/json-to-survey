var Survey = function() {
  var copyAttrs = function() {
    var to = arguments[0];
    var from = [].splice.call(arguments, 1);

    from.forEach(function(other) {
      Object.keys(other).forEach(function(k) {
        to[k] = other[k];
      });
    });
  };

  var values = function(dic) {
    return Object.keys(dic).map(function(k) {
      return dic[k];
    });
  };

  var flatten = function(arr) {
    return arr.reduce(function(a, b) {
      return a.concat(b);
    }, []);
  };

  var triggerEvent = function(name) {
    window.dispatchEvent(new Event(name));
  };

  var builder = (function() {
    var createQuestion = function(data, id) {
      data.id = '' + id;

      var question = createGenericTag('div', {className: 'question'});
      question.appendChild(createGenericTag('label',
                                            {textContent: data.label,
                                             htmlFor: data.id,
                                             className: 'q-title'}));

      data.className = (data.className || '') + ' q-answer';

      if (data.tag in factories) {
        question.appendChild(factories[data.tag](data));
      }

      return question;
    };

    var createGenericTag = function(tag, attrs, defaultAttrs) {
      defaultAttrs = defaultAttrs || {};
      var elem = document.createElement(tag);
      copyAttrs(elem, defaultAttrs, attrs);
      return elem;
    };

    var createInput = function(attrs) {
      return createGenericTag('input', attrs, {type: 'text'});
    };

    var createTextArea = function(attrs) {
      return createGenericTag('textarea', attrs);
    };

    var createSimpleDiv = function(attr) {
      return createGenericTag('div', attr || {});
    };

    var createOptions = function(attrs) {
      var parentDiv = createSimpleDiv();
      attrs.data.forEach(function(e, idx) {
        parentDiv.appendChild(createSingleOption(e, attrs.id + '' + idx,
                                                 attrs.id, attrs.tag));
      });

      return parentDiv;
    };

    var createSingleOption = function(data, id, name, type) {
      var parentDiv = createSimpleDiv({className: 'elem-radio-check'});

      parentDiv.appendChild(createGenericTag('input', data,
                                             {type: type, name: name, id: id}));
      parentDiv.appendChild(createGenericTag('label',
                                             {textContent: data.label,
                                              htmlFor: id}));
      return parentDiv;
    };

    var createButton = function(attrs) {
      attrs = attrs || {};
      attrs.textContent = attrs.label || 'addname';
      return createGenericTag('button', attrs);
    };

    var createLabel = function(attrs) {
      return createGenericTag('label', attrs);
    };

    var factories = {
      button: createButton,
      input: createInput,
      textarea: createTextArea,
      label: createLabel,
      radio: createOptions,
      checkbox: createOptions
    };

    var createTitle = function(attrs) {
      var tag = attrs.tag || 'div';
      attrs.textContent = attrs.label;
      return createGenericTag(tag, attrs);
    };

    var createElement = function(type, data) {
      if (type in factories) {
        return factories[type](data);
      }
      return createGenericTag(type, data);
    };

    return {
      createElement: createElement,
      createQuestion: createQuestion,
      createTitle: createTitle
    };
  })();

  var isOptionType = function(type) {
    return type === 'radio' || type === 'checkbox';
  };

  var triggerUpdate = function() {
    triggerEvent('updateElementsValue');
  };

  var FakeElement = function(question, data) {
    this.question = question;
    this.tag = data.tag;
    this.skip = data.skip;
    this.valuefields = question.childNodes[1];

    if (isOptionType(this.tag)) {
      this.valuefields =  [].map
        .call(this.valuefields.childNodes,
              function(c) {
                return c.childNodes[0];
              });

      this.valuefields.addEventListener('click', triggerUpdate);
    } else {
      this.valuefields.addEventListener('keyup', triggerUpdate);
    }

    if (data.req === undefined || data.req === null) {
      this.setReq(true);
    } else {
      this.setReq(data.req);
    }

    this.inititalRequired = this.req;
  };

  var evaluateCondition = function(cond, a, b) {
    if (cond === '=') {
      return a === b;
    } else if (cond === '<>') {
      return a !== b;
    }

    throw 'Condition not found ' + cond;
  };

  FakeElement.prototype = {
    questionsToSkip: function() {
      var questionsList = this.question.classList;

      if (questionsList.contains('error')) {
        questionsList.remove('error');

        if (this.req && !this.hasValue()) {
          questionsList.add('error');
        }
      }

      if (this.skip) {
        var skips = [].concat(this.skip);
        var valuesFromFields = [].concat(this.val());
        var groupsQuestionsToSkip = skips
              .filter(function(skip) {
                return valuesFromFields.filter(function(val) {
                  return evaluateCondition(skip.cond, skip.val, val);
                }).length > 0;
              }).map(function(m) {return m.questions;});

        return flatten(groupsQuestionsToSkip);
      }
      return [];
    },

    val: function() {
      if (Array.isArray(this.valuefields)) {
        return this.valuefields
          .filter(function(e) {
            return e.checked;
          })
          .map(function(e) {
            return e.value;
          });
      }
      return this.valuefields.value;
    },

    hasValue: function() {
      return this.val().length > 0;
    },

    resetReq: function() {
      this.setReq(this.inititalRequired);
    },

    setReq: function(required) {
      var questionsList = this.question.classList;
      if (!required) {
        questionsList.remove('error');
        questionsList.add('l-not-req');
      } else {
        questionsList.remove('l-not-req');
      }

      this.req = required;
    },

    getError: function() {
      var questionsList = this.question.classList;
      questionsList.remove('error');
      if (!this.req || this.hasValue()) {
        return false;
      }

      questionsList.add('error');
      return true;
    }
  };

  var createBody = function(domElements, questions, actionButtons) {
    var form = builder.createElement('form', {});
    var id = 0;

    questions.forEach(function(el) {
      var newElement = builder.createQuestion(el, id);
      domElements[id++] = new FakeElement(newElement, el);
      form.appendChild(newElement);
    });

    actionButtons.forEach(function(btnAttr) {
      form.appendChild(builder.createElement('button', btnAttr));
    });

    return form;
  };

  var evaluateFakeElements = function(fakeElements) {
    values(fakeElements).forEach(function(elem) {
      elem.resetReq();
    });

    values(fakeElements).forEach(function(elem) {
      elem.questionsToSkip()
        .forEach(function(idx) {
          if (idx in fakeElements) {
            fakeElements[idx].setReq(false);
          }
        });
    });
  };

  var sheet = (function() {
    var style = document.createElement("style");
    style.appendChild(document.createTextNode(""));
    document.head.appendChild(style);
    return style.sheet;
  })();

  var init = function(mainElement, schema) {
    var domElements = {};
    var options = schema.options || {};
    var onSubmit = schema.onSubmit || function() {};

    if (options.hideNotReq) {
      sheet.insertRule('.l-not-req { display: none; }', sheet.cssRules.length);
    }

    mainElement.appendChild(builder.createTitle(schema.title));

    //submitButton array, maybe have more buttons in the future
    var formElement = createBody(domElements, schema.body,
                                 [schema.submitButton]);
    mainElement.appendChild(formElement);

    formElement.addEventListener('submit', function(e) {
      e.preventDefault();
      var elemValues = values(domElements).map(function(k) {
        return k.val();
      });
      var errors = values(domElements).map(function(k) {
        return k.getError();
      });

      onSubmit(errors, elemValues);
    });

    window.addEventListener('updateElementsValue', function() {
      evaluateFakeElements(domElements);
    });
  };

  return {
    create: init
  };
};
