/* ── Google Maps Integration ── */

let googleMap;
let googleMarker;
let googleAutocomplete;
let selectedLocation = null;
let mapModalCallback = null;

/**
 * Initialize Google Maps for the entire site
 */
export async function initGoogleMaps() {
  if (window.google && window.google.maps) return;

  if (!window.GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY === 'AIzaSyDAvFIhRvYBc-PKvF6K44xF7OVah7I9jM8') {
    console.error('Google Maps API Key is missing or invalid.');
    return;
  }

  return new Promise((resolve) => {
    window.onGoogleMapsLoaded = () => {
      console.log('Google Maps API Loaded successfully');
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${window.GOOGLE_MAPS_API_KEY}&libraries=places&callback=onGoogleMapsLoaded`;
    script.async = true;
    script.defer = true;
    
    // Add an error handler for the script tag
    script.onerror = () => {
      console.error('Failed to load Google Maps script. Check your internet or API key.');
      window.googleMapsError = true;
      resolve(); // Still resolve to unblock UI
    };

    document.head.appendChild(script);
    
    // Timeout as a fallback
    setTimeout(() => {
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps load timed out');
        resolve();
      }
    }, 5000);
  });
}

/**
 * Open the Google Maps selection modal
 * @param {Function} callback - Function called with {address, lat, lng}
 */
export function openMapModal(callback) {
  mapModalCallback = callback;
  const overlay = document.getElementById('map-modal-overlay');
  if (!overlay) {
    console.error('Map modal overlay not found in DOM');
    return;
  }
  
  overlay.classList.add('open');

  if (!window.google || !window.google.maps) {
    console.warn('Google Maps not loaded yet. Retrying in 1s...');
    setTimeout(() => openMapModal(callback), 1000);
    return;
  }

  if (!googleMap) {
    const mapCanvas = document.getElementById('map-canvas');
    if (!mapCanvas) {
      console.error('Map canvas element (#map-canvas) not found in DOM.');
      return;
    }

    const mapCenter = selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : { lat: -25.7219, lng: 28.3412 }; // Pretoria default
    googleMap = new google.maps.Map(mapCanvas, {
      zoom: 14,
      center: mapCenter,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    googleMarker = new google.maps.Marker({
      position: mapCenter,
      map: googleMap,
      draggable: true,
      animation: google.maps.Animation.DROP
    });

    // Update selected location on marker drag
    googleMarker.addListener('dragend', () => {
      const pos = googleMarker.getPosition();
      updateLocationFromCoords(pos.lat(), pos.lng());
    });

    // Update selected location on map click
    googleMap.addListener('click', (e) => {
      googleMarker.setPosition(e.latLng);
      updateLocationFromCoords(e.latLng.lat(), e.latLng.lng());
    });

    // Setup Autocomplete
    const input = document.getElementById('map-search-input');
    googleAutocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'za' },
      fields: ['address_components', 'geometry', 'formatted_address'],
      types: ['address']
    });

    googleAutocomplete.addListener('place_changed', () => {
      const place = googleAutocomplete.getPlace();
      if (!place.geometry) return;

      googleMap.setCenter(place.geometry.location);
      googleMap.setZoom(17);
      googleMarker.setPosition(place.geometry.location);
      
      selectedLocation = {
        address: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
    });
  } else {
    // If map already exists, just re-center and update marker if we have a location
    const currentCenter = selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : { lat: -25.7219, lng: 28.3412 };
    googleMap.setCenter(currentCenter);
    googleMarker.setPosition(currentCenter);
    if (selectedLocation) {
      document.getElementById('map-search-input').value = selectedLocation.address;
    }
    // Trigger a resize event to ensure the map renders correctly in the modal
    google.maps.event.trigger(googleMap, 'resize');
  }

  // Handle Confirm
  document.getElementById('confirm-map-btn').onclick = () => {
    if (selectedLocation && mapModalCallback) {
      mapModalCallback(selectedLocation);
    }
    overlay.classList.remove('open');
  };

  // Handle Cancel
  document.getElementById('cancel-map-btn').onclick = () => {
    overlay.classList.remove('open');
  };
}

async function updateLocationFromCoords(lat, lng) {
  const geocoder = new google.maps.Geocoder();
  try {
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results[0]) {
      selectedLocation = {
        address: response.results[0].formatted_address,
        lat,
        lng
      };
      document.getElementById('map-search-input').value = selectedLocation.address;
    }
  } catch (e) {
    console.error('Geocoding failed', e);
  }
}
