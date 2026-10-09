/* Property page: the map picker plus a grid of existing listings. */

(function () {
  'use strict';

  const { api, config, escapeHtml, formatCurrency, titleCase } = window.CI;

  /* ------------------------------------------------------ map + new form -- */

  window.CI.initMapForm({
    kind: 'property',
    mapId: 'property-map',
    statusId: 'map-status',
    searchId: 'place-search',
    formId: 'property-form',
    overlayId: 'form-overlay',
    submitId: 'property-submit',
    closeId: 'close-form',
    coordsId: 'selected-coords',
    stepsToggleId: 'steps-toggle',
    stepsBodyId: 'steps-body',
    stepsLabelId: 'steps-toggle-label',
    endpoint: config.urls.properties + 'property',
    mapTypeId: 'terrain',
    popupTitle: 'Raise a Property',
    popupAction: 'Raise Property Here',
    successMessage: 'Property created successfully!',
    resultKey: 'property',
    buildPayload: function (form) {
      return {
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        category: form.category.value,
        type: form.type.value,
        price: form.price.value,
        area: form.area.value,
        contactNumber: form.contactNumber.value.trim(),
        status: form.status.value,
      };
    },
    resetForm: function (form) {
      form.reset();
      form.category.value = 'residential';
      form.type.value = 'sell';
      form.status.value = 'available';
    },
    renderCreated: function (item) {
      return (
        '<div class="p-3" style="max-width:260px">' +
        '<h3 class="text-lg font-bold text-blue-600 mb-2">' +
        escapeHtml(item.title) +
        '</h3>' +
        '<p class="text-gray-700 mb-2">' +
        escapeHtml(item.description) +
        '</p>' +
        '<div class="flex justify-between items-center gap-2">' +
        '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">' +
        escapeHtml(titleCase(item.category)) +
        '</span>' +
        '<span class="text-green-600 font-semibold">' +
        escapeHtml(formatCurrency(item.price)) +
        '</span></div></div>'
      );
    },
    onCreated: function (item) {
      prependListing(item);
    },
  });

  /* ----------------------------------------------------------- listings -- */

  const listingsEl = document.getElementById('listings');

  function listingCard(item) {
    const coords = (item.location && item.location.coordinates) || [0, 0];
    return (
      '<div class="p-4 rounded-lg bg-gray-800/40 border border-gray-700/60 ' +
      'hover:bg-gray-700/40 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300">' +
      '<div class="flex items-start justify-between gap-2 mb-2">' +
      '<h3 class="text-lg font-semibold text-gray-100">' +
      escapeHtml(item.title) +
      '</h3>' +
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
      '</span></div>' +
      '<div class="mt-3 flex items-center justify-between text-xs text-gray-500">' +
      '<span>📞 ' +
      escapeHtml(item.contactNumber) +
      '</span>' +
      '<a class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" ' +
      'href="https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(coords[1] + ',' + coords[0]) +
      '">View on map</a>' +
      '</div></div>'
    );
  }

  function prependListing(item) {
    if (!listingsEl) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = listingCard(item);
    const card = wrapper.firstElementChild;
    const placeholder = listingsEl.querySelector('[data-placeholder]');
    if (placeholder) placeholder.remove();
    listingsEl.prepend(card);
  }

  async function loadListings() {
    if (!listingsEl) return;

    try {
      const items = await api.get(config.urls.properties + 'getProperty');
      if (!items.length) {
        listingsEl.innerHTML =
          '<p class="text-gray-400" data-placeholder>No properties listed yet — add the first one above.</p>';
        return;
      }
      listingsEl.innerHTML = items.map(listingCard).join('');
    } catch (error) {
      listingsEl.innerHTML =
        '<p class="text-red-400" data-placeholder>Failed to load listings.</p>';
    }
  }

  loadListings();
})();
