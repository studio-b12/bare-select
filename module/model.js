var øEmit = require('stereo/emit');
var øOn = require('stereo/on');
var øWhen = require('stereo/when');
var asObject = require('as/object');
var asap = require('set-immediate-shim');
var shallowDiff = require('shallow-diff');

function attributeUpdater(args) {

  // Read args.
  var emitter = args.emitter;
  var attributesObject = args.attributesObject;

  // Make sure we emit one event for batch attribute updates.
  var executedInThisLoop = false;
  function resetLoop() {executedInThisLoop = false;}

  // Keep a snapshot of attributes to detect change next time.
  var attributesSnapshot = {};

  return function emitUpdate() {
    if (executedInThisLoop) return;
    executedInThisLoop = true;
    asap(resetLoop);

    // Parse current attributes.
    // TODO: Split it out into another module.
    var attributesArray = Array.prototype.slice.call(attributesObject);
    var currentAttributes = Object.freeze(asObject(
      attributesArray.map(function (attribute) {
        return {
          key: attribute.name,
          value: attribute.value,
        };
      })
    ));

    // Diff them against the snapshot.
    var diff = shallowDiff(attributesSnapshot, currentAttributes);

    // Emit an update message. See the specs for more info.
    emitter(
      []
        .concat(diff.updated)
        .concat(diff.deleted)
        .concat(diff.added)
      ,
      Object.freeze({
        attributes: currentAttributes,
      })
    );

    // Update the snapshot.
    attributesSnapshot = currentAttributes;
  };
}

module.exports = function model(rootElement) {

  // Initialize the input channel `patches`.
  var patches = Object.freeze({
    emit: øEmit(),
  });

  // Initialize the output channel `updates`.
  var emitUpdates = øEmit();
  var updates = Object.freeze({
    on: øOn(emitUpdates),
    when: øWhen(emitUpdates),
  });
  var emitCurrentAttributes = attributeUpdater({
    emitter: emitUpdates,
    attributesObject: rootElement.attributes,
  });

  // Emit initial messages to `updates`.
  emitCurrentAttributes();

  // Export channels and `attributeChangedCallback`.
  return Object.freeze({
    patches: patches,
    updates: updates,
    attributeChangedCallback: emitCurrentAttributes,
  });
};