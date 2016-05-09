'use strict';

const expect = require('chai').expect;
const app = require('loopback');

// https://github.com/strongloop/loopback-boot/blob/master/lib/executor.js#L57-L71
// the loopback-boot module patches in the loopback attribute so we can assume the same
app.loopback = require('loopback');

const dataSource = app.createDataSource({
  connector: app.Memory
});

function registerMixin(name, func) {
  var modelBuilder = (app.registry || app.loopback).modelBuilder;

  modelBuilder.mixins.define(name, func);
}

registerMixin('sanitizer', require('../sanitizer'));

function testInput(sanitizerName, Model, propName, beforeValue, afterValue) {
  function build(val) {
    const obj = {};
    obj[propName] = val;
    return obj;
  }

  describe(sanitizerName, () => {
    it('create', (done) => {
      Model.destroyAll(() => {
        Model.create(build(beforeValue), (err, createdBook) => {
          if (err) {
            return done(err);
          }
          expect(createdBook[propName]).to.equal(afterValue);
          done();
        });
      });
    });

    it('update', (done) => {
      Model.destroyAll(() => {
        Model.create(build('random input'), (err, createdBook) => {
          if (err) {
            return done(err);
          }

          createdBook[propName] = beforeValue;
          createdBook.save((err, savedBook) => {
            if (err) {
              return done(err);
            }
            expect(savedBook[propName]).to.equal(afterValue);
            done();
          });
        });
      });
    });

    it('updateAttributes', (done) => {
      Model.destroyAll(() => {
        Model.create(build('random input'), (err, createdBook) => {
          if (err) {
            return done(err);
          }

          createdBook.updateAttributes(build(beforeValue), (err, updatedBook) => {
            if (err) {
              return done(err);
            }
            expect(updatedBook[propName]).to.equal(afterValue);
            done();
          });
        });
      });
    });

    it('bulkUpdate', (done) => {
      Model.destroyAll(() => {
        Model.create(build('random input'), (err, createdBook) => {
          if (err) {
            return done(err);
          }

          Model.updateAll(build('random input'), build(beforeValue), (err) => {
            if (err) {
              return done(err);
            }

            Model.findById(createdBook.id, (err, bookFound) => {
              if (err) {
                return done(err);
              }
              expect(bookFound[propName]).to.equal(afterValue);
              done();
            });
          });
        });
      });
    });
  });
}

describe('Loopback Datasource sanitizer', () => {
  const Book = dataSource.createModel('Book', {
    name: String,
  }, {
    mixins: {
      sanitizer: {
        name: {
          trimSpaces: true, // Trim spaces before and after content
          removeNewLines: true, // Replace all new lines in content
          removeUnicodeControlCharacters: true, // Remove all unicode control characters
        },
        description: 'multiLineString',
        author: {
          inputClass: 'oneLineString',
        },
      },
    }
  });

  describe('default sanitizing', () => {
    describe('name', () => {
      testInput('trimSpaces', Book, 'name', ' book 1 ', 'book 1');
      testInput('removeNewLines', Book, 'name', ' book\n\r1 ', 'book 1');
      testInput('removeUnicodeControlCharacters', Book, 'name', 'book1\u0000', 'book1');
      testInput('removeUnicodeControlCharacters', Book, 'name', 'book1 😀', 'book1 😀');
    });

    describe('description', () => {
      testInput('multiLineString', Book, 'description', 'book\n1', 'book\n1');
      // \n are trimmed by js string trim
      testInput('multiLineString', Book, 'description', 'book\n1\n', 'book\n1');
      testInput('multiLineString', Book, 'description', 'book\n 1', 'book\n 1');
    });

    describe('author', () => {
      testInput('trimSpaces', Book, 'author', ' Alex ', 'Alex');
    });
  });

  describe('special cases', () => {
    function expectSanitized(sanitizer, value, expected) {
      expect(Book.sanitizeField(value, sanitizer)).to.equal(expected);
    }
    it('removeNewLines', () => {
      const sanitizers = {
        removeNewLines: true,
      };
      expectSanitized(sanitizers, 'book\n1', 'book 1');
      expectSanitized(sanitizers, 'book\n\r1', 'book 1');
      expectSanitized(sanitizers, 'book\n1\n', 'book 1');
      expectSanitized(sanitizers, 'book\n 1', 'book 1');
    });


    it('removeUnicodeControlCharacters', () => {
      const sanitizers = {
        removeUnicodeControlCharacters: true,
      };
      expectSanitized(sanitizers, 'book1\u0000', 'book1');
      expectSanitized(sanitizers, 'book1 😀', 'book1 😀');
    });
  });
});
