/* CivicPin shared browser helpers.
 *
 * Replaces what react-toastify, axios and @react-google-maps/api provided in
 * the Next.js app: toasts, a fetch wrapper that carries the CSRF token and
 * session cookie, and a one-shot Google Maps script loader. */

(function () {
  'use strict';

  var config = window.CIVICPIN || {};

  /* ------------------------------------------------------------- toasts -- */

  var TOAST_DURATION = 3000;

  function toast(message, kind) {
    var root = document.getElementById('toast-root');
    if (!root || !message) return;

    var el = document.createElement('div');
    el.className = 'ci-toast ci-toast--' + (kind || 'info');
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');

    var text = document.createElement('div');
    text.textContent = message;
    el.appendChild(text);

    var bar = document.createElement('div');
    bar.className = 'ci-toast__bar';
    bar.style.animationDuration = TOAST_DURATION + 'ms';
    el.appendChild(bar);

    root.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });

    window.setTimeout(function () {
      el.classList.remove('is-visible');
      window.setTimeout(function () {
        el.remove();
      }, 300);
    }, TOAST_DURATION);
  }

  toast.success = function (message) {
    toast(message, 'success');
  };
  toast.error = function (message) {
    toast(message, 'error');
  };
  toast.info = function (message) {
    toast(message, 'info');
  };

  /* ---------------------------------------------------------- api client -- */

  function csrfToken() {
    if (config.csrfToken) return config.csrfToken;
    var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function ApiError(message, status, data) {
    this.name = 'ApiError';
    this.message = message;
    this.status = status;
    this.data = data;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function errorMessage(data, fallback) {
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.error) return data.error;
    if (data.message) return data.message;
    if (data.msg) return data.msg;
    if (data.detail) return data.detail;
    if (data.errors) {
      var keys = Object.keys(data.errors);
      if (keys.length) {
        var first = data.errors[keys[0]];
        return Array.isArray(first) ? first[0] : String(first);
      }
    }
    return fallback;
  }

  async function request(method, url, body, options) {
    options = options || {};

    var headers = Object.assign({}, options.headers || {});
    if (!/^(GET|HEAD|OPTIONS)$/i.test(method)) {
      headers['X-CSRFToken'] = csrfToken();
    }

    var payload;
    if (body instanceof FormData) {
      payload = body; // let the browser set the multipart boundary
    } else if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    var response = await fetch(url, {
      method: method,
      headers: headers,
      body: payload,
      credentials: 'same-origin',
      cache: options.cache || 'default',
    });

    var data = null;
    var contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('application/json') !== -1) {
      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new ApiError(
        errorMessage(data, 'Request failed (' + response.status + ')'),
        response.status,
        data
      );
    }

    return data;
  }

  var api = {
    get: function (url, options) {
      return request('GET', url, null, options);
    },
    post: function (url, body, options) {
      return request('POST', url, body, options);
    },
    patch: function (url, body, options) {
      return request('PATCH', url, body, options);
    },
    put: function (url, body, options) {
      return request('PUT', url, body, options);
    },
    delete: function (url, options) {
      return request('DELETE', url, null, options);
    },
    ApiError: ApiError,
  };

  /* --------------------------------------------------- google maps loader -- */

  var mapsPromise = null;

  function loadGoogleMaps(libraries) {
    if (mapsPromise) return mapsPromise;

    if (!config.mapsApiKey) {
      mapsPromise = Promise.reject(
        new Error('Google Maps is not configured (GOOGLE_MAPS_API_KEY is unset).')
      );
      return mapsPromise;
    }

    if (window.google && window.google.maps && window.google.maps.Map) {
      mapsPromise = Promise.resolve(window.google.maps);
      return mapsPromise;
    }

    mapsPromise = new Promise(function (resolve, reject) {
      var callbackName = '__civicpinMapsReady';
      window[callbackName] = function () {
        resolve(window.google.maps);
        delete window[callbackName];
      };

      var script = document.createElement('script');
      var libs = (libraries || ['places']).join(',');
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(config.mapsApiKey) +
        '&libraries=' +
        encodeURIComponent(libs) +
        '&loading=async&callback=' +
        callbackName;
      script.async = true;
      script.defer = true;
      script.onerror = function () {
        reject(new Error('Failed to load Google Maps.'));
      };
      document.head.appendChild(script);
    });

    return mapsPromise;
  }

  /* ----------------------------------------------------------- utilities -- */

  function formatDate(value, options) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(
      undefined,
      options || { year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

  function formatDateTime(value) {
    if (!value) return '';
    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : date.toLocaleString();
  }

  function titleCase(value) {
    if (!value) return '';
    return String(value)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      });
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function formatCurrency(value) {
    var num = Number(value);
    if (isNaN(num)) return String(value || '');
    return '₹' + num.toLocaleString('en-IN');
  }

  function spinner(text) {
    return (
      '<div class="flex items-center justify-center py-12">' +
      '<div class="spinner h-12 w-12"></div>' +
      '<span class="ml-4 text-lg text-gray-300">' +
      escapeHtml(text || 'Loading...') +
      '</span></div>'
    );
  }

  /* ------------------------------------------------------------- loading -- */

  function hideLoader(id) {
    var el = document.getElementById(id || 'page-loader');
    if (el) el.remove();
  }

  /* --------------------------------------------- expose the public surface -- */

  window.CI = {
    config: config,
    api: api,
    toast: toast,
    loadGoogleMaps: loadGoogleMaps,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    titleCase: titleCase,
    escapeHtml: escapeHtml,
    formatCurrency: formatCurrency,
    spinner: spinner,
    hideLoader: hideLoader,
  };
})();
