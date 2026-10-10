/* Pick a point on a Google Map, then post a demand or a property for it.
 *
 * Shared by the raise-request and property pages, which in the Next.js app
 * were two near-identical 460/620-line components. */

(function () {
  'use strict';

  const { api, toast, config, escapeHtml } = window.CI;

  function initMapForm(options) {
    const mapEl = document.getElementById(options.mapId);
    const statusEl = document.getElementById(options.statusId);
    const searchEl = document.getElementById(options.searchId);
    const form = document.getElementById(options.formId);
    const overlay = document.getElementById(options.overlayId);
    const submitButton = document.getElementById(options.submitId);
    const closeButton = document.getElementById(options.closeId);
    const coordsEl = document.getElementById(options.coordsId);

    /* ----------------------------------------------- collapsible steps -- */

    const stepsToggle = document.getElementById(options.stepsToggleId);
    const stepsBody = document.getElementById(options.stepsBodyId);
    const stepsLabel = document.getElementById(options.stepsLabelId);
    if (stepsToggle && stepsBody && stepsLabel) {
      stepsToggle.addEventListener('click', () => {
        const hidden = stepsBody.classList.toggle('hidden');
        stepsLabel.textContent = hidden ? 'Show Steps' : 'Hide Steps';
      });
    }

    function showStatus(message, isError) {
      if (!statusEl) return;
      statusEl.innerHTML =
        '<p class="' +
        (isError ? 'text-red-400' : 'text-gray-300') +
        ' text-lg px-6 text-center">' +
        escapeHtml(message) +
        '</p>';
    }

    if (!config.mapsEnabled) {
      showStatus(
        'Google Maps is not configured. Set GOOGLE_MAPS_API_KEY in the .env file to pick a location on the map.',
        true
      );
      return;
    }

    let maps = null;
    let map = null;
    let marker = null;
    let infoWindow = null;
    let selected = null;
    const created = [];

    /* ------------------------------------------------------- selection -- */

    function setSelected(position, openPopup) {
      selected = position;

      if (coordsEl) {
        coordsEl.textContent =
          position.lat.toFixed(6) + ', ' + position.lng.toFixed(6);
      }

      if (!marker) {
        marker = new maps.Marker({
          position: position,
          map: map,
          draggable: true,
        });
        marker.addListener('dragend', (event) => {
          setSelected(
            { lat: event.latLng.lat(), lng: event.latLng.lng() },
            true
          );
        });
        marker.addListener('click', () => openSelectionPopup());
      } else {
        marker.setPosition(position);
        marker.setMap(map);
      }

      if (openPopup !== false) openSelectionPopup();
    }

    function openSelectionPopup() {
      if (!selected) return;

      infoWindow.setContent(
        '<div class="p-3" style="min-width:220px">' +
          '<h3 class="text-lg font-bold text-gray-800 mb-3">' +
          escapeHtml(options.popupTitle) +
          '</h3>' +
          '<button type="button" id="open-form-button" ' +
          'class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">' +
          escapeHtml(options.popupAction) +
          '</button></div>'
      );
      infoWindow.setPosition(selected);
      infoWindow.open(map);
    }

    function openForm() {
      infoWindow.close();
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      const firstField = form.querySelector('input, textarea, select');
      if (firstField) firstField.focus();
    }

    function closeForm() {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      openSelectionPopup();
    }

    /* --------------------------------------------- created-item markers -- */

    function renderCreated(item) {
      if (options.renderCreated) return options.renderCreated(item);

      const title = escapeHtml(item.title);
      const heading = options.detailUrl
        ? '<a href="' +
          options.detailUrl(item._id) +
          '" class="block hover:underline">' +
          title +
          '</a>'
        : title;

      return (
        '<div class="p-3" style="max-width:260px">' +
        '<h3 class="text-lg font-bold text-blue-600 mb-2">' +
        heading +
        '</h3>' +
        '<p class="text-gray-700 mb-2">' +
        escapeHtml(item.description) +
        '</p>' +
        '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">' +
        escapeHtml(window.CI.titleCase(item.category)) +
        '</span></div>'
      );
    }

    function addCreatedMarker(item) {
      const coords = item.location && item.location.coordinates;
      if (!coords) return;

      const createdMarker = new maps.Marker({
        position: { lat: coords[1], lng: coords[0] },
        map: map,
        title: item.title,
        icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
      });

      createdMarker.addListener('click', () => {
        infoWindow.setContent(renderCreated(item));
        infoWindow.open({ anchor: createdMarker, map: map });
      });

      created.push(createdMarker);
    }

    /* ------------------------------------------------------------ submit -- */

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!selected) {
        toast.error('Please select a location on the map');
        return;
      }

      const payload = options.buildPayload(form);
      payload.location = {
        type: 'Point',
        coordinates: [selected.lng, selected.lat],
      };

      submitButton.disabled = true;
      const idleLabel = submitButton.textContent;
      submitButton.textContent = 'Submitting...';

      try {
        const data = await api.post(options.endpoint, payload);
        const item = data[options.resultKey];

        toast.success(options.successMessage);
        addCreatedMarker(item);
        if (options.onCreated) options.onCreated(item);
        options.resetForm(form);
        closeForm();
        infoWindow.close();

        if (marker) {
          marker.setMap(null);
          marker = null;
        }
        selected = null;
        if (coordsEl) coordsEl.textContent = 'none';
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          toast.error('Please log in to continue.');
          window.setTimeout(() => {
            window.location.href = '/auth?mode=login';
          }, 1200);
        } else {
          toast.error(error.message || 'Failed to submit. Please try again.');
        }
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = idleLabel;
      }
    });

    if (closeButton) closeButton.addEventListener('click', closeForm);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeForm();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeForm();
      }
    });

    /* -------------------------------------------------------- bootstrap -- */

    window.CI.loadGoogleMaps(['places'])
      .then((googleMaps) => {
        maps = googleMaps;

        statusEl.remove();
        mapEl.classList.remove('hidden');

        map = new maps.Map(mapEl, {
          center: config.defaultCenter,
          zoom: 5,
          mapTypeControl: true,
          mapTypeId: options.mapTypeId || 'roadmap',
          fullscreenControl: true,
          streetViewControl: true,
          zoomControl: true,
        });

        infoWindow = new maps.InfoWindow();

        // The popup's button only exists once the InfoWindow renders.
        infoWindow.addListener('domready', () => {
          const button = document.getElementById('open-form-button');
          if (button) button.addEventListener('click', openForm);
        });

        map.addListener('click', (event) => {
          if (!event.latLng) return;
          setSelected({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        });

        if (searchEl) {
          const autocomplete = new maps.places.Autocomplete(searchEl, {
            fields: ['geometry', 'name', 'formatted_address', 'place_id'],
          });
          autocomplete.bindTo('bounds', map);

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place || !place.geometry || !place.geometry.location) {
              toast.error('No details available for that place.');
              return;
            }
            const position = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            map.setCenter(position);
            map.setZoom(15);
            setSelected(position);
          });

          // Pressing Enter in the box should not submit anything.
          searchEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') event.preventDefault();
          });
        }
      })
      .catch((error) => {
        showStatus(error.message || 'Failed to load Google Maps.', true);
      });
  }

  window.CI.initMapForm = initMapForm;
})();
