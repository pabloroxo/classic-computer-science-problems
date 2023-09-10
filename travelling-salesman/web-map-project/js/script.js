var locations = [];
var routes =  [];
var lines = [];
var map;
var popup;
var start;
var end;
var shortestDistance = [];
var shortestRoute = [];

// EVENTS

// Initializing map
$(document).ready(function () {
    map = L
        .map('map')
        .setView(
            [
                -12.974722,
                -38.476665,
            ],
            13,
        );

    L
        .tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
        )
        .addTo(map);

    popup = L.popup();

    map.on('click', onMapClick);
});

// Clicking on map
function onMapClick(e) {
    const latitude = e.latlng.lat.toFixed(5);
    const longitude = e.latlng.lng.toFixed(5);

    popup
        .setLatLng(e.latlng)
        .setContent(`
            <div class="text-center">
                <div>
                    <p>Latitude: ${latitude}</p>
                    <p>Longitude: ${longitude}</p>
                    <button id="add-location" class="btn btn-primary btn-sm" data-latitude="${latitude}" data-longitude="${longitude}">Add this location to list</button>
                </div>
            </div>
        `)
        .openOn(map);
}

// Adding a location
$(document).on('click', '#add-location', function () {
    const latitude = $(this).data('latitude');
    const longitude = $(this).data('longitude');

    var marker = addMarker(latitude, longitude);
    addLocation(latitude, longitude, marker);

    $('#result').html('');
    removeLines();
    resetCounters();

    calculateDistances();
    updateLocationsTable();

    map.closePopup();
});

// Positioning mouse cursor on list item
$(document).on('mouseover', '.location-row', function () {
    const id = $(this).data('id');

    var location = locations.find((location) => {
        if (location.id === id) {
            return location;
        }
    });

    location.marker._icon.src = 'img/marker-icon-hover.png';
});

// Leaving mouse cursor from list item
$(document).on('mouseout', '.location-row', function () {
    locations.forEach((location) => {
        location.marker._icon.src = 'img/marker-icon.png';
    });
});

// Setting a location to be the start
$(document).on('click', '.location-set-start', function () {
    const id = $(this).parent().parent().data('id');

    locations.map((location) => {
        location.isStart = (location.id === id);
        return location;
    });

    $('#result').html('');
    removeLines();
    updateLocationsTable();
});

// Setting a location to be the end
$(document).on('click', '.location-set-end', function () {
    const id = $(this).parent().parent().data('id');

    locations.map((location) => {
        location.isEnd = (location.id === id);
        return location;
    });

    removeLines();
    $('#result').html('');
    updateLocationsTable();
});

// Removing a location
$(document).on('click', '.location-remove', function () {
    const id = $(this).parent().parent().data('id');

    var locationsTemp = [];

    locations.forEach((location) => {
        if (location.id === id) {
            map.removeLayer(location.marker)
        } else  {
            locationsTemp.push(location);
        }
    });

    locations = locationsTemp;

    $('#result').html('');
    removeLines();
    resetCounters();

    calculateDistances();
    updateLocationsTable();
});

// Calculating shortest route between locations
$('#calculate-route').click(function () {
    if (locations.length < 3) {
        $('#result').html('You need at least 3 locations to calculate route');
        return;
    }

    start = locations.find((location) => {
        if (location.isStart) {
            return location;
        }
    });
    if (!start) {
        $('#result').html('You need a location to start route');
        return;
    }

    end = locations.find((location) => {
        if (location.isEnd) {
            return location;
        }
    });
    if (!end) {
        $('#result').html('You need a location to end route');
        return;
    }

    shortestDistance = 999999;
    locationsRoute = [];

    locations.forEach((location) => {
        if ((location.id !== start.id) && (location.id !== end.id)) {
            locationsRoute.push(location.id);
        }
    });

    const startTime = moment();

    heapsPermute(locationsRoute);

    var result = 'Shortest route: ';
    var count = 0;

    shortestRoute.forEach((location) => {
        result += (location + 1);

        if (count++ < (shortestRoute.length - 1)) {
            result += ' -> ';
        }
    });
    
    connectMarkers();

    result += '<br />Total distance: ' + shortestDistance.toFixed(1) + 'kms';
    
    const endTime = moment();
    const duration = moment.duration(endTime.diff(startTime));

    result += '<br />Calculated in: ' + duration.hours() + 'h ' + duration.minutes() + 'm ' + duration.seconds() + 's ';

    $('#result').html(result);
});

// ACTIONS

// Adding marker to map
function addMarker(latitude, longitude) {
    var marker = L
        .marker(
            [
                latitude,
                longitude,
            ],
        )
        .addTo(map);

    return marker;
}

// Adding location to list
function addLocation(latitude, longitude, marker) {
    var location = {
        latitude,
        longitude,
        marker,
        isStart: false,
        isEnd: false,
    };

    locations.push(location);
}

// Calculating distanced between locations in list
function calculateDistances() {
    var i, j;

    routes =  [];

    for (i = 0; i < (locations.length - 1); i++) {
        for (j = (i + 1); j < locations.length; j++) {
            const distance = {
                from: locations[i].id,
                to: locations[j].id,
                distance: calculateDistance(
                    locations[i].latitude,
                    locations[i].longitude,
                    locations[j].latitude,
                    locations[j].longitude,
                ),
            }

            routes.push(distance);
        }
    }
}

// Resetting IDs of locations in list
function resetCounters() {
    var counter = 0;

    locations.map((location) => {
        return location.id = counter++;
    });
}

// Updating table with locations
function updateLocationsTable() {
    $('.location-row').remove();

    locations.forEach((location) => {
        $('#locations').append(`
            <tr class="location-row" data-id="${location.id}">
                <td>${location.id + 1}</td>
                <td>${location.latitude}</td>
                <td>${location.longitude}</td>
                <td>
                    <button class="btn btn-${location.isStart ? 'success' : 'light'} btn-sm location-set-start">Start</button>
                    <button class="btn btn-${location.isEnd ? 'dark' : 'light'} btn-sm location-set-end">End</button>
                    <button class="btn btn-danger btn-sm location-remove">Remove</button>
                </td>
            </tr>
        `);
    })
}

// HEAP'S PERMUTATION

// Swapping items in array
var swap = function (array, i, j) {
    var temp;

    temp = array[i];
    array[i] = array[j];
    array[j] = temp;
};

// Permuting to find all combinations within a list of items
var heapsPermute = function (array, n) {
    var i, j;

    n = n || array.length;

    if (n === 1) {
        const newArray = [
            start.id,
            ...array,
            end.id,
        ];

        calculateRoute(newArray);
    } else {
        for (i = 1; i <= n; i++) {
            heapsPermute(array, n - 1);

            if ((n % 2) === 1) {
                j = 1;
            } else {
                j = i;
            }

            swap(array, (j - 1), (n - 1));
        }
    }
};

// DISTANCE CALCULATION

// Degrees to radians conversion
function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

// Calculating the distance between two locations with latitudes and longitudes
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1); 
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const d = R * c;
    return d;
}

// Calculating route between locations in list
function calculateRoute(array) {
    var i, sum = 0;

    for (i = 0; i < (array.length - 1); i++) {
        const from = array[i];
        const to = array[i + 1];

        const route = routes.find((distance) => {
            if (((distance.from === from) && (distance.to === to)) || ((distance.from === to) && (distance.to === from))) {
                return distance;
            }
        });

        sum += route.distance;
    }
    
    if (sum < shortestDistance) {
        shortestDistance = sum;
        shortestRoute = array;
    }
}

// LINE'S FUNCTIONS

// Connecting markers adding red lines betweewn them
function connectMarkers() {
    var i;

    for (i = 0; i < (shortestRoute.length - 1); i++) {
        const from = locations.find((location) => {
            if (shortestRoute[i] === location.id) {
                return location;
            }
        });

        const to = locations.find((location) => {
            if (shortestRoute[i + 1] === location.id) {
                return location;
            }
        });

        const line = L
            .polyline(
                [
                    {
                        lat: from.latitude,
                        lng: from.longitude,
                    },
                    {
                        lat: to.latitude,
                        lng: to.longitude,
                    },
                ],
                {
                    color: 'red',
                },
            )
            .addTo(map);

        lines.push(line);
    }
}

// Removeing all red lines between markers
function removeLines() {
    lines.forEach((line) => {
        line.remove(map);
    });

    lines = [];
}
