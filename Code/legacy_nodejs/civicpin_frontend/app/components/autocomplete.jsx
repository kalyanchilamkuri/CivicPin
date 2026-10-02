"use client";

import React, { useRef } from "react";
import { useUserContext } from "./user_context";
import { Autocomplete } from "@react-google-maps/api";

const PlaceAutocomplete = () => {
  const { handlePlaceSelect } = useUserContext();
  const autocompleteRef = useRef(null);

  const onLoad = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (handlePlaceSelect) {
        handlePlaceSelect(place);
      }
    }
  };

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      fields={["geometry", "name", "formatted_address", "place_id"]}
    >
      <input
        type="text"
        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:bg-gray-800/70 hover:shadow-lg focus:outline-none"
        placeholder="Search for a location..."
      />
    </Autocomplete>
  );
};

export default PlaceAutocomplete;
