var domElements = {};
var id = 0;

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
  return Object.keys(dic).map(function(k) {return dic[k]});
};

var flatten = function(arr) {
  return arr.reduce(function(a, b) {return a.concat(b)}, []);
};

var builder = (function() {

  var defaultInputAttrs = {
    className: '',
    placeholder: '',
    type: 'text'
  };

  var createQuestion = function(data, id) {
    id = '' + id;
    var question = createGenericTag('div', {className: 'question'});
    question.appendChild(createGenericTag('label', 
                                          {textContent: data.label,
                                            htmlFor: id}));
    data.id = id;
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

  var createSimpleDiv = function() {
    return createGenericTag('div', {});
  };

  var createOptions = function(attrs) {
    var parentDiv = createSimpleDiv();
    attrs.data.forEach(function(e, idx) {
      parentDiv.appendChild(createOption(e, idx, attrs.id, attrs.tag));
    });

    return parentDiv;
  };

  var createOption = function(data, id, name, type) {
    id = '' + id;
    var parentDiv = createSimpleDiv();

    parentDiv.appendChild(createGenericTag('label', 
                                           {textContent: data.label,
                                            htmlFor: id}));
    parentDiv.appendChild(createGenericTag('input', data, 
                                           {type: type, name: name}));
    return parentDiv;
  };
  
  var createButton = function(attrs) {
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
  
  var createElement = function(type, data) {
    if (type in actions) {
      return actions[type](data); 
    }
  };

  return {
    createElement: createElement,
    createQuestion: createQuestion
  };
})();

var evaluateCondition = function(cond, a, b) {
  if (cond === '=') {
    return a === b;
  }
  if (cond === '<>') {
    return a !== b;
  }
};

var isOptionType = function(type) {
  return type === 'radio' || type === 'checkbox';
}

var FakeElement = function(question, data) {
  this.question = question;
  this.tag = data.tag;
  this.req = data.req || true;
  this.inititalRequired = this.req;
  this.skip = data.skip;
  this.valuefields = question.childNodes[1];

  if (isOptionType(this.tag)) {

    this.valuefields =  [].map
      .call(this.valuefields.childNodes, 
            function(c) {
              return c.childNodes[1];
            });
  }
};

FakeElement.prototype = {

  val: function() {
    if (Array.isArray(this.valuefields)) {
      return this.valuefields
        .filter(function(e) {return e.checked})
        .map(function(e) {return e.value});  
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

    if (this.skip){
      var skips = [].concat(this.skip);
      var valuesFromFields = [].concat(this.val());

      var groupsQuestionsToSkip = skips.filter(function(skip) {
          return valuesFromFields.filter(function(val) {
            return evaluateCondition(skip.cond, skip.val, val);
          }).length > 0;
        }).map(function(m) {return m.questions});

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
      //this.question.style.display = 'none';
    } else {
      //this.question.style.display = 'block';
      //console.log();
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

var createBody = function(domElements, body, mainElement) {
  body.forEach(function(el) {
    var newElement = builder.createQuestion(el, id);
    domElements[id++] = new FakeElement(newElement, el);
    mainElement.appendChild(newElement);
  })
};

var evaluateFakeElements = function(fakeElements) {

  values(fakeElements).forEach(function(elem) {
    elem.resetReq(true);
  })

  values(fakeElements).forEach(function(elem) {

    elem.questionsToSkip()
      .map(function(idx) {
        if (idx in fakeElements) {
          fakeElements[idx].setReq(false);
        }
      });
    
  });  
};

var init = function(formId, schema) {
  var main = document.getElementById('main');
  var options = {};
  options.onSubmit = schema.onSubmit;
  
  main.addEventListener('submit', function(e) {
    e.preventDefault();
    var elemValues = values(domElements).map(function(k) {return k.val();});
    var errors = values(domElements).map(function(k) {return k.getError();});

    console.log(elemValues);
    console.log(errors);

    if (options.onSubmit) {
      options.onSubmit(errors, elemValues);
    }
  });

  createBody(domElements, schema.body, main);
  main.appendChild(builder.createElement('button', {textContent: 'submit'}));
};

var schema = {
  body: [
    {label: '1 qs', tag: 'input', type: 'text'}, 

    {label: '2 qs', tag: 'textarea', placeholder: 'pl'},

    {label: '3 qs', tag: 'radio', 
     data : [ 
      {'value': '1', 'label': 'option 1'},
      {'value': '2', 'label': 'option 2'},
      {'value': '3', 'label': 'option 3'}
     ],
     skip: [
      {val: '1', cond: '=', questions: [0]},
      {val: '2', cond: '=', questions: [1]},
      {val: '3', cond: '=', questions: [4]}
     ]
    },
    {label: '4 qs', tag: 'checkbox', data : [ 
      {'value': '4', 'label': 'option 4'},
      {'value': '5', 'label': 'option 5'},
      {'value': '6', 'label': 'option 6'}
    ]},
    {label: '5 qs', tag: 'textarea', placeholder: 'pl'}
  ]
};

init('main', schema);

setInterval(function() {evaluateFakeElements(domElements)} , 200);

