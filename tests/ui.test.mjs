import test from 'node:test';
import assert from 'node:assert/strict';
import { setCollapsedState } from '../js/ui.js';

test('setCollapsedState toggles a collapse class and aria-expanded', () => {
  var body = {
    classList: {
      classes: [],
      toggle: function (name, force) {
        this.classes = this.classes.filter(function (item) {
          return item !== name;
        });
        if (force) {
          this.classes.push(name);
        }
      }
    }
  };
  var toggle = {
    attrs: {},
    setAttribute: function (name, value) {
      this.attrs[name] = value;
    }
  };

  setCollapsedState(body, toggle, true, 'status-collapsed');

  assert.ok(body.classList.classes.includes('status-collapsed'));
  assert.equal(toggle.attrs['aria-expanded'], 'false');
});
