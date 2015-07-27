var elems = {};
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

var main;

var builder = (function() {

  var defaultInputAttrs = {
    className: '',
    placeholder: '',
    type: 'text'
  };

  var createQuestion = function(data, id) {
    id = '' + id;//outside?
    var question = createGenericTag('div', {className: 'question'} , {});
    question.appendChild(
      createGenericTag('label', {textContent: data.label, htmlFor: id}), {});
    data.id = id;
    if (data.tag in actions) {
      question.appendChild(actions[data.tag](data));
    }
    return question;
  };

  var createGenericTag = function(tag, attrs, defaultAttrs) {
    // if (!defaultAttrs) defaultAttrs = {};
    defaultAttrs = defaultAttrs || {};
    var elem = document.createElement(tag);
    copyAttrs(elem, defaultAttrs, attrs);
    return elem;
  }

  var createInput = function(attrs) {
    return createGenericTag('input', attrs, {type: 'text'});
  };

  var createTextArea = function(attrs) {
    return createGenericTag('textarea', attrs, {});
  };

  var createSimpleDiv = function() {
    return createGenericTag('div', {}, {});
  }

  var createOptions = function(attrs) {
    var parentDiv = createSimpleDiv();
    attrs.data.forEach(function(e, idx) {
      parentDiv.appendChild(createOption(e, idx, attrs.id, attrs.tag));
    });

    return parentDiv;
  }

  var createOption = function(data, id, name, type) {
    id = '' + id;
    var parentDiv = createSimpleDiv();
    //parameters same identation as parenthesis
    parentDiv.appendChild(
      createGenericTag('label', {textContent: data.label, htmlFor: id}, {}));
    parentDiv.appendChild(createGenericTag('input', data, 
                                          {type: type, name: name}));
    return parentDiv;
  }
  
  var createButton = function(attrs) {
    return createGenericTag('button', attrs, {});
  };

  var createLabel = function(attrs) {
    return createGenericTag('label', attrs, {});
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
  }

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
  val : function() {
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

  getSkipQuestions: function() {
    //doing to things
    if (this.skip) {

      var isRequired;

      if (isOptionType(this.tag)) {
        isRequired: false
      } else {
        isRequired = !evaluateCondition(this.skip.cond, this.skip.val, 
                                        this.val())
      }

      return {
         isRequired: isRequired,
         targets: this.skip.to
      }
    }
    return {targets: []};
  },

  setReq: function(required) {
    if (!required) {
      this.question.classList.remove('error');
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

var createBody = function(body) {
  body.forEach(function(el) {
    var newElement = builder.createQuestion(el, id);
    elems[id++] = new FakeElement(newElement, el);
    main.appendChild(newElement);
  })
};

//pass keys , and create variable to store keys
var evaluateFields = function(fields) {
  Object.keys(fields).forEach(function(k) {

    var res = fields[k].getSkipQuestions();

    res.targets.map(function(idx) {
      if (idx in fields) {
        fields[idx].setReq(res.isRequired);
      }
    });
    
  });
;

var extractValues = function(fields) {
  return Object.keys(fields).map(function(k) {
    return elems[k].val();
  })
};

var extractErrors = function(fields) {
  return Object.keys(fields).map(function(k) {
    return fields[k].getError();
  });
};

var init = function(formId, schema) {
  main = document.getElementById('main');
  var options = {};
  options.onSubmit = schema.onSubmit;
  
  main.addEventListener('submit', function(e) {
    e.preventDefault();
    var values = extractValues(elems);
    var errors = extractErrors(elems);
    console.log(values);
    console.log(errors);
    if (options.onSubmit) {
      options.onSubmit(errors, values);
    }
  });

  createBody(schema.body);

  main.appendChild(
    builder.createElement('button', {textContent: 'submit'}));
};

var schema = {
  body: [
    {label: '1 qs', tag: 'input', type: 'text', 
      skip: {
        cond: '=',
        val: 'yes',
        to: [1, 2]
      }
    }, 
    {label: '2 qs', tag: 'textarea', placeholder: 'pl'},
    {label: '3 qs', tag: 'radio', data : [ 
      {'value': '1', 'label': 'option 1'},
      {'value': '2', 'label': 'option 2'},
      {'value': '3', 'label': 'option 3'}
    ]},
    {label: '4 qs', tag: 'checkbox', data : [ 
      {'value': '4', 'label': 'option 4'},
      {'value': '5', 'label': 'option 5'},
      {'value': '6', 'label': 'option 6'}
    ]}
  ]
};

init('main', schema);
setInterval(function() {evaluateFields(elems)} , 500);
