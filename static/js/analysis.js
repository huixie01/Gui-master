$(function() {  
  
  var resizing = false;
  
  // highlight menu                
  $("#nav-menu-analysis").addClass("active");  
  
  $("#node-details").css("top", window.innerHeight - 30 + "px");
  
  $('#node-details .size-handler').on('mousedown', function (event) {
    // event.originalEvent.dataTransfer.setData('...', '...');
    resizing = true;
  });
  
  $(document).mouseup(function(ev) {
    resizing = false;
  });
  
  $(document).mousemove(function(ev) {
    if (resizing) {
      if (window.innerHeight - ev.clientY > 30 
        && window.innerHeight - ev.clientY < window.innerHeight - 128) {
        $("#node-details").css("top", ev.clientY - 3 + "px");    
      }
    }
  });
  
  var plotWidth = 70,
      plotHeight = 15;  
          
  var barMargin = {top: 5, right: 10, bottom: 20, left: 10},
      barWidth = 280 - barMargin.left - barMargin.right,
      barHeight = 200 - barMargin.top - barMargin.bottom;              
    
  // Rank View
  // **************
  var RankView = Backbone.View.extend({

    // container element
    tagName: "div",
    
    // class name
    className: "rank",    
    
    // Cache the template function for a single item.
    template: _.template($('#rank-template').html()),
    
    // Reserved Events
    events: {   
      // "click td.clickable": "toggleDetail",
    },

    // Reserved Initialization
    initialize: function() {    
      _.bindAll(this, "buildRankChart"); 
        
      this.scaleX = d3.scale.linear().range([0, barWidth]);      
      this.scaleY = d3.scale.ordinal().rangeRoundBands([0, barHeight], .2);
      
      this.xAxis = d3.svg.axis().scale(this.scaleX).orient("bottom").ticks(5).tickSize(-barHeight, 0, 0);          
      this.yAxis = d3.svg.axis().scale(this.scaleY).orient("right").tickSize(0);            
    },
    
    // Re-render the rank item.
    render: function(rank_title, rank_type) {
      this.$el.html(this.template({rank_title: rank_title, rank_type: rank_type}));
      return this;
    },        
    
    // build rank chart
    buildRankChart: function(rank_type, rows) {
      var self = this;
            
      if (this.$("svg").length == 0) {
        this.svg = d3.selectAll(this.$('.rank-chart').toArray()) 
            .append("svg")
            .attr("width", barWidth + barMargin.left + barMargin.right)
            .attr("height", barHeight + barMargin.top + barMargin.bottom)
          .append("g")
            .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");     
        this.svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + barHeight + ")");        
        this.svg.append("g")
          .attr("class", "y axis")
          .selectAll(".tick text")
          .attr("y", -10);               
      } else {
        this.svg = d3.selectAll(this.$('svg > g').toArray()); 
      }
          
      // get rank data
      invokeAPI("/api/ranks?type=" + rank_type + "&rows=" + rows, {}, "GET", function(data) {
        
        self.scaleX.domain([0, d3.max(data, function(d) { return d[1]; })]);  
        self.scaleY.domain(data.map(function(d) { return d[0]; }));
      
        var bars = self.svg.selectAll(".bar").data(data);
        bars.enter().append("rect")
          .attr("class", "bar positive")
          .attr("x", function(d) { return self.scaleX(Math.min(0, d[1])); })
          .attr("y", function(d) { return self.scaleY(d[0]) + 10; })
          .attr("width", function(d) { return Math.abs(self.scaleX(d[1]) - self.scaleX(0)); })
          .attr("height", 12);
        bars.transition().duration(500)
          .attr("x", function(d) { return self.scaleX(Math.min(0, d[1])); })
          .attr("y", function(d) { return self.scaleY(d[0]) + 10; })
          .attr("width", function(d) { return Math.abs(self.scaleX(d[1]) - self.scaleX(0)); })
          .attr("height", 12);       
        bars.exit().transition().duration(500).remove();
        
        self.svg.selectAll("g.x").call(self.xAxis)
          .attr("transform", "translate(0," + barHeight + ")");        
        self.svg.selectAll("g.y").call(self.yAxis)          
          .selectAll(".tick text")
          .attr("y", -10);                         
      });
    }    
  });
      
  // Flow Item
  // --------------
  var Flow = Backbone.Model.extend({
    
    urlRoot: '',
    
    initialize: function() {
    },    
               
  });  
  
  var lastChartType = "";
  
  // Flow View
  // **************
  var FlowView = Backbone.View.extend({

    // container element
    tagName: "tr",
    
    // class name
    className: "flow-item",    
    
    // Cache the template function for a single item.
    template: _.template($('#flow-template').html()),
    
    // flow detail template
    flowDetailTemplate: _.template($('#flow-detail-template').html()),    
    
    // Reserved Events
    events: {   
      "click td.clickable": "toggleDetail",
    },

    // Reserved Initialization
    initialize: function() {    
      _.bindAll(this, "buildThroughputChart", 'buildRTTChart',
        "buildCorrelationChart", "buildCPRChart", "buildWatchScoreChart", "loadChartData"); 
        
      this.model.bind('remove', this.remove, this);   
      
      var self = this;
      
      this.scaleX1 = d3.scale.linear()
      .range([0, plotWidth]);
      
      this.scaleX2 = d3.scale.linear()
      .range([0, plotWidth]);      
      
      this.scaleY1 = d3.scale.linear()
          .range([plotHeight / 2, plotHeight]);
          
      this.scaleY2 = d3.scale.linear()
          .range([plotHeight / 2 , 0]);      

      this.scaleY3 = d3.scale.linear()
          .range([plotHeight, 0]);
      
      this.path1 = d3.svg.area()
          .x(function(d) { return self.scaleX1(d[0]); })
          .y0(plotHeight / 2)
          .y1(function(d) { return self.scaleY1(d[1]); });
          
      this.path2 = d3.svg.area()
          .x(function(d) { return self.scaleX1(d[0]); })
          .y0(plotHeight / 2)
          .y1(function(d) { return self.scaleY2(d[1]); });     
          
      this.path3 = d3.svg.line()
          .interpolate("basis")
          .x(function(d) { return self.scaleX2(d[0]); })
          .y(function(d) { return self.scaleY3(d[1]); });             
    },
    
    // toggle detail
    toggleDetail: function(ev) {
      var self = this;
      ev.stopPropagation();
      selectRow = $(ev.target).closest("tr");
      selectCell = $(ev.target).closest("td");
      if (selectRow.next().length > 0 && selectRow.next().hasClass("detail") 
        && selectCell.attr("type") == lastChartType) {
        // hide
        selectRow.next().find(".flow-detail").slideUp(100, function() {
          selectRow.next().remove();  
          $("td.clickable").removeClass("selected");       
          lastChartType = ""; 
        });        
      } else {
        if (selectRow.next().length == 0 || !selectRow.next().hasClass("detail")) {
          var detailObj = this.model.toJSON();
          // remove all detail
          this.$el.parent().find("tr.detail").remove();        
          var flowDetail = $("<tr class='detail'></tr>");        
          flowDetail.html(this.flowDetailTemplate(detailObj));
          selectRow.after(flowDetail);    
          flowDetail.find(".flow-detail").hide().slideDown(300);                
        }
        $("td.clickable").removeClass("selected");
        selectCell.addClass("selected");
        lastChartType = selectCell.attr("type");   
        selectRow.next().find("svg > *").remove();     
        // build chart
        if (selectCell.attr("type") == "throughput") {
          this.buildThroughputChart();          
        } else if (selectCell.attr("type") == "rtt") {
          this.buildRTTChart();          
        } else if (selectCell.attr("type") == "correlations") {
          this.buildCorrelationChart();           
        } else if (selectCell.attr("type") == "cpr") {
          this.buildCPRChart();
        } else if (selectCell.attr("type") == "watch-score") {
          this.buildWatchScoreChart();
        }                  
      }                  
    },     
    
    // build throughput chart
    buildThroughputChart: function() {
      this.plot = nv.models.stackedAreaChart()
      .margin({ left : 40, top: 10, bottom: 22 })
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true) 
      .transitionDuration(this.transitionDuration)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .clipEdge(true)
      .forceY(0).color(d3.scale.category10().range());

      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) { 
          return d3.time.format("%H:%M")(new Date(d)); 
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadChartData("throughput"));            
    },
    
    // build rtt chart
    buildRTTChart: function() {
      this.plot = nv.models.stackedAreaChart()
      .margin({ left : 40, top: 10, bottom: 22 })
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true) 
      .transitionDuration(this.transitionDuration)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .clipEdge(true)
      .forceY(0).color(d3.scale.category10().range());

      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) { 
          return d3.time.format("%H:%M")(new Date(d)); 
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadChartData("rtt"));                  
    },
    
    // build correlation chart
    buildCorrelationChart: function() {
      this.plot = nv.models.stackedAreaChart()
      .margin({ left : 40, top: 10, bottom: 22 })
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true) 
      .transitionDuration(this.transitionDuration)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .clipEdge(true)
      .forceY(0).color(d3.scale.category10().range());

      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) { 
          return d3.time.format("%H:%M")(new Date(d)); 
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadChartData("correlations"));                  
    },
    
    // build cpr chart
    buildCPRChart: function() {
      this.plot = nv.models.stackedAreaChart()
      .margin({ left : 40, top: 10, bottom: 22 })
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true) 
      .transitionDuration(this.transitionDuration)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .clipEdge(true)
      .forceY(0).color(d3.scale.category10().range());

      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) { 
          return d3.time.format("%H:%M")(new Date(d)); 
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadChartData("cpr"));                  
    },
    
    // build watch score chart
    buildWatchScoreChart: function() {
      this.plot = nv.models.stackedAreaChart()
      .margin({ left : 40, top: 10, bottom: 22 })
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true) 
      .transitionDuration(this.transitionDuration)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .clipEdge(true)
      .forceY(0).color(d3.scale.category10().range());

      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) { 
          return d3.time.format("%H:%M")(new Date(d)); 
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadChartData("ws"));                  
    },
    // load plot data
    loadChartData: function(chart_type) {      
      // GlobalFilter
      var self = this;      
      var params = {
        live: true,
        length: 30,
        type: chart_type,
        flow_id: this.model.get("id"),
      };
            
      $.get("/api/flow_data", params,
        function(data) { 
          self.plotData = data;
          d3.selectAll(self.$el.next().find('svg').toArray())
          .datum(self.plotData)
          .call(self.plot);
        }, "json"        
      ).fail(function() {
        // self.$(".plot-loading").hide();
      });      
    },    
    
    // Re-render the list item.
    render: function() {
      
      var flowObj = this.model.toJSON();
      flowObj.protocol = flowObj.type + ":" + flowObj.dst_port;
      flowObj.req = getSIPrefixString(flowObj.req);
      flowObj.rsp = getSIPrefixString(flowObj.rsp);
      flowObj.rtt = getSIPrefixString(flowObj.rtt);
      this.$el.html(this.template(flowObj));
      var self = this;
      
      // load events
      AnalysisControl.events.forEach(function(event_) {
        if (event_.flow_id == flowObj.id) {
          self.$el.find("span[type='" + alertSourceTypes[event_.source] + "']").addClass(severityTypes[event_.severity]);
        }
      });           
       
      this.model.el = this;
      
      // draw mini charts
      this.scaleX1.domain([
        Math.min(flowObj.req_his.length > 0 ? _.min(flowObj.req_his, function(o) { return o[0];})[0] : 0, 
                 flowObj.rsp_his.length > 0 ? _.min(flowObj.rsp_his, function(o) { return o[0];})[0] : 0), 
        Math.max(flowObj.req_his.length > 0 ? _.max(flowObj.req_his, function(o) { return o[0];})[0] : 0, 
                 flowObj.rsp_his.length > 0 ? _.max(flowObj.rsp_his, function(o) { return o[0];})[0] : 0)
      ]);        

      this.scaleX2.domain([
        flowObj.rtt_his.length > 0 ? _.min(flowObj.rtt_his, function(o) { return o[0];})[0] : 0, 
        flowObj.rtt_his.length > 0 ? _.max(flowObj.rtt_his, function(o) { return o[0];})[0] : 0
      ]);        
      
      this.scaleY1.domain([
        flowObj.req_his.length > 0 ? _.min(flowObj.req_his, function(o) { return o[1];})[1] : 0, 
        flowObj.req_his.length > 0 ? _.max(flowObj.req_his, function(o) { return o[1];})[1] : 0
      ]);        
      
      this.scaleY2.domain([
        flowObj.rsp_his.length > 0 ? _.min(flowObj.rsp_his, function(o) { return o[1];})[1] : 0, 
        flowObj.rsp_his.length > 0 ? _.max(flowObj.rsp_his, function(o) { return o[1];})[1] : 0
      ]);        

      this.scaleY3.domain([
        flowObj.rtt_his.length > 0 ? _.min(flowObj.rtt_his, function(o) { return o[1];})[1] : 0, 
        flowObj.rtt_his.length > 0 ? _.max(flowObj.rtt_his, function(o) { return o[1];})[1] : 0
      ]);              
            
      this.chart1 = d3.selectAll(self.$el.find(".throughput-chart").toArray())
        .append("svg")
        .attr("width", plotWidth)
        .attr("height", plotHeight);
       
      this.chart1.append("path")
        .datum(flowObj.req_his)
        .attr("class", "area1")
        .attr("d", this.path1);
        
      this.chart1.append("path")
        .datum(flowObj.rsp_his)
        .attr("class", "area2")
        .attr("d", this.path2);

      this.chart2 = d3.selectAll(self.$el.find(".rtt-chart").toArray())
          .append("svg")
          .attr("width", plotWidth)
          .attr("height", plotHeight);
            
      this.chart2.append("path")
            .datum(flowObj.rtt_his)
            .attr("class", "line")
            .attr("d", this.path3);       
                 
      return this;
    },        
  });  
  
  // flow List
  // --------------
  var FlowList = Backbone.Collection.extend({

    // model
    model: Flow,
    
    // url
    url: "/api/wrapupflows",
    
    initialize: function() {
    },    
    
  });
  
  // Define Flow List instance
  var Flows = new FlowList;  
  
  // Flow List View
  // **************
  var FlowListView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#flow-list"),
                
    // Delegated events
    events: {
      // "input #input-search-events": "seachEvent",      
    },

    // init
    initialize: function() {      
            
      // bind view to functions
      _.bindAll(this, 'addOne', 'addAll');
             
      // bind model events            
      Flows.bind('add', this.addOne, this);
      Flows.bind('reset', this.addAll, this);
    },
    
    // add one event
    addOne: function(item) {
      var view = new FlowView({model: item});
      this.$("tbody").append(view.render().el);
    },
    
    // add all event
    addAll: function() {
      Flows.each(this.addOne);        
    },                                      
  });     
  
  // start Instance
  var FlowList = new FlowListView;              
  
  
  // Event Item
  // --------------
  var Event = Backbone.Model.extend({
    
    urlRoot: '',
    
    initialize: function() {
    },    
               
  });  
  
  // Event View
  // **************
  var EventView = Backbone.View.extend({

    // container element
    tagName: "li",
    
    // class name
    className: "event-item",    
    
    // Cache the template function for a single item.
    template: _.template($('#event-template').html()),

    // Reserved Events
    events: {   
      "click .event-item": "linkToDetail",
    },

    // Reserved Initialization
    initialize: function() {      
      this.model.bind('remove', this.remove, this);                  
    },
    
    // select event
    linkToDetail: function(ev) {
    },
        
    // Re-render the list item.
    render: function() {
      var eventObj = this.model.toJSON();
      eventObj.severity = severityTypes[eventObj.severity];
      eventObj.update_time = formatDateTime(eventObj.update_time) + " (" + pastTimeString(Date.parse(eventObj.update_time)) + ")";
      this.$el.html(this.template(eventObj));
      this.model.el = this;
      return this;
    },        
  });  
  
  // Event List
  // --------------
  var EventList = Backbone.Collection.extend({

    // model
    model: Event,
    
    // url
    url: "/api/events",
    
    initialize: function() {
      _.bindAll(this, 'parse');
    },    
    
    // parse
    parse: function(resp) {
      return resp.results;
    },            
  });
  
  // Define Event List instance
  var Events = new EventList;  
  
  // Event List View
  // **************
  var EventListView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#node-events"),
                
    // Delegated events
    events: {
    },

    // init
    initialize: function() {      
            
      // bind view to functions
      _.bindAll(this, 'addOne', 'addAll');
             
      // bind model events            
      Events.bind('add', this.addOne, this);
      Events.bind('reset', this.addAll, this);
    },
    
    // add one event
    addOne: function(item) {
      var view = new EventView({model: item, attributes: {'data-id': item.get('id')}});      
      this.$("> ul").append(view.render().el);
    },
    
    // add all event
    addAll: function() {
      Events.each(this.addOne);        
    },                                      
  });     
  
  // start Instance
  var EventList = new EventListView;              
  
  // Analysis control view
  // **************
  var AnalysisControlView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#body"),
    
    // Delegated events
    events: {      
      // "click button": "test",
    },

    // init
    initialize: function() {      
            
      // bind view to functions
      _.bindAll(this, 'initTopology', 'selectEndpoint', 'unselectEndpoint', 
        'loadNodeInfo', 'loadNodeFlows', 'loadNodeEvents', 'refreshAll');
        
      this.nodes = [];
      this.links = [];
      this.events = [];
         
      // init topology canvas
      this.canvas = d3.topology
        .canvas()
        .selectNodeCallback(this.selectEndpoint)
        .unselectCallback(this.unselectEndpoint)
        .width(window.innerWidth - 392)
        .height(window.innerHeight - 92);
        
      this.detailPanel = this.$("#node-details");
      this.nodeHoldPanel = this.$("#node-hold");
      this.nodeInfoPanel = this.$("#node-info");
      this.flowListPanel = this.$("#flow-list");
      
      this.maxEventNumber = 10;
      
      this.initTopology();   
            
      // init rank
      this.rank1 = new RankView;   
      this.rank2 = new RankView;
      this.rank3 = new RankView;
      
      this.$('#rank').append(this.rank1.render("Top flows ranked by throughput", "req").el);
      this.$('#rank').append(this.rank2.render("Top flows ranked by RTT(round trip time)", "rtt").el);
      this.$('#rank').append(this.rank3.render("Top flows ranked by Watch Score", "rsp").el);
      
      this.rank1.buildRankChart("flow|req", 5);
      this.rank2.buildRankChart("flow|rtt", 5);
      this.rank3.buildRankChart("flow|rsp", 5);
      
      this.autoRefresh = true;      
      this.refreshInterval = 15;
      this.refreshTime = new Date().getTime() / 1000;
      this.refreshProgress = this.$(".refresh-progress");
      this.refreshProgress.width("0%");     
      
      this.selectedEndpointIP = "";       
      
      var self = this;
      // auto refresh data
      setInterval(function timeout() {
        var second = new Date().getTime() / 1000;
        if (self.autoRefresh) {
          self.refreshProgress.width((second - self.refreshTime) * 100 
            / self.refreshInterval +"%");
        }
        if (self.autoRefresh && second - self.refreshTime > self.refreshInterval) {
          self.refreshAll();
          self.refreshTime = new Date().getTime() / 1000;
        }
      }, 1000);            
      
    },
    
    // test
    initTopology: function() {
      var self = this;
      
      d3.select("#topology").call(self.canvas);
      
      invokeAPI("/api/topology", {}, "GET", function(data) {
        self.nodes = data.nodes;
        self.links = data.links;
        self.events = data.events;        
        // update event numbers
        self.events.forEach(function(event_) {
          self.nodes.forEach(function(node_) {
            if (node_.id == event_.node_id) {
              switch (event_.severity) {
                case 0:
                  node_.infos ++;
                  break;
                case 1:
                  node_.warns ++;
                  break;
                case 2:
                  node_.errors ++;
                  break;
                default:
                  break;
              }
            }            
          });
        });        
        self.canvas.nodes(data.nodes).links(data.links).draw();
      });
    },
    
    // refresh topology
    refreshAll: function() {
      
      self = this;
      
      // refresh event list and flow list      
      if (this.selectedEndpointIP != "") {
        this.selectEndpoint(this.selectedEndpointIP, true);        
      }      
      
      // refresh rank list
      this.rank1.buildRankChart("flow|req", 5);
      this.rank2.buildRankChart("flow|rtt", 5);
      this.rank3.buildRankChart("flow|rsp", 5);
      
      // refresh events
      invokeAPI("/api/topology", {}, "GET", function(data) {
        self.events = data.events;                
        self.canvas.events(data.events).refresh();
      });
      
      
      
      
//       
      // invokeAPI("/api/topology", {}, "GET", function(data) {
        // self.nodes = data.nodes;
        // self.links = data.links;
        // self.events = data.events;        
        // // update event numbers
        // self.events.forEach(function(event_) {
          // self.nodes.forEach(function(node_) {
            // if (node_.id == event_.node_id) {
              // switch (event_.severity) {
                // case 0:
                  // node_.infos ++;
                  // break;
                // case 1:
                  // node_.warns ++;
                  // break;
                // case 2:
                  // node_.errors ++;
                  // break;
                // default:
                  // break;
              // }
            // }            
          // });
        // });        
        // self.canvas.nodes(data.nodes).links(data.links).refresh();
      // });
    },
    
    // select a endpoint
    selectEndpoint: function(ip, refresh) {
      this.nodeInfoPanel.show();
      this.flowListPanel.show();
      this.nodeHoldPanel.hide();
      if (this.detailPanel.height() <= 220)
        this.detailPanel.animate({top: window.innerHeight - 220 + "px"}, 300);
      this.loadNodeInfo(ip);
      this.loadNodeEvents(ip);
      this.loadNodeFlows(ip, refresh);   
      this.selectedEndpointIP = ip;    
    },
    
    // select a endpoint
    unselectEndpoint: function() {
      this.nodeInfoPanel.hide();
      this.flowListPanel.hide();
      this.nodeHoldPanel.show();
      this.detailPanel.animate({top: window.innerHeight - 30 + "px"}, 300);
      this.selectedEndpointIP = "";
    },
    
    // load node info
    loadNodeInfo: function(ip) {
      var self = this;
      
      this.nodes.forEach(function(node) {
        if (node.ip == ip) {
          // this.nodeInfoPanel.find(".node-icon")
          self.nodeInfoPanel.find(".node-type").text(nodeType[node.type].name);
          self.nodeInfoPanel.find(".attr-value.ip").text(node.ip);
          self.nodeInfoPanel.find(".attr-value.mac").text(node.mac);
          self.nodeInfoPanel.find(".attr-value.name").text(node.name);
          self.nodeInfoPanel.find(".attr-value.watch-score").text("80");
        }
      });

    },
        
    // load node flows
    loadNodeFlows: function(ip, refresh) {
      if (refresh && this.$("tr.detail").length > 0) {
        return;
      }
      
      var self = this;
      
      var params = {
        sort: "-update_time",
        ip: ip,
        live: true,
        length: 30,
      };
      
      // close detail panel
      self.$("tr.detail").remove();
      
      Flows.fetch({ 
        data: params, 
        reset: true,
        success: function(collection, response, options) {         
          options.previousModels.forEach(function(item){
            item.el.remove();
            item.el.unbind();
          });          
          if (Flows.length == 0) {            
            self.$("tr.reserve").show();
          } else {
            self.$("tr.reserve").hide();
          }             
        }
      });                  
    },
    
    // load node events
    loadNodeEvents: function(ip) {
      var self = this;
      
      var node_id = "";
      this.nodes.forEach(function(node) {
        if (node.ip == ip) {
          node_id = node.id;
        }
      });
      
      var params = {
        page: 1,
        sort: "-update_time",
        scope_type: "nodes",
        scopes: node_id,       
        status: "0, 1",    
        rows: self.maxEventNumber,
      };
      
      Events.fetch({ 
        data: params, 
        reset: true,
        success: function(collection, response, options) {         
          options.previousModels.forEach(function(item){
            item.el.remove();
            item.el.unbind();
          });          
          if (Events.length == 0) {            
            self.$("li.reserve").show();
          } else {
            self.$("li.reserve").hide();
          }             
        }
      });        
    },    
    
  });
  
  // topology Instance
  var AnalysisControl = new AnalysisControlView;    
  
  $("button.refresh").click(function() {
    AnalysisControl.refreshTopology();
  });


});
