import * as maplibregl from 'https://unpkg.com/maplibre-gl@^6.12.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
  container: 'map',
  minZoom: 2.5,
  center: [9.417221068266686, 50.73751843127343],
  style: 'hist_basemap.json'
});

window.map = map;

const DATA_URL = 'cshapes_renamed.geojson';   // adjust path if needed
const slider = document.getElementById('time-slider');
const label = document.getElementById('time-label');
const playBtn = document.getElementById('play-btn');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Dates as comparable integers: YYYYMMDD
const ymd = (y, m, d) => y * 10000 + m * 100 + d;

// Stable pastel-ish colour per country code
const colorFor = (code) => `hsl(${(code * 137.508) % 360}, 45%, 62%)`;

function sliderToYMD(v) {          // slider value = months since year 0
  const y = Math.floor(v / 12), m = (v % 12) + 1;
  return { y, m, num: ymd(y, m, 1), text: `${MONTHS[m - 1]} ${y}` };
}

map.on('load', async () => {
  const geojson = await (await fetch(DATA_URL)).json();

  let minY = Infinity, maxY = -Infinity;
  for (const f of geojson.features) {
    const p = f.properties;
    p._s = ymd(p.gwsyear, p.gwsmonth, p.gwsday);
    p._e = ymd(p.gweyear, p.gwemonth, p.gweday);
    p._color = colorFor(p.gwcode);
    minY = Math.min(minY, p.gwsyear);
    maxY = Math.max(maxY, p.gweyear);
  }

  map.addSource('cshapes', {
    type: 'geojson',
    data: geojson,
    generateId: true
  });

  map.addSource('background2', {
    type: 'geojson',
    data: 'background.geojson'
  });

  map.addSource('cshapes-labels', { type: 'geojson', data: 'cshapes_labels.geojson' });

  map.addSource('extras', {type: 'geojson', data:'extras.geojson'});
  
  map.addSource('ant', {type: 'geojson', data:'ant.geojson'});

  map.addSource('lakes', {type: 'geojson', data: 'lakes.geojson'});

  map.addLayer({
    id: 'ant-fill',
    type: 'fill',
    source: 'ant',
    paint: {'fill-color': 'lightgray'}
  });

  map.addLayer({
    id: 'ant-line',
    type: 'line',
    source: 'ant',
    paint: {'line-color': 'black',
        'line-width': 2
    }
  });
  
  map.addLayer({
    id: 'extras-fill',
    type:'fill',
    source:'extras',
    paint:{'fill-color':'white'}
  });

  map.addLayer({
    id: 'background2',
    type: 'fill',
    source: 'background2',
    paint: {'fill-color':'lightgray'}
  });



  map.addLayer({
    id: 'states-fill',
    type: 'fill',
    source: 'cshapes',
    paint: {
        'fill-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#ffe9a8',   // hover color
        'white'      // normal color
        ],
        'fill-opacity': 1
    }
  });

  map.addLayer({
    id: 'states-line',
    type: 'line',
    source: 'cshapes',
    paint: { 'line-color': 'black', 'line-width': 0.8 }
  });

    map.addLayer({
        id: 'background2-line',
        type: 'line',
        source: 'background2',
        paint: {'line-color': 'black',
            'line-width': 2
        }
    });

    map.addLayer({
        id: 'extras-line',
        type:'line',
        source:'extras',
        paint:{'line-color':'black',
            'line-width': 2
        }
    });

    map.addLayer({
        id: 'lakes-fill',
        type: 'fill',
        source: 'lakes', 
        paint: {
            'fill-color': '#d6ebff'
        }
    });


  const LABEL_FONT = ['Roboto Condensed']; // must exist in your style's glyphs

  map.addLayer({
    id: 'states-label',
    type: 'symbol',
    source: 'cshapes-labels',          // was 'cshapes'
    layout: {
        'text-field': ['get', 'cntry_name'],
        'text-font': LABEL_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 2.5, 12, 6, 16],
        'text-max-width': 6,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
        'symbol-sort-key': ['-', ['get', 'area_km2']]   // big countries win collisions
    },
    paint: {
        'text-color': '#3b2f1e',
        'text-halo-color': 'rgba(255,255,255,0.85)',
        'text-halo-width': 1.5
    }
});

  const setTime = (v) => {
    const t = sliderToYMD(v);
    label.textContent = t.text;
    const filter = ['all', ['<=', ['get', '_s'], t.num], ['>=', ['get', '_e'], t.num]];
    map.setFilter('states-fill', filter);
    map.setFilter('states-line', filter);
    map.setFilter('states-label', filter);  
  };

  slider.min = minY * 12;
  slider.max = maxY * 12 + 11;
  slider.value = 1914 * 12;        // start year
  slider.disabled = false;
  slider.addEventListener('input', () => setTime(+slider.value));
  setTime(+slider.value);

  // Play / pause
  let timer = null;
  playBtn.addEventListener('click', () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    playBtn.classList.remove('playing');
    return;
  }
  playBtn.classList.add('playing');
  timer = setInterval(() => {
    if (+slider.value >= +slider.max) { playBtn.click(); return; }
    slider.value = +slider.value + 3;
    setTime(+slider.value);
  }, 120);
    });

  // Hover popup with country name
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,                 // keep it off the cursor
    className: 'hover-popup'    // for the CSS below
    });
  
  let hoveredId = null;
    let hoveredCode = null;

    map.on('mousemove', 'states-fill', (e) => {
    const f = e.features[0];
    const p = f.properties;
    map.getCanvas().style.cursor = 'pointer';

    // Move the highlight when the hovered feature changes
    if (f.id !== hoveredId) {
        if (hoveredId !== null) {
        map.setFeatureState({ source: 'cshapes', id: hoveredId }, { hover: false });
        }
        hoveredId = f.id;
        map.setFeatureState({ source: 'cshapes', id: hoveredId }, { hover: true });
    }

    // Popup (only rebuild HTML when the country changes)
    if (p.gwcode !== hoveredCode) {
        hoveredCode = p.gwcode;
        popup.setHTML(`<strong>${p.cntry_name}</strong>`);
    }
    popup.setLngLat(e.lngLat);
    if (!popup.isOpen()) popup.addTo(map);
    });

    map.on('mouseleave', 'states-fill', () => {
    if (hoveredId !== null) {
        map.setFeatureState({ source: 'cshapes', id: hoveredId }, { hover: false });
    }
    hoveredId = null;
    hoveredCode = null;
    map.getCanvas().style.cursor = '';
    popup.remove();
    });
});