"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  ControlPosition,
  MapControl,
  AdvancedMarker,
  Map,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";

const MapHandler = ({ place, marker }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !place || !marker) return;

    if (place.geometry?.viewport) {
      map.fitBounds(place.geometry?.viewport);
    }

    marker.position = place.geometry?.location;
  }, [map, place, marker]);

  return null;
};
const LogScaleValue = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const logScale = () => {
      const projection = map.getProjection();
      if (!projection) return;

      const center = map.getCenter();
      if (!center) return;

      // Get scale value in meters per pixel
      const zoom = map.getZoom();
      const scale =
        (156543.03392 * Math.cos((center.lat() * Math.PI) / 180)) /
        Math.pow(2, zoom);

      console.log("Scale Control Enabled:", map.get("scaleControl"));
      console.log("Zoom Level:", zoom);
      console.log("Scale (meters per pixel):", scale);
    };

    logScale(); // Initial log
    const intervalId = setInterval(logScale, 5000);

    return () => clearInterval(intervalId);
  }, [map]);

  return null;
};

const PlaceAutocomplete = ({ onPlaceSelect }) => {
  const [placeAutocomplete, setPlaceAutocomplete] = useState(null);
  const inputRef = useRef(null);
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ["geometry", "name", "formatted_address"],
    };

    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    placeAutocomplete.addListener("place_changed", () => {
      onPlaceSelect(placeAutocomplete.getPlace());
    });
  }, [onPlaceSelect, placeAutocomplete]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 m-4 w-96">
      <input
        ref={inputRef}
        className="w-full px-4 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
        placeholder="Search for a place..."
      />
    </div>
  );
};

const ClickLogger = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleClick = (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      console.log(`Clicked at: Latitude: ${lat}, Longitude: ${lng}`);
    };

    map.addListener("click", handleClick);

    return () => {
      google.maps.event.clearListeners(map, "click");
    };
  }, [map]);

  return null;
};

export default function Gmaps() {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <div className="h-full w-full">
      <APIProvider
        apiKey={"AIzaSyCBUWqISO_DOQUKhwb7q09wQteK87WOEec"}
        libraries={["places"]}
        solutionChannel="GMP_devsite_samples_v3_rgmautocomplete"
      >
        <Map
          mapId={"bf51a910020fa25a"}
          defaultZoom={3}
          defaultCenter={{ lat: 22.54992, lng: 0 }}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          className="w-full h-full"
          mapTypeId="satellite"
          scaleControl="true"
        >
          <LogScaleValue />
          <ClickLogger /> 
          <AdvancedMarker ref={markerRef} position={null} />
          <MapControl position={ControlPosition.TOP}>
            <PlaceAutocomplete onPlaceSelect={setSelectedPlace} />
          </MapControl>
          <MapHandler place={selectedPlace} marker={marker} />
        </Map>
      </APIProvider>
    </div>
  );
}
