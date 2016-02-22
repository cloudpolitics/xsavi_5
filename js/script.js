var map = L.map('map').setView([40.65,-73.93], 11);

// set a tile layer to be CartoDB tiles
var CartoDBTiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{
  attribution: 'Map Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors, Map Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
});

// add these tiles to our map
map.addLayer(CartoDBTiles);

var neighborhoodsGeoJSON;

$.getJSON( "geojson/NYC_neighborhood_data.geojson", function( data ) {
    // ensure jQuery has pulled all data out of the geojson file
    var neighborhoods = data;
    plotDataset(neighborhoods);
    // create the sidebar with links to fire polygons on the map
    createListForClick(neighborhoods);
});

// function to plot the dataset passed to it
function plotDataset(neighborhoods) {
  neighborhoodsGeoJSON = L.geoJson(neighborhoods, {
      style: povertyStyle,
      onEachFeature: povertyClick
  }).addTo(map);

  // create layer controls
  createLayerControls();
}

// neighborhood choropleth map
// let's use % in poverty to color the neighborhood map
var povertyStyle = function (feature){
    var value = feature.properties.PovertyPer;
    var fillColor = null;
    if(value >= 0 && value <=0.1){
        fillColor = "#fee5d9";
    }
    if(value >0.1 && value <=0.15){
        fillColor = "#fcbba1";
    }
    if(value >0.15 && value<=0.2){
        fillColor = "#fc9272";
    }
    if(value > 0.2 && value <=0.3){
        fillColor = "#fb6a4a";
    }
    if(value > 0.3 && value <=0.4) {
        fillColor = "#de2d26";
    }
    if(value > 0.4) {
        fillColor = "#a50f15";
    }

    var style = {
        weight: 1,
        opacity: .1,
        color: 'white',
        fillOpacity: 0.3,
        fillColor: fillColor
    };

    return style;
};

// empty L.popup so we can fire it outside of the map
var popup = new L.Popup();

// set up a counter so we can assign an ID to each layer
var count = 0;

// on each feature function that loops through the dataset, binds popups, and creates a count
var povertyClick = function (feature, layer) {
    var percent = feature.properties.PovertyPer * 100;
    percent = percent.toFixed(0);
    // let's bind some feature properties to a pop up with an .on("click", ...) command. We do this so we can fire it both on and off the map
    layer.on("click", function (e) {
        var bounds = layer.getBounds();
        var popupContent = "<strong>Neighborhood:</strong> " + feature.properties.NYC_NEIG + "<br /><strong>Percent in Poverty: </strong>" + percent + "%";
        popup.setLatLng(bounds.getCenter());
        popup.setContent(popupContent);
        map.openPopup(popup);
    });

    // we'll now add an ID to each layer so we can fire the popup outside of the map
    layer._leaflet_id = 'neighborhoodLayerID' + count;
    count++;
}


// function to create a list in the right hand column with links that will launch the pop-ups on the map
function createListForClick(dataset) {
    // use d3 to select the div and then iterate over the dataset appending a list element with a link for clicking and firing
    // first we'll create an unordered list ul elelemnt inside the <div id='list'></div>. The result will be <div id='list'><ul></ul></div>
    var ULs = d3.select("#list")
                .append("ul");


    // now that we have a selection and something appended to the selection, let's create all of the list elements (li) with the dataset we have

    ULs.selectAll("li")
        .data(dataset.features)
        .enter()
        .append("li")
        .html(function(d) {
            return '<span>' + d.properties.NYC_NEIG + '</span>';
        })
        .on('click', function(d, i) {
            var leafletId = 'neighborhoodLayerID' + i;
            map._layers[leafletId].fire('click');
        });


}

// lets add data from the API now
// set a global variable to use in the D3 scale below
// use jQuery geoJSON to grab data from API
$.getJSON( "https://data.cityofnewyork.us/resource/qfe3-6dkn.json", function( data ) {
    var dataset = data;
    // draw the dataset on the map
    plotAPIData(dataset);

});

// create a leaflet layer group to add your API dots to so we can add these to the map
var apiLayerGroup = L.layerGroup();

// since these data are not geoJson, we have to build our dots from the data by hand
function plotAPIData(dataset) {
    // set up D3 ordinal scle for coloring the dots just once
    var ordinalScale = setUpD3Scale(dataset);
    //console.log(ordinalScale("Noise, Barking Dog (NR5)"));
    // loop through each object in the dataset and create a circle marker for each one using a jQuery for each loop
    $.each(dataset, function( index, value ) {
        console.log(index);
        console.log(value);
        // check to see if lat or lon is undefined or null
        if ((typeof value.latitude !== "undefined" || typeof value.longitude !== "undefined") || (value.latitude && value.longitude)) {
            // create a leaflet lat lon object to use in L.circleMarker
            var latlng = L.latLng(value.latitude, value.longitude);

            var apiMarker = L.circleMarker(latlng, {
                stroke: false,
                fillColor: ordinalScale(value.descriptor),
                fillOpacity: 1,
                radius: 5
            });

            // bind a simple popup so we know what the noise complaint is
            apiMarker.bindPopup(value.descriptor);

            // add dots to the layer group
            apiLayerGroup.addLayer(apiMarker);

        }

    });

    apiLayerGroup.addTo(map);

}

function setUpD3Scale(dataset) {
    //console.log(dataset);
    // create unique list of descriptors
    // first we need to create an array of descriptors
    var descriptors = [];

    // loop through descriptors and add to descriptor array
    $.each(dataset, function( index, value ) {
        descriptors.push(value.descriptor);
    });

    // use underscore to create a unique array
    var descriptorsUnique = _.uniq(descriptors);

    // create a D3 ordinal scale based on that unique array as a domain
    var ordinalScale = d3.scale.category20()
        .domain(descriptorsUnique);

    return ordinalScale;

}

function createLayerControls(){
    // add in layer controls
    var baseMaps = {
        "CartoDB Basemap": CartoDBTiles,
    };

    var overlayMaps = {
        "Neighborhoods": neighborhoodsGeoJSON,
    };

    // add control
    L.control.layers(baseMaps, overlayMaps).addTo(map);

}
