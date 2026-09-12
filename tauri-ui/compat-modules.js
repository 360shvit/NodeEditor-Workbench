(function (global) {
  'use strict';
  var P = global.PreactLite;
  if (!P) throw new Error('PreactLite must load before compatibility modules.');

  var currentComponent = null;
  var hookIndex = 0;
  var previousBeforeRender = P.options.__r;
  var previousDiffed = P.options.diffed;
  var previousUnmount = P.options.unmount;

  P.options.__r = function (vnode) {
    if (previousBeforeRender) previousBeforeRender(vnode);
    currentComponent = vnode.__c || null;
    hookIndex = 0;
  };


  function flushLayoutEffects(component) {
    if (!component || !component.__hytalePendingLayoutEffects || !component.__hytalePendingLayoutEffects.length) return;
    var pending = component.__hytalePendingLayoutEffects || [];
    component.__hytalePendingLayoutEffects = [];
    pending.forEach(function (hook) {
      if (!hook.__pendingLayoutEffect) return;
      var effect = hook.__pendingLayoutEffect;
      hook.__pendingLayoutEffect = null;
      if (typeof hook.cleanup === 'function') {
        try { hook.cleanup(); } catch (error) { setTimeout(function () { throw error; }, 0); }
      }
      var cleanup = effect();
      hook.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
    });
  }

  function flushEffects(component) {
    if (!component || component.__hytaleEffectScheduled || !component.__hytalePendingEffects || !component.__hytalePendingEffects.length) return;
    component.__hytaleEffectScheduled = true;
    Promise.resolve().then(function () {
      component.__hytaleEffectScheduled = false;
      var pending = component.__hytalePendingEffects || [];
      component.__hytalePendingEffects = [];
      pending.forEach(function (hook) {
        if (!hook.__pendingEffect) return;
        var effect = hook.__pendingEffect;
        hook.__pendingEffect = null;
        if (typeof hook.cleanup === 'function') {
          try { hook.cleanup(); } catch (error) { setTimeout(function () { throw error; }, 0); }
        }
        var cleanup = effect();
        hook.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
      });
    });
  }

  P.options.diffed = function (vnode) {
    if (previousDiffed) previousDiffed(vnode);
    flushLayoutEffects(vnode.__c);
    flushEffects(vnode.__c);
  };

  P.options.unmount = function (vnode) {
    var component = vnode.__c;
    if (component && component.__hytaleHooks) {
      component.__hytaleHooks.forEach(function (hook) {
        if (hook && typeof hook.cleanup === 'function') {
          try { hook.cleanup(); } catch (error) { setTimeout(function () { throw error; }, 0); }
        }
      });
    }
    if (previousUnmount) previousUnmount(vnode);
  };

  function getHook() {
    if (!currentComponent) throw new Error('Hooks can only be used while rendering a component.');
    var hooks = currentComponent.__hytaleHooks || (currentComponent.__hytaleHooks = []);
    var slot = hooks[hookIndex];
    if (!slot) slot = hooks[hookIndex] = {};
    hookIndex += 1;
    return slot;
  }

  function depsChanged(previous, next) {
    if (next === undefined || previous === undefined) return true;
    if (previous === null || next === null || previous.length !== next.length) return true;
    for (var i = 0; i < next.length; i += 1) if (!Object.is(previous[i], next[i])) return true;
    return false;
  }

  function useState(initialValue) {
    var hook = getHook();
    if (!hook.initialized) {
      hook.initialized = true;
      hook.value = typeof initialValue === 'function' ? initialValue() : initialValue;
      hook.owner = currentComponent;
      hook.setValue = function (nextValue) {
        var resolved = typeof nextValue === 'function' ? nextValue(hook.value) : nextValue;
        if (Object.is(resolved, hook.value)) return;
        hook.value = resolved;
        if (hook.owner && hook.owner.setState) hook.owner.setState({});
      };
    }
    return [hook.value, hook.setValue];
  }

  function useMemo(factory, deps) {
    var hook = getHook();
    if (!hook.initialized || depsChanged(hook.deps, deps)) {
      hook.initialized = true;
      hook.deps = deps;
      hook.value = factory();
    }
    return hook.value;
  }

  function useCallback(callback, deps) {
    return useMemo(function () { return callback; }, deps);
  }

  function useContext(context) {
    var hook = getHook();
    var contextMap = currentComponent && currentComponent.context;
    var provider = contextMap && context ? contextMap[context.__c] : undefined;
    if (!hook.initialized || hook.provider !== provider) {
      hook.initialized = true;
      hook.provider = provider;
      if (provider && typeof provider.sub === 'function') provider.sub(currentComponent);
    }
    return provider ? provider.props.value : context.__;
  }

  function useRef(initialValue) {
    var hook = getHook();
    if (!hook.initialized) {
      hook.initialized = true;
      hook.value = { current: initialValue };
    }
    return hook.value;
  }

  function useEffect(effect, deps) {
    var hook = getHook();
    if (!hook.initialized || depsChanged(hook.deps, deps)) {
      hook.initialized = true;
      hook.deps = deps;
      hook.__pendingEffect = effect;
      var pending = currentComponent.__hytalePendingEffects || (currentComponent.__hytalePendingEffects = []);
      if (pending.indexOf(hook) < 0) pending.push(hook);
    }
  }

  function useLayoutEffect(effect, deps) {
    var hook = getHook();
    if (!hook.initialized || depsChanged(hook.deps, deps)) {
      hook.initialized = true;
      hook.deps = deps;
      hook.__pendingLayoutEffect = effect;
      var pending = currentComponent.__hytalePendingLayoutEffects || (currentComponent.__hytalePendingLayoutEffects = []);
      if (pending.indexOf(hook) < 0) pending.push(hook);
    }
  }

  function normalizeReactDomProps(type, props) {
    if (!props || (type !== 'input' && type !== 'textarea')) return props;
    if (typeof props.onChange !== 'function') return props;

    var inputType = type === 'input' ? String(props.type || 'text').toLowerCase() : 'textarea';
    // React's onChange for value-editing controls is intentionally live (input event),
    // unlike the browser's native change event which fires on blur for text-like fields.
    // Keep native change semantics for controls where React also expects a committed change.
    if (type === 'input' && (inputType === 'checkbox' || inputType === 'radio' || inputType === 'file')) return props;

    var next = Object.assign({}, props);
    var reactOnChange = next.onChange;
    var existingOnInput = next.onInput;
    delete next.onChange;
    next.onInput = function (event) {
      if (typeof existingOnInput === 'function') existingOnInput(event);
      reactOnChange(event);
    };
    return next;
  }

  function reactCreateElement(type, props) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = normalizeReactDomProps(type, props);
    return P.createElement.apply(P, args);
  }

  var React = {
    Children: {
      toArray: P.toChildArray,
      count: function (children) { return P.toChildArray(children).length; },
      only: function (children) { var values = P.toChildArray(children); if (values.length !== 1) throw new Error('Expected exactly one child.'); return values[0]; },
      map: function (children, fn) { return P.toChildArray(children).map(fn); },
      forEach: function (children, fn) { P.toChildArray(children).forEach(fn); }
    },
    Component: P.Component,
    Fragment: P.Fragment,
    StrictMode: P.Fragment,
    createElement: reactCreateElement,
    cloneElement: P.cloneElement,
    createContext: P.createContext,
    createRef: P.createRef,
    isValidElement: P.isValidElement,
    useState: useState,
    useMemo: useMemo,
    useCallback: useCallback,
    useContext: useContext,
    useRef: useRef,
    useEffect: useEffect,
    useLayoutEffect: useLayoutEffect
  };

  define('react', [], function () {
    var exports = { __esModule: true, default: React };
    Object.keys(React).forEach(function (key) { exports[key] = React[key]; });
    return exports;
  });

  define('react/jsx-runtime', [], function () {
    function jsx(type, props, key) {
      var next = props || {};
      if (key !== undefined) {
        next = Object.assign({}, next);
        next.key = key;
      }
      return P.createElement(type, normalizeReactDomProps(type, next));
    }
    return { __esModule: true, Fragment: P.Fragment, jsx: jsx, jsxs: jsx };
  });

  function PortalBridge(props) {
    useEffect(function () {
      P.render(props.children, props.container);
    });
    useEffect(function () {
      return function () { P.render(null, props.container); };
    }, [props.container]);
    return null;
  }

  function createPortal(children, container) {
    return P.createElement(PortalBridge, { container: container, children: children });
  }

  define('react-dom', [], function () {
    var api = { createPortal: createPortal };
    return { __esModule: true, default: api, createPortal: createPortal };
  });

  define('react-dom/client', [], function () {
    var api = {
      createRoot: function (container) {
        return {
          render: function (node) { P.render(node, container); },
          unmount: function () { P.render(null, container); }
        };
      }
    };
    return { __esModule: true, default: api, createRoot: api.createRoot };
  });

  define('zustand', ['react'], function (reactModule) {
    var ReactApi = reactModule.default || reactModule;
    function create(initializer) {
      var state;
      var listeners = new Set();
      function setState(partial, replace) {
        var next = typeof partial === 'function' ? partial(state) : partial;
        if (next === undefined || next === state) return;
        state = replace ? next : Object.assign({}, state, next);
        listeners.forEach(function (listener) { listener(state); });
      }
      function getState() { return state; }
      function subscribe(listener) { listeners.add(listener); return function () { listeners.delete(listener); }; }
      state = initializer(setState, getState, { setState: setState, getState: getState, subscribe: subscribe });

      function useStore(selector) {
        selector = selector || function (value) { return value; };
        var selectorRef = ReactApi.useRef(selector);
        selectorRef.current = selector;
        var pair = ReactApi.useState(function () { return selector(state); });
        var slice = pair[0];
        var setSlice = pair[1];
        ReactApi.useEffect(function () {
          function update() {
            setSlice(function (previous) {
              var next = selectorRef.current(state);
              return Object.is(previous, next) ? previous : next;
            });
          }
          update();
          return subscribe(update);
        }, []);
        return slice;
      }
      useStore.getState = getState;
      useStore.setState = setState;
      useStore.subscribe = subscribe;
      return useStore;
    }
    return { __esModule: true, create: create };
  });
})(globalThis);
