import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1Ijoic2lkZGh1cyIsImEiOiJjbWh6amxrZWQwbThpMmlvaWhodzg4cTUwIn0.hL2CvvgpLwdvkFRFTIDgYg';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/siddhus/cmi0x5cqh00ly01suhokk08hp',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

map.on('load', async () => {
    map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'boston_route',
      paint: {
       'line-color': 'green',
       'line-width': 3,
       'line-opacity': 0.4,
      },
    });

    map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
    });

    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'cambridge_route',
      paint: {
       'line-color': 'green',
       'line-width': 3,
       'line-opacity': 0.4,
      },
    });
});

