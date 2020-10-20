var fs = require("fs");
var { uuid } = require("../geojson/utils");
var startTime = new Date().getTime();
fs.readFile("../shp2geojson/soil_at_a.shp.geojson", "utf-8", function(err, data) {
    if (err) {
        console.log("error happned:" + data);
    } else {
        data = JSON.parse(data);
        data.features.forEach(feature => {
            feature.properties["uuid"] = uuid();
        });
        data = JSON.stringify(data, null, 2)
        console.log(data);
    }
    var endTime = new Date().getTime();

    console.log(endTime - startTime);
});
console.log("-----End-------");