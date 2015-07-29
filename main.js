var survey = function() {
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
    return Object.keys(dic).map(function(k) {return dic[k];});
  };

  var flatten = function(arr) {
    return arr.reduce(function(a, b) {return a.concat(b);}, []);
  };

  var evaluateCondition = function(cond, a, b) {
    if (cond === '=') {
      return a === b;
    }
    if (cond === '<>') {
      return a !== b;
    }
    throw 'Condition not found ' + cond;
  };

  var triggerEvent = function(name) {
    window.dispatchEvent(new Event(name));
  };

  var builder = (function() {

    var createQuestion = function(data, id) {
      id = '' + id;
      var question = createGenericTag('div', {className: 'question'});
      question.appendChild(createGenericTag('label', 
                                            {textContent: data.label,
                                              htmlFor: id,
                                              className: 'q-title'}));
      data.id = id;
      if (!data.className) {
        data.className = '';
      }
      data.className +=' q-answer';
      if (data.tag in actions) {
        question.appendChild(actions[data.tag](data));
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
      attr = attr || {};
      return createGenericTag('div', attr);
    };

    var createOptions = function(attrs) {
      var parentDiv = createSimpleDiv();
      attrs.data.forEach(function(e, idx) {
        parentDiv.appendChild(createOption(e, attrs.id + '' + idx,
                                           attrs.id, attrs.tag));
      });

      return parentDiv;
    };

    var createOption = function(data, id, name, type) {
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
    
    var actions = {
      'button': createButton,
      'input': createInput,
      'textarea': createTextArea,
      'label': createLabel,
      'radio': createOptions,
      'checkbox': createOptions
    };
    
    var createTitle = function(attrs) {
      var tag = attrs.tag || 'div';
      attrs.textContent = attrs.label;
      return createGenericTag(tag, attrs);
    };

    var createElement = function(type, data) {
      if (type in actions) {
        return actions[type](data); 
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
    this.req;
    if (isOptionType(this.tag)) {
      this.valuefields.addEventListener('click', triggerUpdate);

      this.valuefields =  [].map
        .call(this.valuefields.childNodes, 
              function(c) {
                return c.childNodes[0];
              });

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

  FakeElement.prototype = {

    val: function() {
      if (Array.isArray(this.valuefields)) {
        
        return this.valuefields
          .filter(function(e) {return e.checked;})
          .map(function(e) {return e.value;});  
      }
      return this.valuefields.value;
    },

    hasValue: function() {
      return this.val().length > 0;
    },

    questionsToSkip: function() {

      if (this.question.classList.contains('error')) {

        this.question.classList.remove('error');
        if (this.req && !this.hasValue()) {
          this.question.classList.add('error');
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

    resetReq: function() {
      this.setReq(this.inititalRequired);
    },

    setReq: function(required) {
      if (!required) {
        this.question.classList.remove('error');
        this.question.classList.add('l-not-req');
      } else {
        this.question.classList.remove('l-not-req');
      }

      this.req = required;
    },

    getError: function() {
      this.question.classList.remove('error');
      if (!this.req || this.hasValue()) return false;
      this.question.classList.add('error');
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

    //submitButton array, maybe in the future it can be many buttons
    mainElement.appendChild(builder.createTitle(schema.title));

    var formElement = createBody(domElements, schema.body,
                                 [schema.submitButton]);
    mainElement.appendChild(formElement);

    formElement.addEventListener('submit', function(e) {
      e.preventDefault();
      var elemValues = values(domElements).map(function(k) {return k.val();});
      var errors = values(domElements).map(function(k) {return k.getError();});
      
      onSubmit(errors, elemValues);
    });

    window.addEventListener('updateElementsValue', function() {
      evaluateFakeElements(domElements);
    });
  };

  return {
    create: init
  }

};