/* Demand detail page: details, map, upvote, comments and the AI analysis.
 * Ports app/viewrequest/page.js. The Gemini call now goes through our own
 * /api/demand/<id>/analysis endpoint, so the API key stays on the server. */

(function () {
  'use strict';

  const { api, toast, config, escapeHtml, titleCase, formatDate, formatDateTime } =
    window.CI;

  const demandId =
    config.demandId ||
    new URLSearchParams(window.location.search).get('id') ||
    '';

  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const errorMessage = document.getElementById('error-message');
  const content = document.getElementById('content');

  let demand = null;

  function showError(message) {
    loadingState.classList.add('hidden');
    content.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorState.classList.add('flex');
    errorMessage.textContent = message;
  }

  /* ------------------------------------------------------------- render -- */

  function renderComments() {
    const list = document.getElementById('comment-list');
    const comments = demand.comments || [];

    document.getElementById('stat-comments').textContent = comments.length;

    if (!comments.length) {
      list.innerHTML =
        '<p class="text-gray-500 py-4">No comments yet — be the first to weigh in.</p>';
      return;
    }

    list.innerHTML = comments
      .map(
        (comment) =>
          '<div class="bg-gray-800 rounded-xl p-4 border border-gray-700">' +
          '<div class="flex flex-wrap justify-between gap-2 mb-2">' +
          '<span class="font-semibold text-indigo-300">' +
          escapeHtml(comment.userName || comment.user) +
          '</span>' +
          '<span class="text-sm text-gray-500">' +
          escapeHtml(formatDateTime(comment.timestamp)) +
          '</span></div>' +
          '<p class="text-gray-200 break-words whitespace-pre-line">' +
          escapeHtml(comment.text) +
          '</p></div>'
      )
      .join('');
  }

  function renderShareLinks() {
    const url = window.location.href;
    const title = demand.title;

    document.getElementById('share-twitter').href =
      'https://twitter.com/intent/tweet?text=' +
      encodeURIComponent('Check out this demand: ' + title) +
      '&url=' +
      encodeURIComponent(url);

    document.getElementById('share-linkedin').href =
      'https://www.linkedin.com/shareArticle?mini=true&url=' +
      encodeURIComponent(url) +
      '&title=' +
      encodeURIComponent(title);

    document.getElementById('share-whatsapp').href =
      'https://wa.me/?text=' +
      encodeURIComponent(title) +
      '%0A%0A' +
      encodeURIComponent(url);

    document.getElementById('share-email').href =
      'mailto:?subject=' +
      encodeURIComponent('Check out this demand: ' + title) +
      '&body=' +
      encodeURIComponent(
        'I found this interesting demand on CivicPin:\n\n' +
          title +
          '\n' +
          url
      );
  }

  function render() {
    const coords = (demand.location && demand.location.coordinates) || [0, 0];

    document.title = demand.title + ' - CivicPin';
    document.getElementById('demand-title').textContent = demand.title;
    document.getElementById('demand-category').textContent = titleCase(
      demand.category
    );
    document.getElementById('demand-status').textContent = titleCase(
      demand.status
    );
    document.getElementById('demand-created').textContent =
      'Created: ' + formatDate(demand.createdAt);
    document.getElementById('demand-description').textContent =
      demand.description;
    document.getElementById('demand-coords').textContent =
      coords[1] + ', ' + coords[0];

    document.getElementById('upvote-count').textContent = demand.up_votes;
    document.getElementById('stat-upvotes').textContent = demand.up_votes;
    document.getElementById('timeline-created').textContent = formatDate(
      demand.createdAt
    );
    document.getElementById('timeline-updated').textContent = formatDate(
      demand.updatedAt
    );
    document.getElementById('timeline-author').textContent =
      demand.userName || '—';

    renderComments();
    renderShareLinks();

    loadingState.classList.add('hidden');
    content.classList.remove('hidden');
  }

  /* ---------------------------------------------------------------- map -- */

  async function initMap() {
    const mapEl = document.getElementById('detail-map');
    const coords = demand.location && demand.location.coordinates;
    if (!mapEl || !coords) return;

    if (!config.mapsEnabled) {
      mapEl.innerHTML =
        '<div class="h-full w-full flex items-center justify-center text-gray-500 text-center px-4">' +
        'Map unavailable: GOOGLE_MAPS_API_KEY is not set.</div>';
      return;
    }

    let maps;
    try {
      maps = await window.CI.loadGoogleMaps(['places']);
    } catch (error) {
      mapEl.innerHTML =
        '<div class="h-full w-full flex items-center justify-center text-red-400">' +
        'Failed to load Google Maps.</div>';
      return;
    }

    const position = { lat: coords[1], lng: coords[0] };
    const map = new maps.Map(mapEl, {
      center: position,
      zoom: 15,
      // Dark basemap, matching the original styling.
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      ],
    });

    new maps.Marker({
      position: position,
      map: map,
      title: demand.title,
      animation: maps.Animation.DROP,
    });
  }

  /* -------------------------------------------------------- AI analysis -- */

  // Tailwind is prebuilt from a static scan of these files, so every class
  // has to appear here as a whole literal — `'bg-' + accent + '-700/50'`
  // would compile to nothing. Keep the full names.
  const ACCENTS = {
    indigo: { tile: 'bg-indigo-700/50', icon: 'text-indigo-300' },
    green: { tile: 'bg-green-700/50', icon: 'text-green-300' },
    purple: { tile: 'bg-purple-700/50', icon: 'text-purple-300' },
    yellow: { tile: 'bg-yellow-700/50', icon: 'text-yellow-300' },
  };

  function analysisCard(title, body, accent) {
    const palette = ACCENTS[accent] || ACCENTS.indigo;

    return (
      '<div class="bg-gray-800 p-6 sm:p-8 rounded-xl border border-gray-700 shadow-lg hover:shadow-2xl transition-shadow">' +
      '<div class="flex items-center mb-5">' +
      '<div class="' +
      palette.tile +
      ' p-3 rounded-lg mr-4">' +
      '<svg class="h-7 w-7 ' +
      palette.icon +
      '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"/>' +
      '</svg></div>' +
      '<h3 class="text-xl sm:text-2xl font-bold ' +
      palette.icon +
      '">' +
      escapeHtml(title) +
      '</h3></div>' +
      '<p class="text-gray-300 text-base sm:text-lg leading-relaxed whitespace-pre-line">' +
      escapeHtml(body) +
      '</p></div>'
    );
  }

  function renderAnalysis(analysis) {
    const container = document.getElementById('analysis-container');

    if (analysis.error) {
      container.innerHTML =
        '<div class="bg-red-900/30 border border-red-800 p-6 sm:p-8 rounded-lg">' +
        '<h3 class="text-2xl font-bold text-red-400 mb-4">Error</h3>' +
        '<p class="text-gray-300 text-lg">' +
        escapeHtml(analysis.error) +
        '</p>' +
        (analysis.text
          ? '<div class="mt-4 p-4 bg-gray-900 rounded-lg text-sm text-gray-400 overflow-auto max-h-60">' +
            '<pre class="whitespace-pre-wrap">' +
            escapeHtml(analysis.text) +
            '</pre></div>'
          : '') +
        '</div>';
      return;
    }

    let html = '<div class="space-y-8">';

    if (analysis.summary) {
      html +=
        '<div class="bg-gray-800 p-6 sm:p-8 rounded-xl border border-blue-800 shadow-2xl">' +
        '<h3 class="text-2xl sm:text-3xl font-bold text-blue-300 mb-5 flex items-center">' +
        '<svg class="h-8 w-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
        'Executive Summary</h3>' +
        '<p class="text-gray-100 text-lg leading-relaxed whitespace-pre-line">' +
        escapeHtml(analysis.summary) +
        '</p></div>';
    }

    const cards = [
      ['Competitive Analysis', analysis.competitiveAnalysis, 'indigo'],
      ['Market Potential', analysis.marketPotential, 'green'],
      ['Resource Requirements', analysis.resourceRequirements, 'purple'],
      ['Success Factors', analysis.successFactors, 'yellow'],
    ].filter((card) => card[1]);

    if (cards.length) {
      html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">';
      cards.forEach((card) => {
        html += analysisCard(card[0], card[1], card[2]);
      });
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  async function loadAnalysis() {
    if (!config.aiEnabled) return;

    try {
      const analysis = await api.get(
        config.urls.demands + demandId + '/analysis'
      );
      renderAnalysis(analysis);
    } catch (error) {
      renderAnalysis({
        error:
          error.message ||
          'Failed to generate business analysis. Please try again later.',
      });
    }
  }

  /* ------------------------------------------------------------ actions -- */

  function requireLogin(error) {
    if (error.status === 401 || error.status === 403) {
      toast.error('Please log in to continue.');
      window.setTimeout(() => {
        window.location.href = '/auth?mode=login';
      }, 1200);
      return true;
    }
    return false;
  }

  function wireActions() {
    document
      .getElementById('upvote-button')
      .addEventListener('click', async () => {
        try {
          const data = await api.patch(
            config.urls.demands + demand._id + '/upvote',
            {}
          );
          demand = data.data;
          document.getElementById('upvote-count').textContent = demand.up_votes;
          document.getElementById('stat-upvotes').textContent = demand.up_votes;
          toast.success(data.upvoted ? 'Upvoted!' : 'Upvote removed');
        } catch (error) {
          if (!requireLogin(error)) {
            toast.error(error.message || 'Error upvoting demand');
          }
        }
      });

    const shareButton = document.getElementById('share-button');
    const dropdown = document.getElementById('share-dropdown');

    shareButton.addEventListener('click', (event) => {
      event.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));

    document
      .getElementById('copy-link')
      .addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success('Link copied to clipboard!');
        } catch (error) {
          toast.error('Could not copy the link.');
        }
        dropdown.classList.add('hidden');
      });

    const commentInput = document.getElementById('comment-input');
    const commentSubmit = document.getElementById('comment-submit');

    if (commentInput && commentSubmit) {
      const post = async () => {
        const text = commentInput.value.trim();
        if (!text) return;

        commentSubmit.disabled = true;
        try {
          const data = await api.post(
            config.urls.demands + demand._id + '/comments',
            { text: text }
          );
          demand = data.demand;
          commentInput.value = '';
          renderComments();
          toast.success('Comment added');
        } catch (error) {
          if (!requireLogin(error)) {
            toast.error(error.message || 'Error adding comment');
          }
        } finally {
          commentSubmit.disabled = false;
        }
      };

      commentSubmit.addEventListener('click', post);
      commentInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          post();
        }
      });
    }
  }

  /* ---------------------------------------------------------- bootstrap -- */

  async function start() {
    if (!demandId) {
      showError('Request ID not found in URL');
      return;
    }

    try {
      demand = await api.get(
        config.urls.demands + 'getDemandById/' + encodeURIComponent(demandId),
        { cache: 'no-store' }
      );
    } catch (error) {
      showError(
        error.status === 404
          ? 'Demand not found'
          : error.message || 'Failed to fetch request details'
      );
      return;
    }

    render();
    wireActions();
    initMap();
    loadAnalysis();
  }

  start();
})();
