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
        // Excludes new line \u000A and tabulation \u0009
        return ('' + val).replace(/[\x00-\u0008\u000B-\x1F\x7F-\x9F]/g, '');
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

  function execute(data, hookOptions) {
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

        const sanitizedValue = sanitizeField(fieldValue, sanitizers);
        if (hookOptions && fieldValue !== sanitizedValue) {
          hookOptions.sanitizer = hookOptions.sanitizer || {};
          hookOptions.sanitizer[field] = fieldValue;
        }
        data[field] = sanitizedValue;
      }
    });
  }

  Model.remoteSanitize = (ctx, next) => {
    const data = ctx.args.data;
    if (!data) {
      return next();
    }

    execute({
      data,
    }, next);
  };

  Model.observe('before save', (context, next) => {
    const data = context.instance || context.data;
    if (!data) {
      return next();
    }

    function doExecute(_ctx, cb) {
      try {
        execute(data, context.hookState);
      } catch (e) {
        return cb(e);
      }
      return cb();
    }

    return Model.notifyObserversAround('sanitation', context, doExecute, next);
  });
};
