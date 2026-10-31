import * as maplibregl from 'https://unpkg.com/maplibre-gl@^6.12.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
  container: 'map',
  minZoom: 2.5,
  center: [9.417221068266686, 50.73751843127343],
  style: 'hist_basemap.json'
});

window.map = map;

map.on('load', () => {

    map.addSource('background-fill', {
        type: 'geojson',
        data: 'world_2010.geojson',
        generateId: true
    })

    map.addSource('world_1920', {
        type: 'geojson',
        data: 'world_1920.geojson',
        generateId: true
    });

    map.addSource('world_1920_labels', {
    type: 'geojson',
    data: 'world_1920_labels.geojson'
    }); 

    map.addLayer({
        id: 'background-fill',
        type: 'fill',
        source: 'background-fill',
        paint: {
            'fill-color': 'hsl(0, 0%, 95%)'
        }
    }, 'water-labels');

    map.addLayer({
        id: 'world_1920fill',
        type: 'fill',
        source: 'world_1920',
        paint: {
            'fill-color': '#ffffff'
        }
    }, 'water-labels')
    

    map.addLayer({
        id: 'world_1920line',
        type: 'line',
        source: 'world_1920',
        paint: {
            'line-color': 'hsl(0, 0%, 0%)',
            'line-width': 0.5
        }
    }, 'water-labels')

    map.addLayer({
    id: 'world_1920labels',
    type: 'symbol',
    source: 'world_1920_labels',
    layout: {
        'text-field': ['get', 'NAME'],
        'text-font': ['Roboto Flex'],
        'text-size': 14,
        'text-max-width': 8
    },
    paint: {
        'text-color': '#676767',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
    }
});

    
    

})