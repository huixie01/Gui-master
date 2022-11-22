$(function() {
  // highlight menu                
  $("#nav-menu-dashboard").addClass("active");
                
  // hide normal dropdown
  $(document).mouseup(function(ev) {        
    $(".inline-actions").each(function(key, value) {
      if (!$(value).is(ev.target) // if the target of the click isn't the container...
        && $(value).has(ev.target).length === 0) // ... nor a descendant of the container
      {
        $(value).removeClass("showing");
        $(value).find(".dropdown-normal").removeClass("toggle");      
      }
    });
  });
  
  
  // Report Item
  // --------------
  var Report = Backbone.Model.extend({
    
    urlRoot: '',
    
    initialize: function() {
      // this.reportPlots = new ReportPlotList;
      // this.reportPlots.url = '/api/report/' + this.id + '/report_plots';
      //this.reportPlots.on("reset", this.updateCounts);
    },    
               
  });  
  
  // Report View
  // **************
  var ReportView = Backbone.View.extend({

    // container element
    tagName: "li",
    
    // class name
    className: "report",    
    
    // Cache the template function for a single item.
    template: _.template($('#report-template').html()),

    // Reserved Events
    events: {   
      "click .inline-actions": "toggleInlineDropdown",
      "click .rename": "renameReport",
      "click .delete": "deleteReport",
      "click .mark-default": "MarkReportAsDefault",
      "click .unmark-default": "UnmarkReportDefault",
      "click .confirm-delete-report": "confirmDeleteReport",
      "click .cancel-delete-report": "cancelDeleteReport",
      "click.report": "selectReport",   
    },

    // Reserved Initialization
    initialize: function() {
      _.bindAll(this, "addReport");      
      this.model.bind('remove', this.remove, this);            
    },
    
    // select report
    selectReport: function(ev) {
      if ($(ev.target).is("li") || $(ev.target).is("span")) {
        $(".report").removeClass("active");
        this.$el.addClass("active");
        ReportControl.selectReport("select", this.model.get('id'), this.model.get('name'), 
          this.$el.closest(".category").find(".category-name").text());        
      }
    },
    
    // add new report
    addReport: function(item) {
      var report = this.model;
      var self = this;
      this.$(".report-name").bind("hidden", function(e, reason) {
        self.$el.removeClass("editing");
        if (reason != "save") {
          // cancel save
          self.model.destroy();
        }
      });      
      this.$(".report-name").editable({
        unsavedclass: null,
        type: 'text',        
        mode: 'inline',
        toggle: 'manual',
        validate: function(value) {
          if($.trim(value) == '') {
              return 'Name can not be empty';
          }
        },
        success: function(response, newValue) {
          self.$el.removeClass("editing");
          // update model
          report.save({name: newValue}, 
          {
            error: function(collection, response, options) {
              console.log(response.responseText);
            },
            success: function(model, response) {
              // refresh data-id attr
              self.$el.attr("data-id", model.get('id')); 
            },
          });
        }        
      });      
      this.$(".report-name").editable("show");
      this.$el.addClass("editing");      
    },
    
    // rename report
    renameReport: function(ev) {
      var report = this.model;
      var dropdownElement = this.$(".report-dropdown");
      var reportActions = this.$(".report-actions");
      var self = this;
      this.$(".report-name").bind("hidden", function(e, reason) {
        self.$el.removeClass("editing");
      });
      this.$(".report-name").editable({
        unsavedclass: null,
        type: 'text',        
        mode: 'inline',
        toggle: 'manual',
        validate: function(value) {
          if($.trim(value) == '') {
              return 'Name can not be empty';
          }
        },
        success: function(response, newValue) {
          self.$el.removeClass("editing");          
          if (report.get('id') == ReportControl.selectedReportID) {
            ReportControl.selectReport("update", "", newValue, "");
          }            
          // update model
          report.save({name: newValue},
          {
            error: function(collection, response, options) {
              // console.log(response.responseText);
            }
          });
        }        
      });   
      this.$(".report-name").editable("show");
      dropdownElement.removeClass("toggle");
      reportActions.removeClass("showing");
      this.$el.addClass("editing");
    },
    
    // delete report
    deleteReport: function(ev) {
      var dropdownElement = this.$(".report-dropdown");
      dropdownElement.removeClass("toggle");
      dropdownElement.parent().removeClass("showing");  
      this.$(".delete-report-actions").show();    
    },
    
    // mark report as default
    MarkReportAsDefault: function(ev) {      
      this.model.save({is_default:1});
      var dropdownElement = this.$(".report-dropdown");
      var reportActions = this.$(".report-actions");      
      dropdownElement.removeClass("toggle");
      reportActions.removeClass("showing");
      this.$el.addClass("default");      
      // unmark all others -- TBD      
    },
    
    // mark report as default
    UnmarkReportDefault: function(ev) {
      this.model.save({is_default:0});
      var dropdownElement = this.$(".report-dropdown");
      var reportActions = this.$(".report-actions");      
      dropdownElement.removeClass("toggle");
      reportActions.removeClass("showing");
      this.$el.removeClass("default");
    },    
    
    // confirm deleting report
    confirmDeleteReport: function() {
      var selecting = (this.model.get("id") == ReportControl.selectedReportID);
      this.model.destroy();
      if (!selecting) {
        ReportControl.selectDefault();
      } else {
        ReportControl.selectReport("unselect", "", "", "");        
      }       
    },
    
    // cancel deleting report 
    cancelDeleteReport: function() {
      this.$(".delete-report-actions").hide();
    },    
    
    // toggle action panel
    toggleInlineDropdown: function(ev) {      
      ev.stopPropagation();
      if (!($(ev.target).hasClass('report-actions') 
        || $(ev.target).hasClass('report-caret'))) {
        return;
      }
      this.$(".report-actions").toggleClass("showing");      
      this.$(".report-dropdown").toggleClass("toggle");
    },    
            
    // Re-render the list item.
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },  
      
  });  
  
  // Report List
  // --------------
  var ReportList = Backbone.Collection.extend({

    // model
    model: Report,
    
    // url
    url: "/api/reports"
    
  });   
          
  // Report Category Item  
  // --------------
  var ReportCategory = Backbone.Model.extend({
    
    urlRoot:'',
    
    initialize: function() {
      this.reports = new ReportList;                 
    },
        
  }); 
  
  // Report Category View
  // **************
  var ReportCategoryView = Backbone.View.extend({

    // container element
    tagName: "div",
    
    // class name
    className: "category",
  
    // Cache the template function for a single item.
    template: _.template($('#report-category-template').html()),

    // Reserved Events
    events: {   
      "click .inline-actions": "toggleInlineDropdown",
      "click .rename": "renameCategory",
      "click .add-report": "addReportToCategory",
      "click .delete": "deleteCategory",
      "click .confirm-delete-category": "confirmDeleteCategory",
      "click .cancel-delete-category": "cancelDeleteCategory",            
    },

    // Reserved Initialization
    initialize: function() {      
      // bind this
      _.bindAll(this, "addOne");
      
      // define variables      
      
      // bind view to functions             
      this.model.bind('remove', this.remove, this);         
      this.model.reports.bind('add', this.createOne, this);      
      this.model.reports.bind('reset', this.addAll, this);  
    },
    
    // add category
    addCategory: function(ev) {      
      var reportCategory = this.model;
      var categoryHead = this.$(".category-head");
      this.$(".category-name").bind("hidden", function(e, reason) {
        categoryHead.removeClass("editing");
        if (reason != "save") {
          // cancel save
          reportCategory.destroy();
        }
      });            
      this.$(".category-name").editable({
        unsavedclass: null,
        type: 'text',        
        mode: 'inline',
        toggle: 'manual',
        validate: function(value) {
          if($.trim(value) == '') {
              return 'Name can not be empty';
          }
        },
        success: function(response, newValue) {
          categoryHead.removeClass("editing");
          // update model
          reportCategory.save({name: newValue},
          {
            error: function(collection, response, options) {
              console.log(response.responseText);
            },
            success: function(model, response) {
              // pass 
            },
          });
        }        
      });      
      this.$(".category-name").editable("show");      
      categoryHead.addClass("editing");
    },
    
    renameCategory: function(ev) {
      var reportCategory = this.model;
      var dropdownElement = this.$(".category-dropdown");
      var categoryActions = this.$(".category-actions");
      var categoryHead = this.$(".category-head");
      var self = this;
      this.$(".category-name").bind("hidden", function(e, reason) {
        categoryHead.removeClass("editing");
      });            
      this.$(".category-name").editable({
        unsavedclass: null,
        type: 'text',        
        mode: 'inline',
        toggle: 'manual',
        validate: function(value) {
          if($.trim(value) == '') {
              return 'Name can not be empty';
          }
        },
        success: function(response, newValue) {
          categoryHead.removeClass("editing");
          if (self.$(".category-reports > ul > li.active").length > 0) {
            ReportControl.selectReport("update", "", "", newValue);
          }                                
          // update model
          reportCategory.save({name: newValue},
          {
            error: function(collection, response, options) {
              // console.log(response.responseText);
            }
          });
        }        
      });      
      this.$(".category-name").editable("show");
      this.$(".category-head").addClass("editing");
      dropdownElement.removeClass("toggle");
      categoryActions.removeClass("showing");
    },
    
    // add one
    addOne: function(item) {
      var view = new ReportView({model: item, 
        className: item.get("is_default") == 1 ? "report default" : "report", 
        attributes: {'data-id': item.get('id')}});      
      this.$(".category-reports > ul").append(view.render().el);
    },
    
    // add one
    addAll: function(item) {
      this.model.reports.each(this.addOne);    
    },                  
    
    // create one
    createOne: function(item) {
      var view = new ReportView({model: item, attributes: {'data-id': ''}});      
      this.$(".category-reports > ul").append(view.render().el);
      view.addReport();      
    },
                
    // Re-render the list item.
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },  
    
    // add new report
    addReportToCategory: function(ev) {
      var dropdownElement = this.$(".category-dropdown");
      dropdownElement.removeClass("toggle");
      dropdownElement.parent().removeClass("showing");
      // add new report
      this.model.reports.add({"name": "", report_category: this.model.get("id"), order: 1});      
    },
    
    // delete category
    deleteCategory: function(ev) {
      var dropdownElement = this.$(".category-dropdown");
      dropdownElement.removeClass("toggle");
      dropdownElement.parent().removeClass("showing");
      this.$(".delete-category-actions").show();      
    },
    
    // confirm deleting category
    confirmDeleteCategory: function() {
      this.model.destroy();
    },
    
    // cancel deleting category 
    cancelDeleteCategory: function() {
      this.$(".delete-category-actions").hide();
    },    
        
    // toggle action panel
    toggleInlineDropdown: function(ev) {      
      ev.stopPropagation();
      if (!($(ev.target).hasClass('category-actions') 
        || $(ev.target).hasClass('cagegory-caret'))) {
        return;
      }
      this.$(".category-actions").toggleClass("showing");      
      this.$(".category-dropdown").toggleClass("toggle");
      if (this.$(".category-actions").hasClass("showing")) {
        if (this.$(".category-reports > ul > li").length > 0) {
          this.$(".category-dropdown .delete").hide();
        } else {
          this.$(".category-dropdown .delete").show();
        }
      }      
    },    
          
  });
  
  
  // Report Category List
  // --------------
  var ReportCategoryList = Backbone.Collection.extend({

    // model
    model: ReportCategory,
    
    // url
    url: "/api/report_categorys"        
    
  });   
  
  // Define report categorys instance
  var ReportCategorys = new ReportCategoryList;  
          
          
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
          
          
  // Report Plot Item
  // --------------
  var ReportPlot = Backbone.Model.extend({
    
    urlRoot: '',
    
    initialize: function() {
      this.events = new EventList;                 
    },
            
               
  });
  
  // Report Plot View
  // **************
  var ReportPlotView = Backbone.View.extend({

    // container element
    tagName: "li",
    
    // class name
    className: "plot",

    // Cache the template function for a single item.
    template: _.template($('#report-plot-template').html()),
    
    // Reserved Events
    events: {     
      "click .config-widget": "configPlot",          
      "click .delete-widget": "deletePlot",
      "click .confirm-delete": "confirmDeletePlot",
      "click .cancel-delete": "cancelDeletePlot",
      "mouseleave .delete-actions": "deactiveDelete",      
    },

    // Reserved Initialization
    initialize: function() {
      
      // get attrs
      _.bindAll(this, 'addPlot', 'buildPlot', 'buildLineTrendPlot', 
        'buildAreaTrendPlot', 'buildBarDistributionPlot', 'buildPieDistributionPlot', 
        'loadMetricData', 'startLoading');
              
      this.model.bind('remove', this.removePlot, this);
      this.model.bind('resize', this.resize, this);
      this.model.bind('checkposition', this.checkPosition, this);
      this.model.bind('updatefilter', this.updatefilter, this);
            
      this.model.events.bind('add', this.addOneEvent, this);      
      this.model.events.bind('reset', this.addAllEvents, this);
      
      // Cache the template function for a single item.
      this.textTemplate = _.template($('#text-template').html()),    
      
      // chart variables
      this.margin = { left : 50, top: 50 };
      this.transitionDuration = 350;
      this.colorCategory = d3.scale.category10().range();
      
      // last chart type
      this.lastChartType = "";
      this.lastVizType = "";
      
      // catched data
      this.plotData = [];
      
      // editing status
      this.editing = false;
    },
    
    // add one event
    addOneEvent: function(item) {
      var view = new EventView({model: item, attributes: {'data-id': item.get('id')}});      
      this.$("ul.event-list").append(view.render().el);
    },
    
    // add all event
    addAllEvents: function() {
      this.model.events.each(this.addOneEvent);        
    },                          

    // Re-render the list item.
    render: function() {
      this.$el.html(this.template({
        "title": this.script.title.length == 0 
          ? (this.script.chart_type == "metric-graph" ? this.script.metrics.toString() : "Latest Events") : this.script.title
      }));
      return this;
    },  
    
    // config plot
    configPlot: function() {
      this.plotConfig.plotView = this;
      this.editing = true;
      this.newScript = this.script;      
      this.plotConfig.showConfig();      
    },
    
    // pre delete plot
    deletePlot: function() {
      this.$(".delete-actions").show();
      this.$(".widget-actions").hide();
    },
    
    // confirm deleting plot
    confirmDeletePlot: function() {
      this.model.destroy();
      this.gridster.remove_widget($(".widget-new-plot"));
      this.gridster.add_widget($.trim(ReportControl.newPlotTemplate({})), 2, 2);            
      setTimeout(function timeout() {
        ReportControl.batchUpdatePositions();
      }, 2000);      
    },
    
    // cancel deleting plot 
    cancelDeletePlot: function() {
      this.$(".delete-actions").hide();
      this.$(".widget-actions").show();
    },
    
    // deactive delete actioins
    deactiveDelete: function(ev) {
      this.$(".delete-actions").hide();
      this.$(".widget-actions").show();      
    },
    
    // resize plot
    resize: function() {
      if (this.script.chart_type == "metric-graph") {
        this.plot.update();        
      } else {
        this.$("ul.event-list").css("max-height", this.$el.height() - 22);
      }     
    },
    
    // check position and patch update
    checkPosition: function() {
      var newPos = {
        'col': parseInt(this.$el.attr('data-col'), 10),
        'row': parseInt(this.$el.attr('data-row'), 10),
        'size_x': parseInt(this.$el.attr('data-sizex'), 10) || 1,
        'size_y': parseInt(this.$el.attr('data-sizey'), 10) || 1,
      };      
      if (this.model.get('col') != newPos.col 
      || this.model.get('row') != newPos.row 
      || this.model.get('size_x') != newPos.size_x 
      || this.model.get('size_y') != newPos.size_y) {
        this.model.save(newPos, {patch: true});
      }
    },
    
    // add plot
    addPlot: function() {
      this.script = $.parseJSON(this.model.get('script'));            
      this.gridster.add_widget(this.render().el,
        this.model.get('size_x'), this.model.get('size_y'), this.model.get('col'), this.model.get('row')); 
      // // build plot
      this.buildPlot(this.script);     
      // if model id is null, open config panel
      if (!this.model.get('id')) {
        this.plotConfig.plotView = this;
        this.editing = true;
        this.newScript = this.script;
        this.plotConfig.showConfig();      
      }
    },
        
    // show loading status
    startLoading: function() {
      this.$(".plot-loading").show();
    },
    
    // updatefilter
    updatefilter: function() {
      if (this.editing) {
        this.buildPlot(this.newScript);
      } else {
        this.buildPlot(this.script);        
      }      
    },
    
    // build plot data
    buildPlot: function(script) {
      // reload plot name
      if (chartType == "metric-graph") {
        var metricUnit = "";
        if (script.metric_unit && metricUnitDef.hasOwnProperty(script.metric_unit)) {
          metricUnit  = metricUnitDef[script.metric_unit][0] == "" ? "" : " (" + metricUnitDef[script.metric_unit][0] + ")";        
        }      
        this.$(".graph-title").text(script.title.length == 0 
          ? script.metrics.toString() + metricUnit : script.title + metricUnit);               
      }            
      this.$(".plot-loading").show();
      var chartType = script.chart_type;
      var vizType = script.chart_type == "metric-graph" ? script.visualization : script.widget_type;
      if (chartType == this.lastChartType && vizType == this.lastVizType) {
        // same chart type, just load data and update chart
        if (chartType == "metric-graph") {
          this.loadMetricData(script);
        } else {
          if (vizType == "eventlist") {
            this.buildEventListPlot(script);
          } else if (vizType == "networkmap") {
            this.buildNetworkMapPlot(script);            
          } else if (vizType == "geomap") {
            this.buildGeoMapPlot(script);            
          }
        }
      } else {
        this.$(".widget-content").children().remove();
        if (chartType == "metric-graph") {
          this.$(".widget-content").append("<svg></svg>");        
          // different chart type, load data and rebuild chart
          if (vizType == "linetrend") {
            this.buildLineTrendPlot(script);
          } else if (vizType == "areatrend") {
            this.buildAreaTrendPlot(script);
          } else if (vizType == "bardistribution") {
            this.buildBarDistributionPlot(script);
          } else if (vizType == "piedistribution") {
            this.buildPieDistributionPlot(script);
          } else if (vizType == "text") {
            this.buildTextPlot(script);
          } else if (vizType == "rank") {
            this.buildRankPlot(script);
          }          
        } else if (chartType == "function-widget") {
          if (vizType == "eventlist") {
            this.$(".widget-content").append("<ul class='event-list'></ul>");            
            this.$("ul.event-list").css("max-height", this.$el.height() - 22);
            this.buildEventListPlot(script);
          } else if (vizType == "networkmap") {
            this.buildNetworkMapPlot(script);            
          } else if (vizType == "geomap") {
            this.$(".widget-content").append("<img src='/static/img/worldmap.png' class='geomap'></img>");
            if (this.$el.height() / this.$el.width() > 2) {  
              this.$(".geomap").height(this.$el.height() - 20);                                          
            } else {
              this.$(".geomap").width(this.$el.width() - 20);                                          
            }                                                           
            this.buildGeoMapPlot(script);            
          }
        }
        this.lastChartType = chartType;
        this.lastVizType = vizType; 
      }
    },
    
    // build event list
    buildEventListPlot: function(script) {
      var self = this;      
      // 
      var selectedFilters = GlobalFilter.getSelectedFilters();
      var scopes = [];
      selectedFilters.forEach(function(item) {
        scopes.push(item.id.substring(1));
      });
      var params = {
        page: 1,
        sort: "-update_time",
        scope_type: selectedFilters.length > 0 ? selectedFilters[0].type : "all",    
        rows: script.event_size,
      };                     
      if (params.scope_type != "all") {
        params.scopes = scopes.join(',');
      }
      if (script.event_status) {
        params.status = script.event_status.join(",");
      }
      if (script.event_priority) {
        params.priority = script.event_priority.join(",");
      }
      if (script.event_severity) {
        params.severity = script.event_severity.join(",");
      }
      this.model.events.fetch({ 
        data: params, 
        reset: true,
        success: function(collection, response, options) {         
          options.previousModels.forEach(function(item){
            item.el.remove();
            item.el.unbind();
          });
          if (self.model.events.length == 0) {
            self.$("li.reserve").show();
          } else {
            self.$("li.reserve").hide();
          }             
          self.$(".plot-loading").hide();
        },
        error: function() {
          self.$(".plot-loading").hide();
        },        
      });                  
    },
    
    // build network map
    buildNetworkMapPlot: function(script) {
      this.nodes = [];
      this.flows = [];
      this.events = [];
         
      // init topology canvas
      this.canvas = d3.topology
        .canvas()
        .width(this.$el.width())
        .height(this.$el.height())
        .showMinimap(false);
        
      var self = this;
      
      d3.selectAll(this.$el.find(".widget-content").toArray()).call(self.canvas);
      
      invokeAPI("/api/topology", {}, "GET", function(data) {
        self.nodes = data.nodes;
        self.flows = data.flows;
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
        this.$(".plot-loading").hide();        
      });                  
    },    
    
    // build geo map
    buildGeoMapPlot: function(script) {
       this.$(".plot-loading").hide();
    },    
    
    // build line trend plot
    buildLineTrendPlot: function(script) {
      
      var self = this;
      // create new plot           
      this.plot = nv.models.lineChart()
      .margin(this.margin)
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true)
      .transitionDuration(this.transitionDuration)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .forceY(0).color(this.colorCategory);
        
      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) {
          var date = new Date(d);          
          return d3.time.format("%H:%M")(date);
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadMetricData(script));      
    },
    
    // build Area trend plot
    buildAreaTrendPlot: function(script) {
      var self = this;
      // create new plot           
      this.plot = nv.models.stackedAreaChart()
      .margin(this.margin)
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true) 
      .transitionDuration(this.transitionDuration)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .clipEdge(true)
      .forceY(0).color(this.colorCategory);
        
      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) { 
          var date = new Date(d);          
          return d3.time.format("%H:%M")(date);
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadMetricData(script));
      
    },

    // build bar distribution plot
    buildBarDistributionPlot: function(script) {
      var self = this;
      // create new plot           
      this.plot = nv.models.discreteBarChart().margin({
        left : 50,
        top: 15
      })
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .transitionDuration(this.transitionDuration)
      .showValues(true)
      .tooltips(false).color(this.colorCategory);
        
      this.plot.yAxis.tickFormat(getSIPrefixString);      
      
      this.plot.valueFormat(getSIPrefixString);      
        
      nv.addGraph(this.loadMetricData(script));
      
    },
    
    // build pie distribution plot
    buildPieDistributionPlot: function(script) {
      var self = this;
      // create new plot           
      this.plot = nv.models.pieChart()
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })
      .showLabels(true)     //Display pie labels
      .labelThreshold(.01)  //Configure the minimum slice size for labels to show up
      .labelType("percent") //Configure what type of data to show in the label. Can be "key", "value" or "percent"
      .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
      .donutRatio(0.35);     //Configure how big you want the donut hole size to be.
      
      nv.addGraph(this.loadMetricData(script));
      
    },    
    
    // build text plot
    buildTextPlot: function(script) {
       this.$(".plot-loading").hide();
    },    

    // build text plot
    buildRankPlot: function(script) {
       this.$(".plot-loading").hide();
    },    

    
    loadMetricData: function(script) {
      // GlobalFilter
      var self = this;
      var selectedFilters = GlobalFilter.getSelectedFilters();
      var scopes = [];
      selectedFilters.forEach(function(item) {
        scopes.push(item.id.substring(1));
      });
      var selectedTimeRange = GlobalFilter.getSelectedTimeRange();
      var params = {
        visualization: script.visualization,
        live: selectedTimeRange.live,
        metrics: script.metrics.join(),
        scope_type: selectedFilters.length > 0 ? selectedFilters[0].type : "all",    
        breakdown_type: script.breakdown_type,                     
      };
                     
      if (params.scope_type != "all") {
        params.scopes = scopes.join(',');
      }
      if (params.breakdown_type == "dimension") {
        params.breakdown_dimension = script.breakdown_dimension;
      }
      if (script.filter_dimension_key.length > "0") {
        params.filter_dimension = script.filter_dimension;
        params.filter_dimension_key = script.filter_dimension_key;
      }
      if (selectedTimeRange.live) {
        params.length = selectedTimeRange.length;
      } else {
        params.from = selectedTimeRange.from;
        params.to = selectedTimeRange.to;
      }
      
      // unit and radix calculation      
      var metricRadix = 1;
      var metricUnit  = "";
      if (script.metric_unit && metricUnitDef.hasOwnProperty(script.metric_unit)) {
        metricUnit  = metricUnitDef[script.metric_unit][0];
        metricRadix = metricUnitDef[script.metric_unit][1];
      }
      
      
      $.get("/api/metric_data", params,
        function(data) { 
          console.log(data);
          self.plotData = data;
          var needRemove = true;          
          self.plotData.forEach(function(item) {
            if (item.values.length > 0) {
              needRemove = false;
            }   
            if ((item.key in metricMap) && metricMap[item.key] != "") {
              item.key = metricMap[item.key];
            }
            if ((params.visualization != "bardistribution" 
            && params.visualization != "piedistribution"
            && params.visualization != "text")  
            && params.breakdown_type == "scope" && params.scope_type != "all") {
              for (var i = 0; i < selectedFilters.length; i ++) {
                if (selectedFilters[i].id.substring(1) == item.key) {
                  item.key = selectedFilters[i].name;
                  break;
                }
              }
            }         
            if ((params.visualization == "bardistribution" 
            || params.visualization == "piedistribution")  
            && params.breakdown_type == "metric") {
              item.values.forEach(function(sub_item) {
                if ((sub_item[0] in metricMap) && metricMap[sub_item[0]] != "") {
                  sub_item[0] = metricMap[sub_item[0]];
                }
              });
            }              
            if ((params.visualization == "bardistribution" 
            || params.visualization == "piedistribution")
            && params.breakdown_type == "scope" && params.scope_type != "all") {
              item.values.forEach(function(sub_item) {
                for (var i = 0; i < selectedFilters.length; i ++) {
                  if (selectedFilters[i].id.substring(1) == sub_item[0]) {
                    sub_item[0] = selectedFilters[i].name;
                    break;
                  }
                }
              });
            }
          });
          
          // recalculate metric value according to unit
          if (metricRadix != 1) {
            self.plotData.forEach(function(item) {
              item.values.forEach(function(sub_item) {
                sub_item[1] = sub_item[1] * 1.0 / metricRadix;
              });              
            });                      
          }
          
          // update pie result
          if (params.visualization == "piedistribution") {
            self.plotData = self.plotData.length > 0 ? self.plotData[0].values : [];
          }
          
          if (params.visualization == "text") {
            console.log(12345);
          } else {
            if (needRemove) {
              self.$('svg > *').remove();
            }          
            d3.selectAll(self.$('svg').toArray())
            .datum(self.plotData)
            .call(self.plot);
            self.$(".plot-loading").hide();
            self.$el.hide(0).show(0);            
          }          
          // self.plot.update();                   
        }, "json"        
      ).fail(function() {
        self.$(".plot-loading").hide();
      });      
    },
    
    // remove plot from gridster and view
    removePlot: function() {      
      this.gridster.remove_widget(this.$el);
      this.remove();
      this.unbind();
    }
          
  });  
  
  // Report Plot List
  // --------------
  var ReportPlotList = Backbone.Collection.extend({
    
    // url address
    url: "/api/report_plots",

    // model
    model: ReportPlot        
    
  }); 
  
  var ReportPlots = new ReportPlotList;   
  
  // Metric Item
  // --------------
  var Metric = Backbone.Model.extend({
    
    urlRoot: '',
    
    initialize: function() {
    },    
               
  });  
  
  // Metric List
  // --------------
  var MetricList = Backbone.Collection.extend({

    // model
    model: Metric,
    
    // url
    url: "/api/metrics"
    
  });     
  
  Metrics = new MetricList;    

 
  var configChangeTime = Date.now();
  var configChanging = false;
  var metricUnitList = [];  
  var breakDownTypeList = [];
  var breakDownDimensionList = [];
  var dimensionFilterList = [];
  var metricMap = {};
  
  // Plot Config View
  // **************
  var PlotConfigView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#plot-config"),
    
    // Cache the template function for a single item.
    newPlotTemplate: _.template($('#report-new-plot-template').html()),    
        
    // Delegated events
    events: {
      "click .config-cancel": "cancelConfig",
      "click .config-save": "saveConfig",
      "click .config-show-script": "showConfigScript",
      "click .chart-type": "chartTypeChanged",      
      // metric events
      "click .visualization": "visualizationChanged",
      "click .widget-type": "widgetTypeChanged",
            
      "change #metric-selector": "metricChanged",
      "change #metric-unit-selector": "metricUnitChanged",      
      "change #break-down-type": "breakDownChanged",
      "change #break-down-dimension": "breakDownDimensionChanged",
      "change #dimension-filter": "dimensionFilterChanged",
      "change #dimension-filter-key": "dimensionFilterKeyChanged",
      "input #graph-title": "graphTitleChanged",
      // widget events
      "change #event-size": "eventSizeChanged",      
      "input #widget-title": "widgetTitleChanged",
      "click .filter-options > label": "selectFilter",      
    },

    // init
    initialize: function() {      
            
      // bind view to functions
      _.bindAll(this, 'showConfig', 'importScript', 'exportScript', 'addAllMetrics', 'initSelectOptions', 
        'reloadPlot');
             
      // init variables
      this.metricSelector = this.$("#metric-selector");
      this.metricUnitSelector = this.$("#metric-unit-selector");
      this.breakDownTypeSelector = this.$("#break-down-type");
      this.breakDownDimensionSelector = this.$("#break-down-dimension");
      this.breakDownDimensionContainer = this.$("#break-down-dimension-container");
      this.dimensionFilterSelector = this.$("#dimension-filter");
      this.dimensionFilterContainer = this.$("#dimension-filter-container");
      this.dimensionFilterKeyContainer = this.$("#dimension-filter-key-container");
      this.dimensionFilterKey = this.$("#dimension-filter-key");
      this.graphTitle = this.$("#graph-title");
      this.widgetTitle = this.$("#widget-title");
      this.$("#function-widget-panel").hide();
      
      this.eventSizeSelector = this.$("#event-size");      
            
      // this.categoryContainer = this.$("#visual-panel");
      this.metricUnitSelector.select2({placeholder: "Select a unit", data:function() { return { results: metricUnitList }; }, minimumResultsForSearch: -1});
      this.breakDownTypeSelector.select2({data:function() { return { results: breakDownTypeList }; }, minimumResultsForSearch: -1});
      this.breakDownDimensionSelector.select2({data:function() { return { results: breakDownDimensionList }; }, minimumResultsForSearch: -1});
      this.dimensionFilterSelector.select2({placeholder: "Select a dimension", allowClear: true, 
        data:function() { return { results: dimensionFilterList }; }, minimumResultsForSearch: -1});
        
      this.eventSizeSelector.select2({placeholder: "Select a size", data:[
        {id:5, text:"5"},
        {id:10, text:"10"}, 
        {id:20, text:"20"}, 
        {id:50, text:"50"}], minimumResultsForSearch: -1});
      this.eventSizeSelector.select2("val", 5);
      
      this.dimensionFilterKey.editable({
        emptytext: 'Click to edit',
        emptyclass: 'placeholder',
        unsavedclass: null,
        type: 'text',        
        mode: 'inline',
        success: function(response, newValue) {
          PlotConfig.configChanged();
        }        
      });            

      // init tool tips
      this.$('[data-toggle="tooltip"]').tooltip({'placement': 'top'});
      
      // load backend data
      Metrics.bind('reset', this.addAllMetrics, this);            
      
      // load data from db
      Metrics.fetch({reset: true});         
    },
    
    // select filter
    selectFilter: function(ev) {      
      var selectFilter = $(ev.target).closest("label");
      if (selectFilter.attr("data-type") == "all") {        
        selectFilter.parent().find("label").removeClass("active");
        selectFilter.addClass("active");        
        ev.stopPropagation();
      } else {
        var activeLength = selectFilter.parent().find("label.active").length;
        if (selectFilter.hasClass("active")) {
          if (activeLength == 1) {
            selectFilter.parent().find("label[data-type='all']").addClass('active');
          }
        } else {
          selectFilter.parent().find("label[data-type='all']").removeClass('active');
        }
      } 
      this.configChanged();             
    },        
    
    // select chart type
    chartTypeChanged: function(ev) {
      var selectedChartType = $(ev.target).attr("data-type");
      if (selectedChartType == "metric-graph") {
        this.$("#metric-graph-panel").show();  
        this.$("#function-widget-panel").hide();
        this.graphTitleChanged(null);
      } else {
        this.$("#metric-graph-panel").hide();  
        this.$("#function-widget-panel").show();
        this.widgetTitleChanged(null);              
      }
      this.configChanged();          
    },
    
    // init select options
    initSelectOptions: function(reset) {
      var selectedMetrics = this.metricSelector.select2("data");      
      // init break down info
      if (selectedMetrics.length > 1) {
        breakDownTypeList = [{id: "metric", text: "Selected Metrics"}];
        this.breakDownTypeSelector.select2("val", "metric");
        reset ? this.breakDownDimensionContainer.hide() : this.breakDownDimensionContainer.fadeOut();
      } else if (selectedMetrics.length == 1 ) {
        breakDownTypeList = [ {id: "scope", text: "Global Scope"} ];
        if (selectedMetrics[0].dimensions.length > 0) {
          breakDownTypeList.push({id: "dimension", text: "Dimension"});
          breakDownDimensionList = [];          
          selectedMetrics[0].dimensions.forEach(function(item) {
            breakDownDimensionList.push({id: item, text: item});
          })
          this.breakDownTypeSelector.select2("val", "dimension");
          this.breakDownDimensionSelector.select2("val", selectedMetrics[0].dimensions[0]);  
          reset ? this.breakDownDimensionContainer.show() : this.breakDownDimensionContainer.fadeIn();
        } else {
          this.breakDownTypeSelector.select2("val", "scope");
          reset ? this.breakDownDimensionContainer.hide() : this.breakDownDimensionContainer.fadeOut();
        }
      } else {
        breakDownTypeList = [{id: "scope", text: "Global Scope"}];
        this.breakDownTypeSelector.select2("val", "scope");
        reset ? this.breakDownDimensionContainer.hide() : this.breakDownDimensionContainer.fadeOut();        
      } 
      
      // init dimension filter info 
      var intersectionList = [];
      if (selectedMetrics.length > 0) {
        intersectionList = selectedMetrics[0].dimensions;
        for (var i = 1; i < selectedMetrics.length; i ++) {
          intersectionList = _.intersection(intersectionList, selectedMetrics[i].dimensions);
        }        
      }
      dimensionFilterList = [];
      intersectionList.forEach(function(item) {
        dimensionFilterList.push({id: item, text: item});
      });     
      
      // init metric unit info
      var intersectionMetricUnit = "";
      metricUnitList = [];
      if (selectedMetrics.length > 0) {
        intersectionMetricUnit = selectedMetrics[0].unit;
        for (var i = 1; i < selectedMetrics.length; i ++) {
          if (selectedMetrics[i].unit != intersectionMetricUnit) {
            intersectionMetricUnit = "";
            break;
          }
        }                
      }
      if (metricUnitMap.hasOwnProperty(intersectionMetricUnit.trim())) {
        metricUnitMap[intersectionMetricUnit.trim()].forEach(function(item) {
          metricUnitList.push({id: item, text: item});   
        });               
      }
      
      this.metricUnitSelector.select2("val", metricUnitList.length > 0 ? metricUnitList[0].id : "");
      
      if (this.breakDownTypeSelector.select2("val") != "dimension" && dimensionFilterList.length > 0) {
        this.dimensionFilterSelector.select2("val", "");
        this.dimensionFilterKey.editable("setValue", "");
        reset ? this.dimensionFilterContainer.show() : this.dimensionFilterContainer.fadeIn(); 
        reset ? this.dimensionFilterKeyContainer.hide() : this.dimensionFilterKeyContainer.fadeOut();
      } else {
        reset ? this.dimensionFilterContainer.hide() : this.dimensionFilterContainer.fadeOut();
      }      
    },
        
        
    // visualization changed
    visualizationChanged: function(ev) {
      this.configChanged();      
    },
    
    // widget type changed
    widgetTypeChanged: function(ev) {
      this.configChanged();
    },
     
    // metric selection changed
    metricChanged: function(ev) {
      // init selectOptions
      this.initSelectOptions(false);
      // change placeholder
      var metricString = this.metricSelector.select2("val").toString();
      var selectedMetricUnit = this.metricUnitSelector.select2("val").toString();
      this.graphTitle.attr("placeholder", metricString);
      if (this.graphTitle.val().length == 0) {
        var metricUnit = "";
        if (selectedMetricUnit && metricUnitDef.hasOwnProperty(selectedMetricUnit)) {
          metricUnit  = metricUnitDef[selectedMetricUnit][0] == "" ? "" : " (" + metricUnitDef[selectedMetricUnit][0] + ")";        
        }              
        this.plotView.$(".plot-title").text(metricString + metricUnit);
      }
      // config changed
      this.configChanged(); 
    },
    
    // metric unit changed
    metricUnitChanged: function(ev) {
      this.configChanged();
    },
    
    // break down changed
    breakDownChanged: function(ev) {
      var breakDownType = this.breakDownTypeSelector.select2("val");
      if (breakDownType == "dimension") {
        this.breakDownDimensionContainer.fadeIn();
        this.dimensionFilterSelector.select2("val", "");
        this.dimensionFilterKey.editable("setValue", "");
        this.dimensionFilterContainer.fadeOut();
      } else {
        this.breakDownDimensionContainer.fadeOut();
        if (dimensionFilterList.length > 0) {  
          this.dimensionFilterSelector.select2("val", "");
          this.dimensionFilterKey.editable("setValue", "");
          this.dimensionFilterKeyContainer.hide();          
          this.dimensionFilterContainer.fadeIn();                            
        }
      }
      this.configChanged();
    },
    
    // break down dimension changed
    breakDownDimensionChanged: function(ev) {
      this.configChanged();
    },
    
    // dimension filter changed
    dimensionFilterChanged: function(ev) {
      this.dimensionFilterKey.editable("setValue", "");
      if (this.dimensionFilterSelector.select2("val") == "") {
        this.dimensionFilterKeyContainer.fadeOut();
      } else {
        this.dimensionFilterKeyContainer.fadeIn();
      }
      // this.configChanged();
    },
    
    // dimension filter key changed
    dimensionFilterKeyChanged: function(ev) {
      this.configChanged();
    },
    
    // plot title changed
    graphTitleChanged: function(ev) {
      var selectedMetricUnit = this.metricUnitSelector.select2("val").toString();
      var metricUnit = "";
      if (selectedMetricUnit && metricUnitDef.hasOwnProperty(selectedMetricUnit)) {
        metricUnit  = metricUnitDef[selectedMetricUnit][0] == "" ? "" : " (" + metricUnitDef[selectedMetricUnit][0] + ")";        
      }                    
      if (this.graphTitle.val().length > 0) {
        this.plotView.$(".plot-title").text(this.graphTitle.val() + metricUnit);
      } else {
        this.plotView.$(".plot-title").text(this.metricSelector.select2("val").toString() + metricUnit);        
      }      
    },
    
    // event size changed
    eventSizeChanged: function(ev) {
      this.configChanged();
    },

    // widget title changed
    widgetTitleChanged: function(ev) {
      if (this.widgetTitle.val().length > 0) {
        this.plotView.$(".plot-title").text(this.widgetTitle.val());        
      } else {
        this.plotView.$(".plot-title").text("Latest Events");
      }    
    },      

    // import from script
    importScript: function(script) {
      this.$(".chart-type").removeClass("active");
      this.$(".chart-type[data-type='" + script.chart_type + "']").addClass("active");            
      if (script.chart_type == "metric-graph") {
        this.$("#metric-graph-panel").show();  
        this.$("#function-widget-panel").hide();        
        // set visualization
        this.$(".visualization").removeClass("active");
        this.$(".visualization[data-type='" + script.visualization + "']").addClass("active");
        // set metrics
        this.metricSelector.select2("val", script.metrics);
        this.initSelectOptions(true);
        // set metric units
        this.metricUnitSelector.select2("val", script.metric_unit ? script.metric_unit : "");
        // set break down info
        this.breakDownTypeSelector.select2("val", script.breakdown_type);
        if (script.breakdown_type == "dimension") {
          this.breakDownDimensionContainer.show();
          this.breakDownDimensionSelector.select2("val", script.breakdown_dimension)
        } else {
          this.breakDownDimensionContainer.hide();
        }      
        // set dimension filter info
        if (script.breakdown_type != "dimension") {        
          this.dimensionFilterSelector.select2("val", script.filter_dimension);
          this.dimensionFilterKey.editable("setValue", script.filter_dimension_key);
          this.dimensionFilterContainer.show();        
          if (script.filter_dimension_key.length > 0) {
            this.dimensionFilterKeyContainer.show();
          } else {
            this.dimensionFilterSelector.select2("val", "");
            this.dimensionFilterKeyContainer.hide();
          }
        } else {
          this.dimensionFilterSelector.select2("val", "");
          this.dimensionFilterKey.editable("setValue", "");
          this.dimensionFilterContainer.hide();        
        }
        // set title
        if (script.title.length > 0) {
          this.graphTitle.val(script.title); 
        } else {
          this.graphTitle.attr("placeholder", script.metrics.toString());
        }              
      } else {
        this.$("#metric-graph-panel").hide();  
        this.$("#function-widget-panel").show();
        // set visualization
        this.$(".widget-type").removeClass("active");
        this.$(".widget-type[data-type='" + script.widget_type + "']").addClass("active");
        // set title
        if (script.title.length > 0) {
          this.widgetTitle.val(script.title); 
        } else {
          this.widgetTitle.attr("placeholder", "Latest Events");
        }        
        // set event severity
        if (script.event_severity) {
          this.$(".event-severity").removeClass("active");
          script.event_severity.forEach(function(value) {
            this.$(".event-severity[data-type='" + value + "']").addClass("active");
          });
        }
        // set event priority
        if (script.event_priority) {
          this.$(".event-priority").removeClass("active");
          script.event_priority.forEach(function(value) {
            this.$(".event-priority[data-type='" + value + "']").addClass("active");
          });
        }
        // set event status
        if (script.event_status) {
          this.$(".event-status").removeClass("active");
          script.event_status.forEach(function(value) {
            this.$(".event-status[data-type='" + value + "']").addClass("active");
          });
        }      
        // set event size
        this.eventSizeSelector.select2("val", script.event_size);
      }
    },
    
    reloadPlot: function() {
      this.plotView.newScript = this.exportScript();
      this.plotView.buildPlot(this.plotView.newScript);
    },
    
    // export to script
    exportScript: function() {
      
      var script = {};
      // get chart type
      script.chart_type = this.$(".chart-type.active").attr("data-type");
      if (script.chart_type == "metric-graph") {
        // get visualization
        script.visualization = this.$(".visualization.active").attr("data-type"); 
        // get metrics
        script.metrics = this.metricSelector.select2("val");
        // get metric units
        script.metric_unit = this.metricUnitSelector.select2("val").trim();
        // get break down info
        script.breakdown_type = this.breakDownTypeSelector.select2("val");
        if (script.breakdown_type == "dimension") {
          script.breakdown_dimension = this.breakDownDimensionSelector.select2("val"); 
        } else {
          script.breakdown_dimension = "";
        }      
        // get dimension filter info
        if (this.dimensionFilterContainer.is(":visible")) {
          script.filter_dimension = this.dimensionFilterSelector.select2("val");
          script.filter_dimension_key = this.dimensionFilterKey.editable('getValue', true);
        } else {
          script.filter_dimension = "";
          script.filter_dimension_key = "";
        }      
        // get title
        script.title = this.graphTitle.val();        
      } else {
        // get widget type
        script.widget_type = this.$(".widget-type.active").attr("data-type");
        // get event severity        
        if (this.$(".event-severity.active").length > 0 && this.$(".event-severity.active").attr("data-type") != "all") {
            script.event_severity = [];
            this.$(".event-severity.active").each(function(index) {
              script.event_severity.push($(this).attr("data-type"));
            });
        }
        // get event priority        
        if (this.$(".event-priority.active").length > 0 && this.$(".event-priority.active").attr("data-type") != "all") {
            script.event_priority = [];
            this.$(".event-priority.active").each(function(index) {
              script.event_priority.push($(this).attr("data-type"));
            });
        } 
        // get event status        
        if (this.$(".event-status.active").length > 0 && this.$(".event-status.active").attr("data-type") != "all") {
            script.event_status = [];
            this.$(".event-status.active").each(function(index) {
              script.event_status.push($(this).attr("data-type"));
            });
        }          
        // get event size
        script.event_size = this.eventSizeSelector.select2("val");
        // get title
        script.title = this.widgetTitle.val();                
      }
      // refresh data
      return script;      
    },
            
    // config changed
    configChanged: function() {
      this.plotView.startLoading();      
      var callback = this.reloadPlot;
      configChangeTime = Date.now();
      if (configChanging) {
        return;
      } else {
        configChanging = true;
      }
      setTimeout(function timeout() {
        if (Date.now() - configChangeTime > 400) {
          callback();
          configChanging = false;
        } else {
          setTimeout(timeout, 500);
        }
      }, 500);
    },
        
    // cancel config
    cancelConfig: function() {
      if (!this.plotView.model.get('id')) {
        ReportPlots.remove(this.plotView.model);
        // add empty plot
        this.gridster.add_widget($.trim(this.newPlotTemplate({})), 2, 2);
      } else {
        this.plotView.startLoading();
        // refresh data
        this.plotView.buildPlot(this.plotView.script);      
        this.plotView.editing = false;
      }               
      this.plotView.$el.removeClass("editing");
      $(".modal-backdrop").fadeOut();   
      this.$el.fadeOut();
      $("#report-list").css('z-index', '200');
    },
    
    // save config
    saveConfig: function() {
      var newScript = this.exportScript();
      if (!this.plotView.model.get('id')) {
        // add empty plot
        this.gridster.add_widget($.trim(this.newPlotTemplate({})), 2, 2);
      }      
      this.plotView.model.save({'script': JSON.stringify(newScript)});
      this.plotView.script = newScript;
      this.plotView.$el.removeClass("editing");
      $(".modal-backdrop").fadeOut();
      this.$el.fadeOut();
      $("#report-list").css('z-index', '200');
    }, 
    
    // show config
    showConfig: function() {
      var plotPos = this.plotView.$el.position();
      var plotLeft = plotPos.left;
      var plotTop = plotPos.top;
      var plotWidth = this.plotView.$el.width();
      var plotHeight = this.plotView.$el.height();
      var plotOffset = this.plotView.$el.offset().top;
      var plotContainerWidth = this.$el.parent().width();
      var windowHeight = $(window).height();
      var configHeight = this.$el.height();
      if (windowHeight - plotOffset - plotHeight >= 370) {
        this.$el.css({"left":plotLeft, "width": plotWidth, "top": plotTop + plotHeight + 10});        
      } else {
        if (plotContainerWidth >= 2 * plotWidth) {
          if (plotLeft < plotWidth) {
            // put config panel at right
            this.$el.css({"left":plotLeft + plotWidth + 10, "width": plotWidth, "top": plotTop});
          } else {
            // put config panel at left
            this.$el.css({"left":plotLeft - plotWidth - 10, "width": plotWidth, "top": plotTop});
          }
        } else {
          // anyway put config panel below
          this.$el.css({"left":plotLeft, "width": plotWidth, "top": plotTop + plotHeight + 10});
        }
      }
      this.importScript(JSON.parse(this.plotView.model.get('script')));
      this.plotView.$el.addClass("editing");
      $(".modal-backdrop").fadeIn();
      this.$el.fadeIn();      
      $("#report-list").css('z-index', '50');
    },
    
    // add all categorys
    addAllMetrics: function() {
      function format(item) {
        return item.id;
      };                  
      this.metricSelector.select2({
        multiple: true,
        width: 'copy',
        placeholder: "Select Metrics",
        data: {results: Metrics.toJSON(), text: 'id'},
        formatSelection: format,
        formatResult: format
      });   
      // init metric map
      Metrics.each(function(item) {
        metricMap[item.get('id')] = 
          (!item.get('name') || item.get('name') == "") ? "" : item.get('name');
      });        
    },                
  });
  
  // start Instance
  var PlotConfig = new PlotConfigView;  
  
              
  // Report List Ctl View
  // **************
  var ReportControlView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#body"),
    
    // Cache the template function for a single item.
    newPlotTemplate: _.template($('#report-new-plot-template').html()),
    
    // Delegated events
    events: {
      "click .inline-actions": "toggleInlineDropdown",
      "click .report-edit": "editReport",
      "click .report-finish-editing": "finishEditingReport",
      "click .widget-new-plot": "addPlotToReport",       
      "click .create-category": "addCategoryToApp",
      "click .hide-panel": "hideDashboardCategory",
      "click #hidden-panel span": "showDashboardCategory",
      // "click .modal-backdrop": "cancelPlotConfig",
      "click .time-ctl .backward": "selectBackwardPeriod",
      "click .time-ctl .forward": "selectForwardPeriod",
      "click .time-ctl .pause": "pauseAutoRefresh"
    },

    // init
    initialize: function() {      
            
      // bind view to functions
       _.bindAll(this, 'addOneCategory', 'batchUpdatePositions', 'selectReport', 
         'selectDefault', 'updateFilter');       
      // init variables
      this.categoryContainer = this.$("#visual-panel");
      this.reportGrid = this.$(".report-grid");
      this.selectedReportName = this.$(".report-selected-label span");
      this.autoRefresh = true;      
      this.refreshInterval = 30;
      this.refreshTime = new Date().getTime() / 1000;
      this.refreshProgress = this.$(".refresh-progress");
      this.refreshProgress.width("0%");      

      // init binding events
      ReportPlots.bind('add', this.addOnePlot, this);
      ReportCategorys.bind('add', this.createOneCategory, this);
      ReportCategorys.bind('reset', this.addAllCategorys, this);            
      
      // load data from db
      ReportCategorys.fetch({reset: true});   
      
      // initialize gridster
      var maxWidth = $(".gridster").width();
      var widgetMargin = 5;
      var maxCols = 6;
      var minHeight = 100;      
       
      var self = this;
      this.gridster = this.reportGrid.find(" > ul").gridster({
        widget_margins : [widgetMargin, widgetMargin],
        widget_base_dimensions : [Math.floor((maxWidth / maxCols) - (widgetMargin * 2)), minHeight],
        max_cols : maxCols,
        resize : {
          enabled : true,
          stop: function (e, ui, $widget) {            
            var plotID = $widget.attr("data-id");
            ReportPlots.filter(function(item) {
              return item.get('id') == plotID;
            }).forEach(function(item) {
              item.trigger("resize");
            });
            self.batchUpdatePositions();            
          }                
        },        
        draggable: {
          handle: '.widget-header',
          stop: function(e, ui, $widget) {
            self.batchUpdatePositions();
          }            
        }        
      }).data('gridster');
      this.gridster.disable();
      this.gridster.disable_resize();
         
      // give gridster access to plotConfig       
      PlotConfig.gridster = this.gridster;  
      
      // register global filter
      GlobalFilter.addObserver(this);
      
      var self = this;
      
      // auto refresh data
      setInterval(function timeout() {
        var second = new Date().getTime() / 1000;
        if (self.autoRefresh) {
          self.refreshProgress.width((second - self.refreshTime) * 100 
            / self.refreshInterval +"%");
        }
        if (self.autoRefresh && second - self.refreshTime > self.refreshInterval) {
          self.updateFilter();
        }
      }, 1000);      
                 
    },
    
    // hideDashboardCategory
    hideDashboardCategory: function() {
      this.$("#visual-panel").hide();
      this.$("#hidden-panel").show();  
      this.$("#report-content").css("margin-left", 25);
      // update gridster widget widths
      var maxWidth = $(".gridster").width();
      var widgetMargin = 5;
      var maxCols = 6;
      var minHeight = 100;
      this.gridster.resize_widget_dimensions({widget_base_dimensions: 
        [Math.floor((maxWidth / maxCols) - (widgetMargin * 2)), minHeight]});
      // resize all widgets
      setTimeout(function timeout() {
        ReportPlots.forEach(function(item) {
          item.trigger("resize");
        });      
      }, 300);      
    },
    
    // show dashboard cagegory
    showDashboardCategory: function() {
      this.$("#visual-panel").show();
      this.$("#hidden-panel").hide();           
      this.$("#report-content").css("margin-left", 220);
      // update gridster widget widths
      var maxWidth = $(".gridster").width();
      var widgetMargin = 5;
      var maxCols = 6;
      var minHeight = 100;
      this.gridster.resize_widget_dimensions({widget_base_dimensions: 
        [Math.floor((maxWidth / maxCols) - (widgetMargin * 2)), minHeight]});
      // resize all widgets
      setTimeout(function timeout() {
        ReportPlots.forEach(function(item) {
          item.trigger("resize");
        });      
      }, 300);      
    },
    
    // update filter
    updateFilter: function() {
      ReportPlots.forEach(function(item) {
        item.trigger("updatefilter");
      });             
      // update time control status
      if (GlobalFilter.getSelectedTimeRange().live) {   
        this.$(".time-ctl .pause").prop('disabled', false);
        this.$(".time-ctl .forward").prop('disabled', true);
        this.$(".time-ctl .pause > span").addClass("glyphicon-pause");
        this.$(".time-ctl .pause > span").removeClass("glyphicon-play");
        this.$(".time-ctl .pause > span").removeClass("disabled");
        this.$(".time-ctl .forward > span").addClass("disabled");        
        this.autoRefresh = true;
      } else {        
        this.$(".time-ctl .pause").prop('disabled', true);        
        this.$(".time-ctl .forward").prop('disabled', false);
        this.$(".time-ctl .pause > span").addClass("disabled");
        this.$(".time-ctl .forward > span").removeClass("disabled");
        this.$(".time-ctl .pause > span").addClass("glyphicon-play");
        this.$(".time-ctl .pause > span").removeClass("glyphicon-pause");                
        this.autoRefresh = false;
      }
      this.refreshTime = new Date().getTime() / 1000;
      
      var timeRangeLength = GlobalFilter.getSelectedTimeRange().length;
      if (timeRangeLength >= 4 * 60) {
        this.refreshInterval = 60;          
      } else if (timeRangeLength >= 2 * 24 * 60) {
        this.refreshInterval = 600;
      } else {
        this.refreshInterval = 30;
      }
    },
    
    // iterate all cells to patch update db     
    batchUpdatePositions: function() {
      ReportPlots.forEach(function(item) {
        item.trigger("checkposition");
      });      
    },    
    
    // cancel plot config if user click backdrop
    cancelPlotConfig: function(ev) {
      PlotConfig.cancelConfig();
    },
        
    // add one category
    addOneCategory: function(item) {
      var view = new ReportCategoryView({model: item});      
      this.categoryContainer.append(view.render().el);      
      item.reports.fetch({
        reset: true, 
        data:{ report_category_id: item.get('id') },
        success: function(collection, response, options) {
          // select default
          if (!ReportControl.selectedReportID || ReportControl.selectedReportID == "") {
            ReportControl.selectDefault();
          }
        }
      });                  
    },
    
    // create one category
    createOneCategory: function(item) {
      var view = new ReportCategoryView({model: item});      
      this.categoryContainer.append(view.render().el);
      view.addCategory();                       
    },
    
    // add all categorys
    addAllCategorys: function(item) {
      ReportCategorys.each(this.addOneCategory);
    },
    
    // add report to category
    addCategoryToApp: function(ev) {   
      ev.stopPropagation();   
      // add new report
      ReportCategorys.add({"name": "", order: 1});      
    },

    // add one plot
    addOnePlot: function(item) {
      var view = new ReportPlotView({model: item, attributes: {"data-id": item.get('id')}});
      view.gridster = this.gridster;
      view.plotConfig = PlotConfig; 
      view.addPlot();     
    },
    
    // select default report, if no default, clear select
    selectDefault: function() {
      var defaultReport = this.$(".report.default").length 
        == 0 ? null : this.$(".report.default").first();       
      this.$(".report").removeClass("active");  
      if (!defaultReport) {
        this.selectReport("unselect", "", "", "");
      } else {        
        defaultReport.addClass("active");
        this.selectReport("select", defaultReport.attr("data-id"), 
          defaultReport.find(".report-name").text(), defaultReport.closest(".category").find(".category-name").text());
      }        
    },
    
    // select report, type: select|unselect|update
    selectReport: function(type, reportID, reportName, categoryName) {
      if (type == "select") {
        if (this.selectedReportID != reportID) {
          this.selectedReportID = reportID;
          this.selectedReportName = reportName;
          this.selectedCategoryName = categoryName;
          this.$(".report-selected-label span").text(this.selectedCategoryName 
            + "  -  " + this.selectedReportName);
          // load plots from DB
          ReportPlots.fetch({data: {report_id: this.selectedReportID}});
          this.finishEditingReport();          
        }
      } else if (type == "unselect") {
        this.selectedReportID = "";
        this.selectedReportName = "";
        this.selectedCategoryName = "";                
        this.$(".report-selected-label span").text("<-- Select a report to begin");
        // load empty data from DB
        ReportPlots.fetch({data: {report_id: "-8888"}});        
        this.finishEditingReport();
        this.$(".view-buttons").hide();                
        this.$(".edit-buttons").hide();
      } else if (type == "update") {
        if (reportName.length > 0) {
          this.selectedReportName = reportName;
        }
        if (categoryName.length > 0) {
          this.selectedCategoryName = categoryName;
        }
        this.$(".report-selected-label span").text(this.selectedCategoryName 
          + "  -  " + this.selectedReportName);
      }

    },
    
    // edit report
    editReport: function(ev) {
      this.$(".view-buttons").hide();
      this.$(".edit-buttons").show();
      this.reportGrid.addClass("editing");
      // add empty plot
      this.gridster.add_widget($.trim(this.newPlotTemplate({})), 2, 2);
      // enable gridster        
      this.gridster.enable();
      this.gridster.enable_resize();                             
    },
    
    // add plot to report
    addPlotToReport: function(ev) {
      // remove empty plot
      this.gridster.remove_widget(this.$(".widget-new-plot"));      
      // add new model      
      ReportPlots.add({
        report: this.selectedReportID, 
        col: parseInt($(ev.target).attr("data-col")) || 1, 
        row: parseInt($(ev.target).attr("data-row")) || 1, 
        size_x: parseInt($(ev.target).attr("data-sizex")) || 1, 
        size_y: parseInt($(ev.target).attr("data-sizey")) || 1, 
        script: "{\"chart_type\":\"metric-graph\",\"visualization\":\"linetrend\",\"metrics\":[],\"breakdown_type\":\"scope\",\
          \"breakdown_dimension\":\"\",\"filter_dimension\":\"\",\"filter_dimension_key\":\"\",\"title\":\"\"}"
      });            
    },
    
    // finish editing
    finishEditingReport: function(ev) {
      this.gridster.disable();
      this.gridster.disable_resize();
      this.reportGrid.removeClass("editing");
      this.$(".edit-buttons").hide();
      this.$(".view-buttons").show();                                                  
      if (this.$(".widget-new-plot").length > 0) {
        // remove empty plot
        this.gridster.remove_widget(this.$(".widget-new-plot"));
        // 
      }
    },
    
    // selectForwardPeriod
    selectForwardPeriod: function(ev) {
      GlobalFilter.moveForward();
    },
    
    // selectBackwardPeriod
    selectBackwardPeriod: function(ev) {
      GlobalFilter.moveBackward();
    },
        
    // pauseAutoRefresh
    pauseAutoRefresh: function(ev) {
      if (this.$(".time-ctl .pause > span").hasClass("glyphicon-pause")) {
        this.$(".time-ctl .pause > span").removeClass("glyphicon-pause");
        this.$(".time-ctl .pause > span").addClass("glyphicon-play");
        this.autoRefresh = false;
      } else {
        this.$(".time-ctl .pause > span").removeClass("glyphicon-play");
        this.$(".time-ctl .pause > span").addClass("glyphicon-pause");
        this.autoRefresh = true;                
      }
    }

  });
  
  // start Instance
  var ReportControl = new ReportControlView;      
    
});
