$(function() {
  
  // highlight menu                
  $("#nav-menu-search").addClass("active");
  
  var barMargin = {top: 5, right: 30, bottom: 5, left: 85},
      barWidth = 200 - barMargin.left - barMargin.right;              
  
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
    },
    
    // Re-render the rank item.
    render: function(rank_title) {
      this.$el.html(this.template({rank_title: rank_title}));
      return this;
    },        
    
    // build rank chart
    buildRankChart: function(data, flow) {
      var self = this;
      
      var barHeight = data.length * 25;
      
      scaleX = d3.scale.linear().range([0, barWidth]).domain([0, d3.max(data, function(d) { return d[1]; })]);   
      scaleY = d3.scale.ordinal().rangeRoundBands([0, barHeight], .2).domain(data.map(function(d) { return d[0]; }));
                
      yAxis = d3.svg.axis().scale(scaleY).orient("left").tickSize(0);                  
      
      var svg = d3.selectAll(this.$('.rank-chart').toArray()) 
          .append("svg")
          .attr("width", barWidth + barMargin.left + barMargin.right)
          .attr("height", barHeight + barMargin.top + barMargin.bottom)
        .append("g")
          .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");     
      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + barHeight + ")");        

      var bars = svg.selectAll(".bar").data(data);
      bars.enter().append("rect")
        .attr("class", "bar positive")
        .attr("x", function(d) { return scaleX(Math.min(0, d[1])); })
        .attr("y", function(d) { return scaleY(d[0]); })
        .attr("width", function(d) { return Math.abs(scaleX(d[1]) - scaleX(0)); })
        .attr("height", 20);

      var names = svg.selectAll(".names").data(data);
      if (flow) {
        names.enter().append("text")
          .attr("class", "names")
          .text(function(d) {return d[0].split('-')[0]})
          .attr("x", -5)
          .attr("y", function(d) { return scaleY(d[0]) + 9; })
          .attr("text-anchor", "end");
        names.enter().append("text")
          .attr("class", "names")
          .text(function(d) {return ">" + d[0].split('-')[1]})
          .attr("x", -5)
          .attr("y", function(d) { return scaleY(d[0]) + 18; })
          .attr("text-anchor", "end");                          
      } else {
        names.enter().append("text")
          .attr("class", "names")
          .text(function(d) {return d[0]})
          .attr("x", -5)
          .attr("y", function(d) { return scaleY(d[0]) + 13; })
          .attr("text-anchor", "end");        
      }
       
      var values = svg.selectAll(".values").data(data);
      values.enter().append("text")
        .attr("class", "values")
        .text(function(d) {return d[1]})
        .attr("x", 5)
        .attr("y", function(d) { return scaleY(d[0]) + 13; })
        .attr("text-anchor", "start");
        
      // svg.append("g")
        // .attr("class", "y axis").call(yAxis).selectAll(".tick text").attr("y", 10);                         
    }    
  });

  // Search Control View
  // **************
  var SearchControlView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#body"),
        
    // templates
    protocolTabTemplate: _.template($('#protocol-tab-template').html()),    
    sessionDetailTemplate: _.template($('#session-detail-template').html()),    
                
    // Delegated events
    events: {
      "click #search-exec": "updateFilter",
      "click #protocol-tabs ul > li": "selectProtocol",
      "keyup #search-keyword": "execSearch",
    },

    // init
    initialize: function() {      
            
      // bind view to functions
      _.bindAll(this, 'loadProtocolData');
             
      // init variables
      this.selectedTab = "";
      this.selectedPage = 1;
      this.keyword = this.$("#search-keyword");
      this.protocolTabContainer = this.$("#protocol-tabs > ul");
      this.sessionDetailContainer = this.$("#session-detail > ul");
      this.sessionTable = this.$("#session-table");
      this.sessionList = this.$("#session-list");
      this.sessionList.css("height", window.innerHeight - 275);      
      this.sessionRank = this.$("#session-rank");
      this.sessionRank.css("height", window.innerHeight - 275);
      this.sessionDetail = this.$("#session-detail");
      this.sessionDetail.css("height", window.innerHeight - 275);
      
      this.distributionBar = nv.models.discreteBarChart()
          .margin({top: 15, right: 10, bottom: 10, left: 30})
          .x(function(d) { return formatDateTime(d.time) })    //Specify the data accessors.
          .y(function(d) { return d.value })
          .tooltips(true)        //Don't show tooltips
          .showValues(false)       //...instead, show the bar value right on top of each bar.
          .transitionDuration(350)
          .showXAxis(false);
          
      this.distributionBar.xAxis
      .axisLabel('').tickFormat(function(d) {
          var date = new Date(d);          
          return d3.time.format("%m/%d/%y %H:%M")(date);
       });
  
      this.distributionBar.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
          
  
      var self = this;
      
      nv.addGraph(function() {  
        d3.select('#protocol-tabs svg')
            .datum([])
            .call(self.distributionBar);  
        return self.distributionBar;
      });
  
      // register observer
      GlobalFilter.addObserver(this);
      
      // init data
      this.updateFilter();
      
      var self = this;
    },
    
    execSearch: function(ev) {
      if(ev.keyCode == 13) {
        this.updateFilter();
      }      
    },
    
    // load search results    
    updateFilter: function(page) {      
      var self = this;

      self.sessionDetail.hide();
      self.sessionList.removeClass("shrink");
      
      if (page) {
        self.selectedPage = page;
      } else {
        self.selectedPage = 1;
      }
      
      // get search parameters
      var params = {
        keyword: this.keyword.val()
      };      
      var selectedTimeRange = GlobalFilter.getSelectedTimeRange();
      if (selectedTimeRange.live) {
        params.from = (new Date()).getTime() - selectedTimeRange.length * 60 * 1000; 
      } else {
        params.to = selectedTimeRange.to;
        params.from = selectedTimeRange.from;
      }            
           
      // clear protocol tabs
      self.protocolTabContainer.find("li").remove();
      
      // get protocol tab data
      invokeAPI("/api/session_protocols", params, "GET", function(data) {
        // sort data result
        data.result.sort(function(a, b) {
          order1 = sessionProtocolOrders.hasOwnProperty(a._id) ? sessionProtocolOrders[a._id] : 8888;
          order2 = sessionProtocolOrders.hasOwnProperty(b._id) ? sessionProtocolOrders[b._id] : 8888;
          return order1 - order2;
        });        
        data.result.forEach(function(tab) {
          self.protocolTabContainer.append(self.protocolTabTemplate({protocol: tab._id, count: tab.count, 
            active: self.selectedTab == tab._id ? "active" : ""}));            
        });
        // if no selected Tab
        if (self.protocolTabContainer.find("li").length > 0 && self.protocolTabContainer.find("li.active").length == 0) {
          self.protocolTabContainer.find("li:first").addClass("active");
          self.selectedTab = self.protocolTabContainer.find("li:first").attr("protocol");
        }
        
        // load protocol Data
        self.loadProtocolData();
        
      });      
    },
    
    // select protocol
    selectProtocol: function(ev) { 
      this.selectedTab = $(ev.target).closest("li").attr("protocol");
      this.updateFilter();        
    },
    
    // load protocol data
    loadProtocolData: function() {
      if (this.selectedTab == "") return;
      
      var self = this;
      
      var params = {
        keyword: this.keyword.val(),
        protocol: this.selectedTab
      };      
      var selectedTimeRange = GlobalFilter.getSelectedTimeRange();
      if (selectedTimeRange.live) {
        params.from = (new Date()).getTime() - selectedTimeRange.length * 60 * 1000; 
      } else {
        params.to = selectedTimeRange.to;
        params.from = selectedTimeRange.from;
      }            
            
      // load time distribution data
      invokeAPI("/api/session_distribution", params, "GET", function(data) {
        var barData = [];         
        data.forEach(function(item) {
          barData.push({time: item.time, color: "#4b7cad", value: item.count});
        });       
        d3.select('#protocol-tabs svg').datum([{key: "distribution", values: barData}]).call(self.distributionBar);        
      });      
      
      // load rank data
      invokeAPI("/api/session_ranks", params, "GET", function(data) {
        // delete old rank views
        self.$("#session-rank .rank").remove();
        data.forEach(function(item) {
          var rankData = [];  
          item.rank.forEach(function(rank_item) {
            rankData.push([rank_item._id, rank_item.count]);
          });       
                  
          var rankView = new RankView;
          this.$('#session-rank').append(rankView.render("Top " + item.type + ":").el); 
          rankView.buildRankChart(rankData, item.type == "flows");
        });               
      });      

      // load session table fields
      this.sessionList.hide();
      this.sessionTable.bootstrapTable('destroy');
      // load rank data
      invokeAPI("/api/session_fields?protocol=" + this.selectedTab, {}, "GET", function(fieldData) {
        var tableColumns = [];
        var sessionFields = {};
        fieldData.forEach(function(item) {
          tableColumns.push({
            field: item.name,
            title: item.alias && item.alias != "" ? item.alias : item.name,
            align: 'left',
            valign: 'middle',
            sortable: item.sortable,
            order: 'desc',
            visible: sessionFieldDisplayTypes[item.display_type] == "basic" ? true : false,             
          });
          sessionFields[item.name] = item;
        });
        self.sessionList.show();
        self.sessionTable.bootstrapTable({
          url: '/api/sessions',
          pagination: true,
          sidePagination: 'server',
          pageSize: 10,
          pageList: [10, 25, 50, 100, 200],
          showColumns: true,
          height: window.innerHeight - 295,
          pageNumber: self.selectedPage,
          minimumCountColumns: 5,  
          columns: tableColumns,
          sortName: 'create_time',
          sortOrder: 'desc',
          queryParams: function(table_params) {
            table_params.offset = table_params.offset / 10 + 1;
            table_params.from = params.from;
            if (params.to) {
              table_params.to = params.to;
            }
            table_params.keyword = params.keyword;
            table_params.protocol = params.protocol;            
            return table_params;
          },
          responseHandler: function(table_res) {
            table_res.rows.forEach(function(row) {
              for (var item in row) {
                if (sessionFields.hasOwnProperty(item)) {
                  var dataType = sessionFieldDataTypes[sessionFields[item].data_type]; 
                  if (dataType == "amount") {
                    row[item] = getSIPrefixString(row[item]) + (sessionFields[item].unit != null ? " " + sessionFields[item].unit : "");                     
                  } else if (dataType == "number") {
                    row[item] = row[item] + (sessionFields[item].unit != null ? " " + sessionFields[item].unit : "");
                  } else if (dataType == "datetime") {
                    row[item] = formatDateTime(row[item]);
                  }
                }
              }              
            });
            return table_res;
          },
          onClickRow: function (row, el) {
            var selected = el.hasClass("selected");            
            self.$("#session-table > tbody > tr").removeClass("selected");
            el.toggleClass("selected", !selected);
            // remove details
            self.sessionDetailContainer.find("li").remove();
            // 
            if (el.hasClass("selected")) {
              tableColumns.forEach(function(field) {
                if (field.field != "sn" && row.hasOwnProperty(field.field)) {
                  self.sessionDetailContainer.append(self.sessionDetailTemplate({name: field.field, value: row[field.field]}));                  
                }                
              });
              self.sessionList.addClass("shrink");
              self.sessionDetail.show("slide", { direction: "right" }, 200);
              self.sessionTable.bootstrapTable('resetView');
            } else {
              self.sessionList.removeClass("shrink");              
              self.sessionDetail.hide("slide", { direction: "right" }, 200);
              self.sessionTable.bootstrapTable('resetView');              
            }
          },  
          onPageChange: function(size, page) {
            // self.updateFilter(page);
          }        
        });
      });                         
    },
  });
  
  // start Instance
  var SearchControl = new SearchControlView;      
        
});
