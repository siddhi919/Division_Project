
var map = L.map("map").setView([20.596, 78.96], 5, L.CRS.EPSG4326);


//Basemaps
var OSM = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


var Maharashtra = L.tileLayer.wms("http://localhost:8080/geoserver/Maharashtra_data/wms", {
  layers: "	Maharashtra_data:Maharashtra",
  format: "image/png",
  version: "1.1.0",
  transparent: true
});
Maharashtra.addTo(map);

// Division

$(document).ready(function() {
  showLoader();
  $.ajax({
    type: "GET",
    url: "http://localhost:8080/geoserver/wfs?request=getCapabilities",
    datatype: "xml",
    success: function(xml) {
      var select = $("#select_division");
      var desiredLayerNames = [
        "Maharashtra_data:Konkan Division",
        "Maharashtra_data:Pune Division",
        "Maharashtra_data:Nashik Division",
        "Maharashtra_data:Aurangabad Division",
        "Maharashtra_data:Amaravati Division",
        "Maharashtra_data:Nagpur Division", 
      ];

      $(xml).find("FeatureType").each(function() {
        var layerName = $(this).find("Name").text();
      // console.log(layerName)
        if (desiredLayerNames.includes(layerName)) {
          select.append(
            "<option class='ddindent' value='" +
            layerName +
            "'>" +
            layerName +
            "</option>"
          );
         
        }
      });
       hideLoader();

    },
    error: function(xhr, status, error) {
      console.error("Error retrieving capabilities:", error);
    }
  })
})
var selectedLayer;

$(document).ready(function() {
  // showLoader();
  $("#select_division").on("change", function() {
    showLoader();
    talukaLayerGroup.clearLayers();
    if (selectedLayer) {
      map.removeLayer(selectedLayer);
    }


    var selectedLayerName = $(this).val();
    console.log(selectedLayerName)

    if (selectedLayerName) {
      axios.get("http://localhost:8080/geoserver/wms?request=getCapabilities")
        .then(function(response) {
          const json = new WMSCapabilities(response.data).toJSON();
          console.log(json)
          const layer = json?.Capability?.Layer?.Layer?.find(function(l) {
            return l.Name === selectedLayerName;
          
          });
       
          console.log(layer)
          if (layer && layer.BoundingBox) {
            const bbox = layer.BoundingBox[0].extent;
            map.fitBounds([
              [bbox[1], bbox[0]],
              [bbox[3], bbox[2]]
            ]);
          }
          hideLoader();
        })
        .catch(function(error) {
          console.error("Error retrieving capabilities:", error);
        });
      selectedLayer = L.tileLayer.wms("http://localhost:8080/geoserver/Maharashtra_data/wms", {
        layers: selectedLayerName,
        format: "image/png",
        version: "1.1.0",
        transparent: true
      });
      selectedLayer.addTo(map);
    }
  });
});


// District

$(document).ready(function() {
  var geojsonLayer;
  $("#select_district").append('<option value="">Select District</option>');
  $("#select_division").on("change", function() {
    showLoader();
    var selectedLayerName = $(this).val();
    console.log(selectedLayerName)
    if (selectedLayerName) {
      $.ajax({
        type: "GET",
        url: "http://localhost:8080/geoserver/Maharashtra_data/ows",
        data: {
          service: "WFS",
          version: "1.1.0",
          request: "GetFeature",
          typeName: selectedLayerName,
          outputFormat: "application/json"
        },
        dataType: "json",
        success: function(data) {
          console.log(data);
          $("#select_district").empty().append('<option value="">Select District</option>');
          data.features.forEach(function(feature) {
            var distName = feature.properties.Dist_Name;
            // console.log(distName);
            $("#select_district").append('<option value="' + distName + '">' + distName + '</option>');
          });
          geojsonLayer = L.geoJSON(data);
          hideLoader();
        },
        error: function(xhr, status, error) {
          console.error("Error retrieving GeoJSON data:", error);
        }
      });
    }
  });




  var highlightedDistrict;
  $("#select_district").on("change", function() {
    var selectedDistrictName = $(this).val();
    console.log(selectedDistrictName)
    fitBoundsToDistrict(selectedDistrictName);
   
  });
 

  function fitBoundsToDistrict(districtName) {
    if (geojsonLayer) {
      var selectedDistrict = geojsonLayer.getLayers().find(function(layer) {
        return layer.feature.properties.Dist_Name === districtName;
      });
  
      if (selectedDistrict) {
        if (highlightedDistrict) {
          map.removeLayer(highlightedDistrict);
        }
        selectedDistrict.setStyle({
          fillColor: "red",
          fillOpacity: 0.6,
          color: "black",
          weight: 2
        });
        highlightedDistrict = selectedDistrict.addTo(map);
        var bounds = selectedDistrict.getBounds();
        map.fitBounds(bounds);
      }
      
    }
  }
  
  $("#select_division").on("change", function() {
    if (highlightedDistrict) {
      map.removeLayer(highlightedDistrict);
      highlightedDistrict = null;
    }
  });
  $(".Clear").on("click", function() {
    if (highlightedDistrict) {
      map.removeLayer(highlightedDistrict);
      highlightedDistrict = null;
    }
  })
})



// Taluka
var talukaLayerGroup = L.layerGroup().addTo(map);
$("#select_Taluka").append('<option value="">Select Taluka</option>');

$("#select_district").on("change", function() {
  showLoader();
  talukaLayerGroup.clearLayers();
  fetch('http://localhost:8080/geoserver/Maharashtra_data/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Maharashtra_data:Taluka&outputFormat=application%2Fjson')
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      console.log(data)
      var selectedDistrictName = $("#select_district").val();
      var talukaSelect = document.getElementById('select_Taluka');
      talukaSelect.innerHTML = ''; 
       var emptyOption = document.createElement('option');
       emptyOption.value = "";
       emptyOption.text = "Select Taluka";
       talukaSelect.add(emptyOption);

      data.features.forEach(function(feature) {
        var districtName = feature.properties.NAME_2;
        if (districtName === selectedDistrictName) {
          var talukaName = feature.properties.NAME_3;
          // console.log(talukaName);
          var option = document.createElement('option');
          option.text = talukaName;
          talukaSelect.add(option);
          var talukaLayer = L.geoJSON(feature.geometry, {
            style: {
              fillColor: 'red',
              weight: 2,
              opacity: 1,
              color: 'white',
              fillOpacity: 0.6
            },
            onEachFeature: function(feature, layer) {
              layer.bindTooltip(talukaName, {
                permanent: true,
                direction: 'center',
                className: 'taluka-label'
              });
            }
          });

          talukaLayerGroup.addLayer(talukaLayer);
          talukaSelect.addEventListener('change', function() {
            var selectedTalukaName = talukaSelect.value;
            if (talukaName === selectedTalukaName) {
              talukaLayer.setStyle({
                fillColor: 'blue' 
              });
            } else {
              talukaLayer.setStyle({
                fillColor: 'red' 
              });
            }
          });
        }
      });
    });
     hideLoader();
});


$(document).ready(function() {
  $(".Clear").on("click", function() {
    if (selectedLayer) {
      map.removeLayer(selectedLayer);
      selectedLayer = null;
    }
    talukaLayerGroup.clearLayers();
    $("#select_division").val("Select Division");
    $("#select_district").empty().append('<option selected>Select District</option>');
    $("#select_Taluka").empty().append('<option selected>Select Taluka</option>');
    map.setView([20.596, 78.96], 5);
  });
});



// To show the loader
function showLoader() {
  $("#loader").show();
}

// To hide the loader
function hideLoader() {
  $("#loader").hide();
}

















































































