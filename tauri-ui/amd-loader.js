(function (global) {
  'use strict';
  var definitions = Object.create(null);
  var modules = Object.create(null);

  function clean(id) {
    return String(id || '').replace(/\\/g, '/').replace(/\.js$/i, '');
  }

  function normalize(id, parent) {
    id = clean(id);
    if (!id || id === 'require' || id === 'exports' || id === 'module') return id;
    if (id.endsWith('.css')) return id;
    if (id.charAt(0) !== '.') return id;
    var parts = clean(parent || '').split('/');
    parts.pop();
    id.split('/').forEach(function (part) {
      if (!part || part === '.') return;
      if (part === '..') parts.pop();
      else parts.push(part);
    });
    return parts.join('/');
  }

  function locate(id) {
    if (definitions[id]) return id;
    if (definitions[id + '/index']) return id + '/index';
    if (/\/index$/.test(id) && definitions[id.slice(0, -6)]) return id.slice(0, -6);
    return id;
  }

  function instantiate(requestedId, parentId) {
    var id = locate(normalize(requestedId, parentId));
    if (id.endsWith('.css')) return {};
    if (Object.prototype.hasOwnProperty.call(modules, id)) return modules[id];
    var record = definitions[id];
    if (!record) throw new Error('AMD module not found: ' + requestedId + (parentId ? ' (from ' + parentId + ')' : ''));

    var exports = {};
    var module = { id: id, exports: exports };
    modules[id] = exports;

    function localRequire(deps, callback) {
      if (typeof deps === 'string') return instantiate(deps, id);
      var values = (deps || []).map(function (dep) { return instantiate(dep, id); });
      if (callback) callback.apply(null, values);
      return values;
    }

    var args = record.deps.map(function (dep) {
      if (dep === 'require') return localRequire;
      if (dep === 'exports') return exports;
      if (dep === 'module') return module;
      return instantiate(dep, id);
    });
    var result = typeof record.factory === 'function' ? record.factory.apply(global, args) : record.factory;
    if (result !== undefined) module.exports = result;
    modules[id] = module.exports;
    return module.exports;
  }

  global.define = function define(name, deps, factory) {
    if (typeof name !== 'string') throw new Error('Embedded AMD runtime requires named modules.');
    if (!Array.isArray(deps)) { factory = deps; deps = []; }
    definitions[clean(name)] = { deps: deps || [], factory: factory };
  };
  global.define.amd = {};

  global.require = function require(deps, callback) {
    if (typeof deps === 'string') return instantiate(deps, '');
    var values = (deps || []).map(function (dep) { return instantiate(dep, ''); });
    if (callback) callback.apply(null, values);
    return values;
  };
})(globalThis);
