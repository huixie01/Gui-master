$(document).ready(function() {
  $("#config-fields").hide();
  
  $(".edit-alert").click(function() {    
    $("#config-fields").show();
    $("#config-content").hide();
    loadTimeseriesData(1);    
  });

  $("#save-alert").click(function() {
    $("#config-fields").hide();
    $("#config-content").show();
  });

  $("#cancel-alert").click(function() {
    $("#config-fields").hide();
    $("#config-content").show();
  });
  
  var margin = {top: 0, right: 0, bottom: 25, left: 25}, width, height;
  
  var parseDate = d3.time.format("%m/%d/%y %H%M%S").parse;
  
  var x, y, xAxis, yAxis;
      
  var color = d3.scale.category10();      
    
  var line = d3.svg.line()
      .interpolate("basis")
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.value); });                
      
  function loadTimeseriesData(metricCount) {          
    d3.tsv("/static/data/Timeseries"+ metricCount + ".tsv", function(error, data) {
      d3.selectAll("svg").remove();
      
      width = $("#live-metric-chart").width() - margin.left - margin.right;
      height = $("#live-metric-chart").height() - margin.top - margin.bottom;

      var svg = d3.selectAll("#live-metric-chart").append("svg")
          .attr("id", "svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");           
      
      color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));
  
      data.forEach(function(d, index) {
        var nowdate = new Date();
        nowdate.setTime(nowdate.getTime() - (index * 10 * 1000));  
        d.date = nowdate;
      });
          
      var metrics = color.domain().map(function(name) {
        return {
          name: name,
          values: data.map(function(d) {
            return {date: d.date, value: +d[name]};
          })
        };
      });
            
      x = d3.time.scale()
        .range([0, width]);
  
      y = d3.scale.linear()
        .range([height, 0]);
        
      xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");
      
      yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");
        
                    
      x.domain(d3.extent(data, function(d) { return d.date; }));
      y.domain([
        d3.min(metrics, function(c) { return d3.min(c.values, function(v) { return v.value; }); }),
        d3.max(metrics, function(c) { return d3.max(c.values, function(v) { return v.value; }); })
      ]);
    
      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);
    
      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("KB");
            
      var metric = svg.selectAll(".metric")
          .data(metrics)
        .enter().append("g")
          .attr("class", "metric");
    
      metric.append("path")
          .attr("class", "line")
          .attr("d", function(d) { return line(d.values); })
          .style("stroke", function(d) { return color(d.name); });
    
      metric.append("text")
          .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
          .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.value) + ")"; })
          .attr("x", 3)
          .attr("dy", ".35em")
          .text(function(d) { return d.name; });
                                
      svg.append("g")         
          .attr("class", "grid")
          .attr("transform", "translate(0," + height + ")")
          .call(make_x_axis()
              .tickSize(-height, 0, 0)
              .tickFormat("")
          )
          
      svg.append("g")         
          .attr("class", "grid")
          .call(make_y_axis()
              .tickSize(-width, 0, 0)
              .tickFormat("")
          )           
          
      svg.append("rect")
          .attr("width", "91%")
          .attr("height", "83%")
          .attr("fill", "pink").attr('opacity', .2);;               
                  
      function make_x_axis() {        
          return d3.svg.axis()
              .scale(x)
               .orient("bottom")
               .ticks(5)
      }
      
      function make_y_axis() {        
          return d3.svg.axis()
              .scale(y)
              .orient("left")
              .ticks(5)
      }        
    });      
  }    

  var codeLoaded = false;
  
  $('a[href="#Script"]').on('shown.bs.tab', function (e) {
    if (!codeLoaded) {
      $.ajax({
        url : "/static/data/AlertDemo.txt",
        dataType : "text",
        success : function(data) {
          codeLoaded = true;
          $("#javascript-editor").text(data);
          // $("#Editor").show();
          var editor = CodeMirror.fromTextArea(document.getElementById("javascript-editor"), {
            lineNumbers : true,
            mode : "javascript"
          });
          editor.setOption("mode", "javascript");
          editor.setSize("100%", 400);
          editor.scrollTo(0, 0);
        }
      });          
    }
  })
})
