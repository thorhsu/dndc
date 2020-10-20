var geojsonTool = require("geojson-tools");
var proj4 = require('proj4');
var gju = require("./geojson-utils");

/** 
 * 不管是幾維陣列，攤平成一個所有座標點的一維陣列
 * ex. [[[[1,2],[2,3]]]] => [1,2,2,3]
 * @param: coordinates
 * @return: Array
 */
const flattenDeep = points =>
    points.reduce((allPoints, point) => Array.isArray(point) ?
        allPoints.concat(flattenDeep(point)) : allPoints.concat(point), []);

/** 
 * 不管是幾維陣列，攤平成一個所有座標點的一維陣列
 * ex. [[[[1,2],[2,3]]]] => [[1,2], [2,3]]
 * @param: coordinates
 * @return: Array
 */
const flattenToPoint = points =>
    points.reduce((allPoints, point) => Array.isArray(point[0]) ?
        allPoints.concat(flattenToPoint(point)) : allPoints.concat([point]), []);


/** 
 * 不管是幾維陣列，攤平成含所有線段的陣列
 * ex. [[[[1,2],[2,3]], [[3,4], [5,6]]]] => [[[1,2], [2,3]], [[3,4], [5,6]]]
 * [[1,2], [2,3]] 是第一條線段。[[3,4], [5,6]] 是第二條線段 
 * @param: coordinates
 * @return: Array
 */
const flattenToLine = points =>
    points.reduce((allPoints, point) => Array.isArray(point[0][0]) ?
        allPoints.concat(flattenToLine(point)) : allPoints.concat([point]), []);

proj4.defs([
    ["EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs"],
    ["EPSG:3826", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"],
    ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"]
]);
/**
 * Summary. Find the first param's intersected line
 * @since 2019/07/18
 * @param {GeoJson's feature} feature   GeoJson's feature
 * @param {polygon's feature} polygon   The select frame's feature 
 */
var getIntersectLinesInPolygon = function(geometry, polygon) {
    const points = geometry.coordinates;
    //攤平成線段的集合好進行接下來的工作
    const allLines = flattenToLine([
        [points]
    ]);
    let lineCounter = 0;
    // 回傳的線段會被放到這裡
    let inLines = [];
    let lineStart = false;
    // 第一個點取走，因為接下來geojsonTool.toGeoJSON會自動弄出一個頭尾相連的polygon
    polygon.coordinates[0].pop();
    var geoPolygon = geojsonTool.toGeoJSON(polygon.coordinates, "polygon");
    // 取出所有的線段
    for (const linePoints of allLines) {
        // 取出線段中所有的點去做判斷
        for (const point of linePoints) {
            var geoPoint = geojsonTool.toGeoJSON(point);
            // 判斷出交集的線段有幾條 
            if (gju.pointInPolygon(geoPoint, geoPolygon)) {
                lineStart = true;
                if (!inLines[lineCounter]) {
                    let line = [];
                    line.push(point.reverse());
                    inLines.push(line);
                } else {
                    inLines[lineCounter].push(point.reverse());
                }
            } else {
                // 判斷線段交集是不是結束
                if (lineStart) {
                    lineCounter += 1;
                    lineStart = false;
                }
            }
        }
        // 從前一條線段脫出後，將判斷條件復原 
        if (lineStart) {
            lineCounter += 1;
            lineStart = false;
        }
    }
    return inLines;
}

var pointInPolygon = function(point, polygon) {
    return gju.pointInPolygon(point, polygon)
}

const toGeoJsonPoint = function(lat, lng) {
    return geojsonTool.toGeoJSON([lat, lng], 'point');
}


var pointsInPolygon = function(features, polygon) {
    let points = [];
    for (const feature of features) {
        points.push(feature.geometry.coordinates);
    }
    //攤平成點的集合好進行接下來的工作
    const allPoints = flattenToPoint([
        [points]
    ]);
    // 第一個點取走，因為接下來geojsonTool.toGeoJSON會自動弄出一個頭尾相連的polygon
    polygon.coordinates[0].pop();
    var geoPolygon = geojsonTool.toGeoJSON(polygon.coordinates, "polygon");
    let inPoints = [];
    for (const point of allPoints) {
        var geoPoint = geojsonTool.toGeoJSON(point);
        if (gju.pointInPolygon(geoPoint, geoPolygon)) {
            inPoints.push(point);
        }
    }
    return inPoints.length ? inPoints : false;
}


var lineInPolygon = function(line, polygon) {
    var result = true
    polygon.coordinates[0].pop()
    var geoPolygon = geojsonTool.toGeoJSON(polygon.coordinates, "polygon")
    for (let point of line.coordinates) {
        var geoPoint = geojsonTool.toGeoJSON(point)
        if (gju.pointInPolygon(geoPoint, geoPolygon) === false) {
            result = false
            break
        }
    }
    return result
}

var polygonIntersect = function(polygon1, polygon2) {

}


/**
 * 計算兩個coordinates的距離
 * @param {*} lat1 
 * @param {*} lng1 
 * @param {*} lat2 
 * @param {*} lng2 
 * @param {*} unit 
 * Passed to function:                                                    :::
//:::    lat1, lng1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lng2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                   
 */
const distance = function(lat1, lng1, lat2, lng2, unit = 'K') {
        if ((lat1 == lat2) && (lng1 == lng2)) {
            return 0;
        } else {
            var radlat1 = Math.PI * lat1 / 180;
            var radlat2 = Math.PI * lat2 / 180;
            var theta = lng1 - lng2;
            var radtheta = Math.PI * theta / 180;
            var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            if (dist > 1) {
                dist = 1;
            }
            dist = Math.acos(dist);
            dist = dist * 180 / Math.PI;
            dist = dist * 60 * 1.1515;
            if (unit == "K") { dist = dist * 1.609344 }
            if (unit == "N") { dist = dist * 0.8684 }
            return dist;
        }
    }
    /**
     * PointA to a line that constitute by PointB and PointC
     * @param {*} coordinateA 
     * @param {*} coordinateB 
     * @param {*} coordinateC 
     */
const distanceToLine = function(coordinateA, coordinateB, coordinateC) {
    const a2b = distance(...coordinateA, ...coordinateB) * 1000;
    const a2c = distance(...coordinateA, ...coordinateC) * 1000;
    const b2c = distance(...coordinateB, ...coordinateC) * 1000;
    //兩點距離太短時，會變成 0
    if (b2c === 0) {
        return a2b;
    }
    const a2bPow = a2b * a2b;
    const b2cPow = b2c * b2c;
    const a2cPow = a2c * a2c;
    const result = a2bPow - Math.pow((a2bPow + b2cPow - a2cPow) / (2 * b2c), 2);
    // 公式是正確的，但b和c兩點太接近時會因為浮點數計算而發生錯誤
    if (result < 0) {
        // console.log("isNan:", result);
        if (a2b < a2c) {
            return a2b;
        }
        return a2c;
    }
    return Math.sqrt(result);
}

const __style = {
    "emulatePolygon": {
        paint: {
            'fill-color': '#888',
            'fill-opacity': 0.5,
            'fill-outline-color': '#111'
        }
    },
    "emulateLine": {
        paint: {
            "line-color": "#888",
            "line-width": 5
        }
    }
}

// coordinate conversions between 900913(3857) - 4326(lat lon)
const degrees2meters = function(lon, lat) {
    var x = lon * 20037508.34 / 180;
    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.34 / 180;
    return [x, y]
}

// coordinate conversions between 4326(lat lon) - 900913(3857)
const meters2degrees = function(x, y) {
    var lon = x * 180 / 20037508.34;
    //thanks magichim @ github for the correction
    var lat = Math.atan(Math.exp(y * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
    return [lon, lat]
}

const convertToDeep = (espgCodeFrom, espgCodeTo, coordinates) => {
    // 如果是[120, 11]這樣的，就是只有一個點
    if (coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
        coordinates = proj4(`EPSG:${espgCodeFrom}`, `EPSG:${espgCodeTo}`, coordinates);
    } else {
        coordinates.forEach((next, index) => {
            Array.isArray(next[0]) ?
                convertToDeep(espgCodeFrom, espgCodeTo, next) : coordinates[index] = proj4(`EPSG:${espgCodeFrom}`, `EPSG:${espgCodeTo}`, coordinates[index]);
            // console.log(`EPSG:${espgCodeFrom}`, `EPSG:${espgCodeTo}`, coordinates[index]);
        });
    }
}

const sortObj = unordered => {
    if (!unordered) {
        return unordered;
    }
    if (typeof unordered === 'object') {
        const ordered = {};
        Object.keys(unordered).sort().forEach(function(key) {
            ordered[key] = unordered[key];
        });
        return ordered;
    }
    return unordered;
}

const reOrganizeGeojson = (data, filePattern) => {
    let reorgnizedProperties = {}
    for (let feature of data.features) {
        const original_properties = _.cloneDeep(feature.properties);
        const geometrykey = JSON.stringify(sortObj(feature.geometry));
        // 如果已經有了此property就往下加
        if (reorgnizedProperties[geometrykey]) {
            reorgnizedProperties[geometrykey].properties.push(original_properties);
        } else {
            reorgnizedProperties[geometrykey] = _.cloneDeep(feature);
            // 放到陣列中
            reorgnizedProperties[geometrykey].properties = [original_properties];
        }

    }
    // console.log(reorgnizedProperties);
    let newFeatures = [];
    let property4order, substr, newSubstr;
    if (filePattern) {
        property4order = filePattern.property4order;
        if (filePattern.replace_string) {
            substr = Object.keys(filePattern.replace_string)[0];
            newSubstr = Object.values(filePattern.replace_string)[0];
        }
    }
    for (let feature of Object.values(reorgnizedProperties)) {
        let newFeature = {};
        for (let key in feature) {
            if (key === "properties") {
                let properties_arr = feature[key];
                // 如果有載明使用那個property做排序的話
                if (property4order) {
                    properties_arr = feature[key].sort((a, b) =>
                        a[property4order] === b[property4order] ? 0 : a[property4order] < b[property4order] ? -1 : 1
                    );
                }

                newFeature[key] = {};
                for (let i = 0; i < properties_arr.length; i++) {
                    const properties = properties_arr[i];
                    for (let property_key in properties) {
                        // console.log("property value", properties[property_key]);
                        const property_val = (substr && newSubstr && typeof properties[property_key] === "string") ? properties[property_key].replace(substr, newSubstr) : properties[property_key];
                        newFeature[key][`${i}#${property_key}`] = property_val;
                    }
                }
            } else {
                newFeature[key] = feature[key];
            }
        }
        newFeatures.push(newFeature);
    }
    return newFeatures;
}


const transfer_coordinates = function(espgCodeFrom, espgCodeTo, data, filePattern) {
    for (let feature of data.features) {
        // 保留原來數據
        if (espgCodeFrom !== 3857) {
            feature.properties[`EPSG${espgCodeFrom}`] = _.cloneDeep(feature.geometry.coordinates);
        }
        if (feature.geometry.type === "MultiPolygon") {
            feature.geometry.type = "Polygon";
        }
        // 如果from和to不相同時，就需要轉換，否則不用
        if (espgCodeFrom !== espgCodeTo) {
            convertToDeep(espgCodeFrom, espgCodeTo, feature.geometry.coordinates);
        }
    }
    return data;
}


/*
 * UUID的產生法
 */
const uuid = () => {
    var d = Date.now();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}




module.exports = {
    distance,
    pointInPolygon,
    pointsInPolygon,
    getIntersectLinesInPolygon,
    lineInPolygon,
    polygonIntersect,
    toGeoJsonPoint,
    distanceToLine,
    degrees2meters,
    meters2degrees,
    flattenToLine,
    flattenToPoint,
    transfer_coordinates,
    uuid,
}