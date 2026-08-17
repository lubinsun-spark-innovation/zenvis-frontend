(function (global) {
  'use strict';

  var CONTRACT_VERSION = '1.0.0';
  var RENDERER = 'amis@6.7';
  var PROFILES = ['standard', 'immersive', 'external'];
  var readyCallbacks = [];
  var currentContext = null;
  var trustedHostOrigin = null;

  function hostOrigin() {
    try {
      return document.referrer ? new URL(document.referrer).origin : trustedHostOrigin;
    } catch (_) {
      return trustedHostOrigin;
    }
  }

  function normalizeProfile(value) {
    return PROFILES.indexOf(value) >= 0 ? value : 'standard';
  }

  function applyStandardContext(context, targetDocument) {
    if (!targetDocument || !targetDocument.documentElement) return;
    if (normalizeProfile(context && context.profile) !== 'standard') return;
    var root = targetDocument.documentElement;
    root.dataset.zenvisUi = CONTRACT_VERSION;
    root.dataset.zenvisProfile = 'standard';
    root.dataset.zenvisTheme = context.themeId || 'zenvis-naive-light';
    root.dataset.zenvisThemeVersion = context.themeVersion || '1.0.0';
    root.dataset.zenvisScheme = context.colorScheme || 'light';
    root.dataset.zenvisDensity = context.density || 'compact';
    root.dataset.zenvisMotion = context.motionPreset || 'standard';
    root.style.colorScheme = context.colorScheme || 'light';
    Object.keys((context && context.tokens) || {}).forEach(function (name) {
      if (name.indexOf('--zv-') === 0) root.style.setProperty(name, context.tokens[name]);
    });
  }

  function getToken(name, target) {
    var element = target || document.documentElement;
    return global.getComputedStyle(element).getPropertyValue(name).trim();
  }

  function onReady(callback) {
    if (typeof callback !== 'function') return function () {};
    if (document.readyState === 'loading') {
      readyCallbacks.push(callback);
    } else {
      callback(api, currentContext);
    }
    return function () {
      readyCallbacks = readyCallbacks.filter(function (item) {
        return item !== callback;
      });
    };
  }

  function observeResize(target, callback) {
    if (!target || typeof callback !== 'function') return function () {};
    if ('ResizeObserver' in global) {
      var observer = new ResizeObserver(function (entries) {
        callback(entries[0] && entries[0].contentRect);
      });
      observer.observe(target);
      return function () {
        observer.disconnect();
      };
    }
    var listener = function () {
      callback(target.getBoundingClientRect());
    };
    global.addEventListener('resize', listener);
    return function () {
      global.removeEventListener('resize', listener);
    };
  }

  function postToHost(message) {
    if (global.parent === global) return;
    global.parent.postMessage(message, hostOrigin() || '*');
  }

  function emitReady() {
    document.dispatchEvent(
      new CustomEvent('zenvis:ui-ready', {
        detail: {
          contractVersion: CONTRACT_VERSION,
          renderer: RENDERER,
          profile: currentContext && currentContext.profile,
        },
      }),
    );
    readyCallbacks.splice(0).forEach(function (callback) {
      callback(api, currentContext);
    });
    postToHost({
      type: 'zenvis:plugin-ready',
      contractVersion: CONTRACT_VERSION,
      renderer: RENDERER,
      profile: currentContext && currentContext.profile,
    });
  }

  function emitError(reason) {
    postToHost({
      type: 'zenvis:plugin-error',
      contractVersion: CONTRACT_VERSION,
      reason: String(reason || 'unknown plugin error').slice(0, 500),
    });
  }

  function handleHostMessage(event) {
    if (event.source !== global.parent) return;
    if (hostOrigin() && event.origin !== hostOrigin()) return;
    if (!event.data || event.data.type !== 'zenvis:ui') return;
    trustedHostOrigin = event.origin;
    var previousContext = currentContext;
    currentContext = Object.freeze({
      contractVersion: event.data.contractVersion,
      renderer: event.data.renderer,
      profile: normalizeProfile(event.data.profile),
      locale: event.data.locale,
      timezone: event.data.timezone,
      density: event.data.density,
      reducedMotion: Boolean(event.data.reducedMotion),
      themeId: event.data.themeId,
      themeVersion: event.data.themeVersion,
      colorScheme: event.data.colorScheme === 'dark' ? 'dark' : 'light',
      motionPreset: event.data.motionPreset,
      tokenHash: event.data.tokenHash,
      tokens: Object.freeze(event.data.tokens || {}),
      capabilities: Object.freeze(event.data.capabilities || []),
      chartPalette: Object.freeze(event.data.chartPalette || {}),
    });
    applyStandardContext(currentContext, document);
    document.dispatchEvent(new CustomEvent('zenvis:ui-sync', { detail: currentContext }));
    if (previousContext) {
      document.dispatchEvent(
        new CustomEvent('zenvis:theme-update', {
          detail: currentContext,
        }),
      );
    } else {
      emitReady();
    }
  }

  var api = Object.freeze({
    version: CONTRACT_VERSION,
    contractVersion: CONTRACT_VERSION,
    renderer: RENDERER,
    colorScheme: 'light',
    applyStandardContext: applyStandardContext,
    getContext: function () {
      return currentContext;
    },
    getToken: getToken,
    observeResize: observeResize,
    onReady: onReady,
    reportError: emitError,
  });

  global.ZenVisPluginUI = api;
  global.addEventListener('message', handleHostMessage);
  global.addEventListener('error', function (event) {
    emitError(event.message);
  });
  global.addEventListener('unhandledrejection', function (event) {
    emitError(event.reason);
  });

  if (global.parent === global) {
    applyStandardContext({ profile: 'standard', tokens: {} }, document);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', emitReady, { once: true });
  } else {
    emitReady();
  }
})(window);
