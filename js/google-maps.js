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

  if (!window.GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    console.error('Google Maps API Key is missing or invalid.');
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${window.GOOGLE_MAPS_API_KEY}&libraries=places&callback=onGoogleMapsLoaded`;
  script.async = true;
  script.defer = true;
  
  // Add an error handler for the script tag
  script.onerror = () => {
    console.error('Failed to load Google Maps script. Check your internet or API key.');
    window.googleMapsError = true;
  };

  document.head.appendChild(script);

  return new Promise((resolve) => {
    window.onGoogleMapsLoaded = () => {
      console.log('Google Maps API Loaded successfully');
      resolve();
    };
    
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
  overlay.classList.add('open');

  if (!googleMap) {
    const mapCenter = { lat: -25.7219, lng: 28.3412 }; // Pretoria default
    googleMap = new google.maps.Map(document.getElementById('map-canvas'), {
      zoom: 14,
      center: mapCenter,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        // ... Dark mode styles ...
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
