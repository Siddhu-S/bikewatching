import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = 'pk.eyJ1Ijoic2lkZGh1cyIsImEiOiJjbWh6amxrZWQwbThpMmlvaWhodzg4cTUwIn0.hL2CvvgpLwdvkFRFTIDgYg';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/siddhus/cmi0x5cqh00ly01suhokk08hp',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

const svg = d3.select('#map').select('svg');

let stations = [];
let trips = [];
let circles;
let radiusScale;

let timeFilter = -1;
let timeSlider, selectedTime, anyTimeLabel;
let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);


function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id,
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id,
  );

  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

function minutesSinceMidnight(date) {
       return date.getHours() * 60 + date.getMinutes();
}


function filterTripsByTime(tripsArr, timeFilterVal) {
  if (timeFilterVal === -1) return tripsArr;

  return tripsArr.filter((trip) => {
    const startedMinutes = minutesSinceMidnight(trip.started_at);
    const endedMinutes = minutesSinceMidnight(trip.ended_at);
    return (
      Math.abs(startedMinutes - timeFilterVal) <= 60 ||
      Math.abs(endedMinutes - timeFilterVal) <= 60
    );
  });
}

function updateScatterPlot(timeFilter) {
        const filteredTrips = filterTripsByTime(trips, timeFilter);

        const filteredStations = computeStationTraffic(stations, filteredTrips);
        timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

        circles
            .data(filteredStations, (d) => d.short_name)
            .join('circle')
            .attr('r', (d) => radiusScale(d.totalTraffic))
            .style('--departure-ratio', (d) =>
              stationFlow(d.departures / d.totalTraffic),
    );
}

function updateTimeDisplay() {
  timeFilter = Number(timeSlider.value);

  if (timeFilter === -1) {
    selectedTime.textContent = '';
    anyTimeLabel.style.display = 'block';
  } else {
    selectedTime.textContent = formatTime(timeFilter);
    anyTimeLabel.style.display = 'none';
  }

  updateScatterPlot(timeFilter);
}

map.on('load', async () => {
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'bike-lanes-boston',
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
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': 'green',
      'line-width': 3,
      'line-opacity': 0.4,
    },
  });

  const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
  const jsonData = await d3.json(jsonurl);
  stations = jsonData.data.stations;

  trips = await d3.csv(
    'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    }
  );

  stations = computeStationTraffic(stations, trips);

  radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  circles = svg
    .selectAll('circle')
    .data(stations, (d) => d.short_name)
    .enter()
    .append('circle')
    .attr('r', (d) => radiusScale(d.totalTraffic))
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.8)
    .each(function (d) {
      d3.select(this)
        .append('title')
        .text(
          `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
        );
    })
    .style('--departure-ratio', (d) =>
    stationFlow(d.departures / d.totalTraffic),
    );

  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy);
  }

  updatePositions();
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  timeSlider = document.getElementById('time-slider');
  selectedTime = document.getElementById('selected-time');
  anyTimeLabel = document.getElementById('any-time');

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();
});
