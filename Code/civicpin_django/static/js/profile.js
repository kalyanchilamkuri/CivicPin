/* Profile page: tab switching, the address map, and the user's own demands,
 * properties and activity pulled from /api/user/profile. */

(function () {
  'use strict';

  const { api, toast, config, escapeHtml, titleCase, formatCurrency, formatDate } =
    window.CI;

  /* ----------------------------------------------------------------- tabs -- */

  const buttons = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));

  function activate(name) {
    buttons.forEach((button) => {
      const isActive = button.dataset.tab === name;
      button.classList.toggle('text-white', isActive);
      button.classList.toggle('bg-gray-800/60', isActive);
      button.classList.toggle('text-gray-400', !isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.panel !== name);
    });
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => activate(button.dataset.tab));
  });
  activate('info');

  /* --------------------------------------------------------------- logout -- */

  document
    .getElementById('logout-button')
    .addEventListener('click', async () => {
      try {
        await api.post(config.urls.auth + 'logout', {});
      } catch (error) {
        // Even if the call fails the cookie is cleared client-side on reload.
      }
      window.location.href = '/landing';
    });

  /* ------------------------------------------------------------------ map -- */

  async function initMap() {
    const mapEl = document.getElementById('profile-map');
    if (!mapEl) return;

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

    // Fall back to New Delhi when the profile has no usable address.
    const fallback = { lat: 28.6139, lng: 77.209 };

    const darkStyles = [
      { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
      { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
      { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
      { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
    ];

    function render(center) {
      const map = new maps.Map(mapEl, {
        center: center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        styles: darkStyles,
      });
      new maps.Marker({
        position: center,
        map: map,
        icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });
    }

    const address = (config.userAddress || '').trim();
    if (!address) {
      render(fallback);
      return;
    }

    new maps.Geocoder().geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        render(results[0].geometry.location.toJSON());
      } else {
        render(fallback);
      }
    });
  }

  /* ------------------------------------------------------------- content -- */

  function emptyState(icon, title, body, actionHtml) {
    return (
      '<div class="bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-3xl py-16 flex flex-col items-center text-center px-6">' +
      '<div class="bg-gray-800/80 p-6 rounded-full mb-6 ring-1 ring-gray-700 shadow-xl text-4xl">' +
      icon +
      '</div>' +
      '<h4 class="text-xl sm:text-2xl font-bold text-white mb-3">' +
      escapeHtml(title) +
      '</h4>' +
      '<p class="text-gray-400 max-w-md mx-auto mb-6">' +
      escapeHtml(body) +
      '</p>' +
      (actionHtml || '') +
      '</div>'
    );
  }

  function demandCard(demand) {
    return (
      '<a href="/viewrequest?id=' +
      encodeURIComponent(demand._id) +
      '" class="block bg-gray-900/40 border border-gray-800 rounded-2xl p-5 hover:border-blue-600/60 hover:bg-gray-800/50 transition-all">' +
      '<div class="flex items-start justify-between gap-3 mb-2">' +
      '<h4 class="text-lg font-bold text-white">' +
      escapeHtml(demand.title) +
      '</h4>' +
      '<span class="text-blue-300 font-semibold whitespace-nowrap">👍 ' +
      escapeHtml(demand.up_votes) +
      '</span></div>' +
      '<p class="text-gray-400 text-sm mb-3 line-clamp-2">' +
      escapeHtml(demand.description) +
      '</p>' +
      '<div class="flex flex-wrap gap-2 text-xs">' +
      '<span class="bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">' +
      escapeHtml(titleCase(demand.category)) +
      '</span>' +
      '<span class="bg-gray-700/60 text-gray-300 px-2 py-1 rounded-full">' +
      escapeHtml(titleCase(demand.status)) +
      '</span>' +
      '<span class="bg-gray-700/60 text-gray-300 px-2 py-1 rounded-full">' +
      escapeHtml(formatDate(demand.createdAt, { dateStyle: 'medium' })) +
      '</span></div></a>'
    );
  }

  function propertyCard(item) {
    return (
      '<div class="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">' +
      '<div class="flex items-start justify-between gap-3 mb-2">' +
      '<h4 class="text-lg font-bold text-white">' +
      escapeHtml(item.title) +
      '</h4>' +
      '<span class="text-green-400 font-bold whitespace-nowrap">' +
      escapeHtml(formatCurrency(item.price)) +
      '</span></div>' +
      '<p class="text-gray-400 text-sm mb-3 line-clamp-2">' +
      escapeHtml(item.description) +
      '</p>' +
      '<div class="flex flex-wrap gap-2 text-xs">' +
      '<span class="bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">' +
      escapeHtml(titleCase(item.category)) +
      '</span>' +
      '<span class="bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full">' +
      escapeHtml(titleCase(item.type)) +
      '</span>' +
      '<span class="bg-gray-700/60 text-gray-300 px-2 py-1 rounded-full">' +
      escapeHtml(item.area) +
      ' sq ft</span>' +
      '<span class="bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded-full">' +
      escapeHtml(titleCase(item.status)) +
      '</span></div></div>'
    );
  }

  function activityItem(event) {
    return (
      '<div class="relative pl-6 sm:pl-8 group">' +
      '<span class="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-gray-900 border-2 border-purple-500 group-hover:scale-125 transition-transform"></span>' +
      '<div class="bg-gray-800/30 hover:bg-gray-800/60 p-5 rounded-2xl border border-gray-700/50 transition-all shadow-md">' +
      '<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">' +
      '<h4 class="text-lg font-bold text-purple-300">' +
      escapeHtml(event.action) +
      '</h4>' +
      '<span class="text-xs font-medium text-gray-500 bg-gray-800/80 px-2.5 py-1 rounded-md w-fit">' +
      escapeHtml(event.timestamp) +
      '</span></div>' +
      '<p class="text-gray-300">' +
      (event.url
        ? '<a href="' +
          event.url +
          '" class="hover:text-white hover:underline">' +
          escapeHtml(event.description) +
          '</a>'
        : escapeHtml(event.description)) +
      '</p></div></div>'
    );
  }

  async function loadProfile() {
    let profile;
    try {
      profile = await api.get(config.urls.api + 'user/profile');
    } catch (error) {
      toast.error(error.message || 'Failed to load profile data');
      return;
    }

    const demands = profile.demands_raised || [];
    const properties = profile.properties_created || [];
    const activity = profile.recentActivity || [];

    document.getElementById('count-demands').textContent = demands.length;
    document.getElementById('count-properties').textContent = properties.length;

    document.getElementById('demands-list').innerHTML = demands.length
      ? '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
        demands.map(demandCard).join('') +
        '</div>'
      : emptyState(
          '📍',
          'No demands raised',
          "You haven't pinned any infrastructure needs yet.",
          '<a href="/raise-request" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors">Raise your first demand</a>'
        );

    document.getElementById('properties-list').innerHTML = properties.length
      ? '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">' +
        properties.map(propertyCard).join('') +
        '</div>'
      : emptyState(
          '🏠',
          'No properties listed',
          "You haven't added any properties or spaces to your account yet.",
          '<a href="/property" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors">Publish your first property</a>'
        );

    document.getElementById('activity-list').innerHTML = activity.length
      ? '<div class="relative border-l-2 border-gray-800 ml-4 space-y-8 pb-4">' +
        activity.map(activityItem).join('') +
        '</div>'
      : emptyState(
          '🏅',
          'No activity right now',
          'Interact with demands, rate properties, or publish your own requests to see them logged here.'
        );
  }

  initMap();
  loadProfile();
})();
