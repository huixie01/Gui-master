/* utils.js */

window.severityTypes = ["Info", "Warn", "Error"];
window.priorityTypes = ["Low", "Normal", "High"];
window.statusTypes = ["Open", "Acknowledged", "Closed"]; 
window.alertOperators = [">", "<"];
window.alertTriggerTypes = ["threshold", "baseline", "correlation"];
window.alertSourceTypes = ["threshold", "baseline", "req", "rsp", "rtt", "correlations", "cpr", "watch-score"]
window.sessionFieldDataTypes = ["none", "number", "string", "boolean", "datetime", "amount"]
window.sessionFieldDisplayTypes = ["none", "basic", "detail"]
window.sessionProtocolOrders = {"TCP": 1, "UDP": 2, "ICMP": 3, "ARP": 4, "HTTP": 5, "DNS": 6, "MYSQL": 7}

window.nodeType = [
  {
    "width": 32,
    "height": 64,
    "image": "/static/img/server-default-blue.png", 
    "name": "Server"
  }, 
  {
    "width": 32,
    "height": 64,
    // "image": "/static/img/server-web.png",
    "image": "/static/img/server-web-blue.png", 
    "name": "Web Server"
  },
  {
    "width": 32,
    "height": 64,
    // "image": "/static/img/server-database.png",
    "image": "/static/img/server-database-blue.png",
    "name": "DB Server" 
  },
  {
    "width": 32,
    "height": 64,
    // "image": "/static/img/server-database.png",
    "image": "/static/img/server-file-blue.png",
    "name": "File Server" 
  },
  {
    "width": 32,
    "height": 64,
    // "image": "/static/img/server-database.png",
    "image": "/static/img/server-lb-blue.png", 
    "name": "LB Server"
  },
  {
    "width": 32,
    "height": 64,
    // "image": "/static/img/server-database.png",
    "image": "/static/img/server-lb-blue.png",
    "name": "LB Server" 
  }            
]
window.metricInterval = 30;
window.metricUnitMap = {
  "count": ["Counts"],
  "byte": ["Bytes", "Bps", "bits", "bps"],
  "packet": ["Packets", "pps"],
  "frame": ["Frames", "fps"]
};
window.metricUnitDef = {  
  "Counts": ["Counts", 1],
  "Frames": ["Frames", 1],
  "Bytes": ["Bytes", 1],  
  "Packets": ["Packets", 1],
  "Bps": ["Bps - Bytes per second", metricInterval],
  "bits": ["bits", 0.125],
  "bps": ["bps - bits per second", 0.125 * metricInterval],
  "pps": ["pps", metricInterval],
  "ms": ["ms", 1]
};        

function getSIPrefixString(d) {
  var prefix = d3.formatPrefix(d, 0);
  return d3.round(prefix.scale(d), 2) + prefix.symbol.toUpperCase();      
}


function invokeAPI(url, data, type, callback) {
  $.ajax({
    url : url,
    data : data,
    type : type,
    contentType : 'application/json',
    dataType: 'json'
  }).done(function(data) {
    if (_.isFunction(callback)) {
      callback(data);
    }
    // console.log(type + " success!");
  });  
}
//
function getURLParameter(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}

//
function trafficFormat(value) {
    var intGiga = 1000000000;
    var intMega = 1000000;
    var intKilo = 1000;
    if (value >= intGiga)
        return (value * 1.0 / intGiga).toFixed(2) + " Gbps";
    else if (value >= intMega)
        return (value * 1.0 / intMega).toFixed(2) + " Mbps";
    else if (value >= intKilo)
        return (value * 1.0 / intKilo).toFixed(2) + " Kbps";
    else
        return value + " bps";
}

//
function durationString(startTime, endTime) {
    var durationSec = (endTime.getTime() - startTime.getTime()) / 1000;
    var hours = parseInt(durationSec / 3600);
    var minutes = parseInt((durationSec % 3600) / 60);
    var seconds = parseInt(durationSec % 60);
    return (hours > 9 ? hours : "0" + hours + ":") + (minutes > 9 ? minutes : "0" + minutes) + ":" + (seconds > 9 ? seconds : "0" + seconds);
}

// format time
function formatDateTime(datetime) {
  var d = new Date(datetime);
  Number.prototype.padLeft = function(base,chr) {
    var  len = (String(base || 10).length - String(this).length) + 1;
    return len > 0 ? new Array(len).join(chr || '0') + this : this;
  }  
  return [(d.getMonth() + 1).padLeft(), d.getDate().padLeft(), d.getFullYear()].join('/') + ' ' 
    + [d.getHours().padLeft(), d.getMinutes().padLeft(), d.getSeconds().padLeft()].join(':'); 
}

//
function pastTimeString(pastTime) {
    var count = 0;
    var secPast = parseInt(((new Date()).getTime() - pastTime) / 1000);
    if (secPast > 3600 * 24 * 30) {
        count = parseInt(secPast / (3600 * 24 * 30));
        return count > 1 ? count + " Months ago" : count + " Month ago";
    } else if (secPast > 3600 * 24 * 7) {
        count = parseInt(secPast / (3600 * 24 * 7));
        return count > 1 ? count + " Weeks ago" : count + " Week ago";
    } else if (secPast > 3600 * 24) {
        count = parseInt(secPast / (3600 * 24));
        return count > 1 ? count + " Days ago" : count + " Day ago";
    } else if (secPast > 3600) {
        count = parseInt(secPast / 3600);
        return count > 1 ? count + " Hours ago" : count + " Hour ago";
    } else {
        count = parseInt(secPast / 60);
        return count > 1 ? count + " Minutes ago" : count + " Minute ago";
    }
}
