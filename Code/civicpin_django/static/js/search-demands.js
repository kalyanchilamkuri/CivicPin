/* Search demands: map of all demands, a category/location filter, a detail
 * panel with upvoting and comments, and a paginated card list.
 * Ports app/search-demands/page.js. */

(function () {
  'use strict';

  const { api, toast, config, escapeHtml, titleCase, formatDateTime } = window.CI;

  const INITIAL_VISIBLE = 6;
  // Roughly 11 km, matching the old client-side degree threshold.
  const MAX_DEGREES = 0.1;

  let maps = null;
  let map = null;
  let infoWindow = null;
  const markers = new Map();

  let allDemands = [];
  let filtered = [];
  let selectedId = null;
  let visibleCount = INITIAL_VISIBLE;
  let selectedLocation = null;
  let category = 'all';

  const mapEl = document.getElementById('demands-map');
  const statusEl = document.getElementById('map-status');
  const searchEl = document.getElementById('place-search');
  const categoryEl = document.getElementById('category-filter');
  const detailTitle = document.getElementById('detail-title');
  const detailEmpty = document.getElementById('detail-empty');
  const detailBody = document.getElementById('detail-body');
  const listSection = document.getElementById('list-section');
  const listHeading = document.getElementById('list-heading');
  const cardsEl = document.getElementById('demand-cards');
  const loadMoreButton = document.getElementById('load-more');
  const showLessButton = document.getElementById('show-less');

  /* --------------------------------------------------------------- data -- */

  async function loadDemands() {
    try {
      allDemands = await api.get(config.urls.demands + 'getDemand');
      applyFilter();
    } catch (error) {
      toast.error('Failed to fetch demands');
      cardsEl.innerHTML =
        '<p class="text-red-400">Failed to fetch demands.</p>';
      listSection.classList.remove('hidden');
    }
  }

  function applyFilter() {
    filtered = allDemands.slice();

    if (selectedLocation) {
      filtered = filtered.filter((demand) => {
        const coords = demand.location && demand.location.coordinates;
        if (!coords) return false;
        const dLat = coords[1] - selectedLocation.lat;
        const dLng = coords[0] - selectedLocation.lng;
        return Math.sqrt(dLat * dLat + dLng * dLng) <= MAX_DEGREES;
      });
    }

    if (category !== 'all') {
      filtered = filtered.filter((demand) => demand.category === category);
    }

    visibleCount = INITIAL_VISIBLE;
    renderMarkers();
    renderCards();

    if (selectedId && !filtered.some((d) => d._id === selectedId)) {
      clearDetail();
    }
  }

  function findDemand(id) {
    return allDemands.find((demand) => demand._id === id) || null;
  }

  function replaceDemand(updated) {
    allDemands = allDemands.map((demand) =>
      demand._id === updated._id ? updated : demand
    );
    filtered = filtered.map((demand) =>
      demand._id === updated._id ? updated : demand
    );
  }

  /* ------------------------------------------------------------ markers -- */

  function markerIcon(isSelected) {
    return {
      path: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z',
      fillColor: isSelected ? '#FF4500' : '#2196F3',
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: '#ffffff',
      scale: 2,
      anchor: new maps.Point(12, 22),
    };
  }

  function renderMarkers() {
    if (!map) return;

    markers.forEach((marker) => marker.setMap(null));
    markers.clear();

    filtered.forEach((demand) => {
      const coords = demand.location && demand.location.coordinates;
      if (!coords) return;

      const marker = new maps.Marker({
        position: { lat: coords[1], lng: coords[0] },
        map: map,
        title: demand.title,
        icon: markerIcon(demand._id === selectedId),
      });

      marker.addListener('click', () => selectDemand(demand._id));
      markers.set(demand._id, marker);
    });
  }

  function refreshMarkerIcons() {
    markers.forEach((marker, id) => {
      marker.setIcon(markerIcon(id === selectedId));
    });
  }

  /* ------------------------------------------------------- detail panel -- */

  function clearDetail() {
    selectedId = null;
    detailTitle.textContent = 'Demand Details';
    detailBody.classList.add('hidden');
    detailBody.innerHTML = '';
    detailEmpty.classList.remove('hidden');
    refreshMarkerIcons();
  }

  function commentHtml(comment) {
    return (
      '<div class="bg-gray-800/50 p-3 rounded-lg">' +
      '<div class="flex justify-between text-sm text-gray-400 mb-1 gap-2">' +
      '<span>' +
      escapeHtml(comment.userName || comment.user) +
      '</span>' +
      '<span class="whitespace-nowrap">' +
      escapeHtml(formatDateTime(comment.timestamp)) +
      '</span></div>' +
      '<p class="text-gray-200 break-words">' +
      escapeHtml(comment.text) +
      '</p></div>'
    );
  }

  function detailHtml(demand) {
    const comments = demand.comments || [];

    return (
      '<div class="mb-4 p-4 bg-gray-800/50 rounded-lg transition-all duration-300 hover:bg-gray-800/60">' +
      '<p class="text-gray-300 mb-3 break-words">' +
      escapeHtml(demand.description) +
      '</p>' +
      '<div class="flex justify-between text-sm text-gray-400 mb-2 gap-2">' +
      '<span>Category: ' +
      escapeHtml(titleCase(demand.category)) +
      '</span>' +
      '<span>' +
      escapeHtml(window.CI.formatDate(demand.createdAt, { dateStyle: 'medium' })) +
      '</span></div>' +
      '<div class="flex justify-between items-center">' +
      '<span class="text-gray-400 text-sm">Status: ' +
      escapeHtml(titleCase(demand.status)) +
      '</span>' +
      '<button type="button" data-action="upvote" ' +
      'class="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-all duration-300 transform hover:scale-110">' +
      '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">' +
      '<path fill-rule="evenodd" clip-rule="evenodd" ' +
      'd="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"/>' +
      '</svg><span data-field="upvotes">' +
      escapeHtml(demand.up_votes) +
      '</span></button></div></div>' +
      '<div class="mt-6">' +
      '<h3 class="text-xl font-semibold mb-3 text-gray-200">Comments</h3>' +
      '<div class="space-y-3 mb-4 max-h-60 overflow-y-auto" data-field="comments">' +
      (comments.length
        ? comments.map(commentHtml).join('')
        : '<p class="text-gray-500 text-center py-2">No comments yet</p>') +
      '</div>' +
      '<div class="flex space-x-2">' +
      '<input type="text" data-field="comment-input" placeholder="Write your comment..." ' +
      'class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white ' +
      'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300 hover:bg-gray-800/60">' +
      '<button type="button" data-action="comment" ' +
      'class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105">' +
      'Send</button></div>' +
      '<div class="flex justify-center mt-10">' +
      '<a href="/viewrequest?id=' +
      encodeURIComponent(demand._id) +
      '" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ' +
      'transition-colors duration-300 flex items-center space-x-2 transform hover:scale-105">' +
      '<span>View Details</span>' +
      '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>' +
      '</svg></a></div></div>'
    );
  }

  function renderDetail(demand) {
    detailTitle.textContent = demand.title;
    detailEmpty.classList.add('hidden');
    detailBody.classList.remove('hidden');
    detailBody.innerHTML = detailHtml(demand);

    detailBody
      .querySelector('[data-action="upvote"]')
      .addEventListener('click', () => handleUpvote(demand._id));

    const commentButton = detailBody.querySelector('[data-action="comment"]');
    const commentInput = detailBody.querySelector('[data-field="comment-input"]');

    commentButton.addEventListener('click', () =>
      handleComment(demand._id, commentInput)
    );
    commentInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleComment(demand._id, commentInput);
      }
    });
  }

  function selectDemand(id) {
    const demand = findDemand(id);
    if (!demand) return;

    selectedId = id;
    refreshMarkerIcons();
    renderDetail(demand);
    renderCards();

    const coords = demand.location && demand.location.coordinates;
    if (map && coords) {
      map.panTo({ lat: coords[1], lng: coords[0] });
      if (map.getZoom() < 12) map.setZoom(13);
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

  async function handleUpvote(id) {
    try {
      const data = await api.patch(config.urls.demands + id + '/upvote', {});
      replaceDemand(data.data);
      renderDetail(data.data);
      renderCards();
      toast.success(data.upvoted ? 'Upvoted!' : 'Upvote removed');
    } catch (error) {
      if (!requireLogin(error)) {
        toast.error(error.message || 'Error upvoting demand');
      }
    }
  }

  async function handleComment(id, input) {
    const text = input.value.trim();
    if (!text) return;

    try {
      const data = await api.post(config.urls.demands + id + '/comments', {
        text: text,
      });
      replaceDemand(data.demand);
      renderDetail(data.demand);
      toast.success('Comment added');
    } catch (error) {
      if (!requireLogin(error)) {
        toast.error(error.message || 'Error adding comment');
      }
    }
  }

  /* -------------------------------------------------------------- cards -- */

  function cardHtml(demand) {
    const isSelected = demand._id === selectedId;
    return (
      '<div data-id="' +
      escapeHtml(demand._id) +
      '" class="p-4 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg ' +
      'transform hover:scale-[1.03] ' +
      (isSelected
        ? 'bg-blue-900/30 border border-blue-500/50'
        : 'bg-gray-800/30 border border-gray-700/50 hover:bg-gray-700/40') +
      '">' +
      '<h3 class="text-lg font-semibold mb-2 hover:text-blue-400 transition-all duration-300">' +
      escapeHtml(demand.title) +
      '</h3>' +
      '<p class="text-gray-400 text-sm mb-3 line-clamp-2">' +
      escapeHtml(demand.description) +
      '</p>' +
      '<div class="flex justify-between items-center">' +
      '<span class="text-xs text-gray-500">' +
      escapeHtml(titleCase(demand.category)) +
      '</span>' +
      '<div class="flex items-center space-x-1 text-blue-400">' +
      '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">' +
      '<path fill-rule="evenodd" clip-rule="evenodd" ' +
      'd="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"/>' +
      '</svg><span>' +
      escapeHtml(demand.up_votes) +
      '</span></div></div></div>'
    );
  }

  function renderCards() {
    if (!filtered.length) {
      listSection.classList.remove('hidden');
      listHeading.textContent = 'Nearby Demands (0)';
      cardsEl.innerHTML =
        '<p class="text-gray-400">No demands match the current filters.</p>';
      loadMoreButton.classList.add('hidden');
      showLessButton.classList.add('hidden');
      return;
    }

    listSection.classList.remove('hidden');
    listHeading.textContent = 'Nearby Demands (' + filtered.length + ')';
    cardsEl.innerHTML = filtered
      .slice(0, visibleCount)
      .map(cardHtml)
      .join('');

    cardsEl.querySelectorAll('[data-id]').forEach((card) => {
      card.addEventListener('click', () => selectDemand(card.dataset.id));
    });

    loadMoreButton.classList.toggle(
      'hidden',
      visibleCount >= filtered.length
    );
    showLessButton.classList.toggle('hidden', visibleCount <= INITIAL_VISIBLE);
  }

  loadMoreButton.addEventListener('click', () => {
    visibleCount += 3;
    renderCards();
  });

  showLessButton.addEventListener('click', () => {
    visibleCount = INITIAL_VISIBLE;
    renderCards();
  });

  categoryEl.addEventListener('change', () => {
    category = categoryEl.value;
    applyFilter();
  });

  /* ---------------------------------------------------------- bootstrap -- */

  function showMapMessage(message) {
    statusEl.innerHTML =
      '<p class="text-red-400 text-lg px-6 text-center">' +
      escapeHtml(message) +
      '</p>';
  }

  if (!config.mapsEnabled) {
    showMapMessage(
      'Google Maps is not configured. Set GOOGLE_MAPS_API_KEY in the .env file to see demands on a map; the list below still works.'
    );
    loadDemands();
  } else {
    window.CI.loadGoogleMaps(['places'])
      .then((googleMaps) => {
        maps = googleMaps;
        statusEl.remove();
        mapEl.classList.remove('hidden');

        map = new maps.Map(mapEl, {
          center: config.defaultCenter,
          zoom: 5,
          mapTypeControl: true,
          mapTypeId: 'roadmap',
          fullscreenControl: true,
          streetViewControl: true,
          zoomControl: true,
        });
        infoWindow = new maps.InfoWindow();

        const autocomplete = new maps.places.Autocomplete(searchEl, {
          fields: ['geometry', 'name', 'formatted_address', 'place_id'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place || !place.geometry || !place.geometry.location) return;

          selectedLocation = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          map.setCenter(selectedLocation);
          map.setZoom(13);
          applyFilter();
        });
        searchEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') event.preventDefault();
        });

        return loadDemands();
      })
      .catch((error) => {
        showMapMessage(error.message || 'Failed to load Google Maps.');
        loadDemands();
      });
  }
})();
