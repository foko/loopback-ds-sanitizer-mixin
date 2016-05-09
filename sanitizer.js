'use strict';

const debug = require('debug')('loopback-ds-sanitizer-mixin');

module.exports = function sanitizerMixin(Model, options) {
  debug('Sanitizer mixin for Model [%s]', Model.modelName);

  options = options || {};

  const INPUT_CLASSES = {
    oneLineString: {
      trimSpaces: true,
      removeNewLines: true,
      removeUnicodeControlCharacters: true,
    },
    multiLineString: {
      trimSpaces: true,
      removeUnicodeControlCharacters: true,
    },
  };

  const SANITIZERS = {
    trimSpaces: {
      priority: 0,
      action(val) {
        return ('' + val).trim(); // Also trims \n
      },
    },
    removeNewLines: {
      priority: 10,
      action(val) {
        return ('' + val)
          .replace(/\r|\n$/g, '')
          .replace(/ *\n */g, ' ');
      },
    },
    removeUnicodeControlCharacters: {
      priority: 20,
      action(val) {
        return ('' + val).replace(/[\x00-\u0009\u000B-\x1F\x7F-\x9F]/g, ''); // Excludes new line \u000A
      },
    },
  };

  function sanitizeField(value, sanitizers) {
    let val = value;
    if (val) {
      const sanitizersForField = [];
      Object.keys(sanitizers).forEach((sanitizerName) => {
        const sanitizer = SANITIZERS[sanitizerName];
        if (sanitizer) {
          sanitizersForField.push(sanitizer);
        } else {
          throw new Error(`Unknown sanitizer ${sanitizerName} for field ${Model.modelName}`);
        }
      });
      sanitizersForField.sort((a, b) => b.priority - a.priority).forEach((sanitizer) => {
        val = sanitizer.action(val);
      });
    }
    return val;
  }

  // Allow programmatic field sanitazing.
  if (!Model.sanitizeField) {
    Model.sanitizeField = sanitizeField;
  }

  Model.observe('before save', function event(context, next) {
    const data = context.instance || context.data;
    if (!data) {
      return next();
    }

    try {
      Object.keys(options).forEach((field) => {
        const fieldValue = data[field];
        const fieldOptions = options[field];
        if (fieldValue && typeof fieldValue === 'string' && fieldOptions) {
          const sanitizers = {};
          if (typeof fieldOptions === 'string') {
            if (!INPUT_CLASSES[fieldOptions]) {
              throw new Error(`Unknown inputClass ${fieldOptions} for field ${Model.modelName}`);
            }
            Object.assign(sanitizers, INPUT_CLASSES[fieldOptions] || {});
          } else {
            Object.keys(fieldOptions).forEach((keyName) => {
              // Expand inputClass sanitizers
              if (keyName === 'inputClass') {
                if (!INPUT_CLASSES[fieldOptions.inputClass]) {
                  throw new Error(`Unknown inputClass ${fieldOptions} for field ${Model.modelName}`);
                }
                Object.assign(sanitizers, INPUT_CLASSES[fieldOptions.inputClass] || {});
              } else {
                sanitizers[keyName] = fieldOptions[keyName];
              }
            });
          }
          data[field] = sanitizeField(fieldValue, sanitizers);
        }
      });
    } catch (e) {
      return next(e);
    }

    next();
  });
};
