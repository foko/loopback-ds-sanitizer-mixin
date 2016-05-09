This module is designed for the [Strongloop Loopback](https://github.com/strongloop/loopback) framework.

[![license](https://img.shields.io/badge/license-Apache_2.0-blue.svg)]()
[![Build Status](https://travis-ci.org/FoKo/loopback-ds-sanitizer-mixin.svg?branch=master)](https://travis-ci.org/FoKo/loopback-ds-sanitizer-mixin)

# loopback-ds-sanitizer-mixin

Sanitize user input when persisting data.

## Options

To use with your Models add the `mixins` attribute to the definition object of your model config.

```json
  {
    "name": "Widget",
    "properties": {
      "name": {
        "type": "string"
      }
    },
    "mixins": {
      "sanitizer" : {
        "field1": INPUT_CLASS,
        "field2": INPUT_CLASS
      },
    }
  }
```

Where INPUT_CLASS must be one of:

 - oneLineString: Removes new lines, Remove control characters, trim spaces
 - multiLineString: Keeps new lines, Remove control characters, trim spaces

## INSTALL

```bash
  npm install --save loopback-ds-sanitizer-mixin
```

## MIXINSOURCES
With [loopback-boot@v2.8.0](https://github.com/strongloop/loopback-boot/)  [mixinSources](https://github.com/strongloop/loopback-boot/pull/131) have been implemented in a way which allows for loading this mixin without changes to the `server.js` file previously required.

Add the `mixins` property to your `server/model-config.json` like the following:

```json
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../node_modules/loopback-ds-sanitizer-mixin",
      "../common/mixins"
    ]
  }
}
```

## TESTING

Run the tests in `test/test.js`

```bash
  npm test
```

Run with debugging output on:

```bash
  DEBUG='loopback-ds-sanitizer-mixin' npm test
```

# VERSIONS

 - [0.0.1](https://github.com/FoKo/loopback-ds-sanitizer-mixin/releases/tag/0.0.1)

# LICENSE
[Apache-2.0](LICENSE)
