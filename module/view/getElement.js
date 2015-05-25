var error = require('./error');

module.exports = function(args) {

  // Required args:
  var root = args.root;
  var selector = args.selector;
  var elementName = args.elementName;

  // Optional args:
  var multiple = (args.multiple ? true : false);

  // Find the element/elements.
  var result = (multiple ?
    root.querySelectorAll(selector) :
    root.querySelector(selector)
  );

  if (multiple ?
    !result.length :
    !result
  ) return {error: error(
    'We can’t find ' +
    (multiple ? 'any ' : 'the ') + elementName + ' ' +
    'element. It should match the selector `' +
    selector +
    '`. Make sure there ' +
    (multiple ? 'are such elements ' : 'is such an element ') +
    'in your `<bare-select>`.'
  )};

  else return {value: result};
};
