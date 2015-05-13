require('es6-set/implement');

var emit = require('stereo/emit');
var on = require('stereo/on');
var when = require('stereo/when');
var snatch = require('stereo/catch');
var curry = require('1-liners/curry');

var error = require('./view/error');
var getOptions = require('./view/getOptions');
var getSwitch = require('./view/getSwitch');
var uncheckAll = require('./view/uncheckAll');

module.exports = function view(rootElement, options) {
  if (!options) options = {};
  var logger = options.logger || console;

  var channels = {};

  // Initialize the `error` channel.
  var emitError = emit();
  channels.error = Object.freeze({
    catch: snatch(emitError),
  });

  var throwError = curry(emitError)('error');

  // Find and validate internal DOM.
  var rootChildren = rootElement.children;

  var switchResult = getSwitch(rootChildren);
  if (switchResult.error) return throwError(switchResult.error);
    // TODO: Test this.
  var switchElement = switchResult.value;

  var optionsResult = getOptions(rootChildren);

  // Initialize the input channel `captionContent`.
  var emitCaptionContent = emit();
  channels.captionContent = Object.freeze({
    emit: emitCaptionContent,
    catch: snatch(emitCaptionContent),
  });

  // Initialize the input channel `unfolded`.
  var emitUnfolded = emit();
  channels.unfolded = Object.freeze({
    emit: emitUnfolded,
    catch: snatch(emitUnfolded),
  });

  // Wire up the channel `unfolded`.
  var onUnfolded = on(emitUnfolded);
  onUnfolded('update', function(message) {
    switchElement.checked = !!message.value;
  });

  // Initialize the output channel `options`.
  var emitOptions = emit();
  channels.options = Object.freeze({
    on: on(emitOptions),
    when: when(emitOptions),
    catch: snatch(emitOptions),
  });

  // Emit an initial `update` or `error` to `options`.
  var optionsSnapshot;
  if (optionsResult.error) emitOptions('error', optionsResult.error);
  else {
    optionsSnapshot = optionsResult.value;
    emitOptions('update', optionsSnapshot);
  }

  // Initialize the input channel `selection`.
  var emitSelection = emit();
  channels.selection = Object.freeze({
    emit: emitSelection,
    catch: snatch(emitSelection),
  });

  // Wire up the channel `selection`.
  var onSelection = on(emitSelection);
  onSelection('update', function(update) {
    // Throw an error if no options have been loaded.
    if (!optionsSnapshot) return throwError(error(
      'No options have been loaded. Check your markup.'
    ));
    var radioNodes = optionsSnapshot.radioNodes;

    // TODO: Can we trust the `update`? If not, throw an error if no value has
    //       been passed.

    // Uncheck all options if `null` is passed.
    var newValue = update.newValue;
    if (newValue === null) {
      return uncheckAll(radioNodes);
    }

    // Uncheck all options and throw an error if the value can’t be found.
    var valueIndex = optionsSnapshot.values.indexOf(newValue);
    if (valueIndex === -1) {
      uncheckAll(radioNodes);
      return throwError(error(
        'Value not found. Pass one of these values: [' + (
          optionsSnapshot.values
            .map(function(value) {return ('"' + value + '"');})
            .join(', ')
        ) + '].'
      ));
    }

    // Otherwise check the right value.
    radioNodes[valueIndex].checked = true;
  });

  onSelection('error', function(error) {
    // Uncheck any loaded options.
    if (optionsSnapshot) {
      uncheckAll(optionsSnapshot.radioNodes);
    }

    // Print the error’s message as a warning to the console.
    logger.warn(error.message);
  });

  // Initialize the output channel `switchElement`.
  channels.switchElement = Object.freeze({
    on: switchElement.addEventListener.bind(switchElement),
  });

  // Initialize the output channel `containerElement`.
  channels.containerElement = Object.freeze({
    on: rootElement.addEventListener.bind(rootElement),
  });

  // Return the channels.
  return Object.freeze(channels);
};
