$(function() {

  // highlight menu                
  $("#nav-menu-events").addClass("active");
  
  // Event Filter View
  // **************
  var EventFilterView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#filter-list"),
  
    // Reserved Events
    events: {   
      "click .filter-options li": "selectFilter",
    },

    // Reserved Initialization
    initialize: function() {            
      // bind this
      _.bindAll(this, "updateEventFilters");     
 
      // // bind view to functions             
      // this.model.bind('remove', this.remove, this);         
      // this.model.reports.bind('add', this.createOne, this);      
      // this.model.reports.bind('reset', this.addAll, this);                         
    },
        
    // add category
    selectFilter: function(ev) {      
      var selectFilter = $(ev.target).closest("li");
      var eventFilter = selectFilter.closest(".event-filter");
      if (selectFilter.attr("filter-value") == "all") {
        eventFilter.find("li").removeClass("active");
        selectFilter.addClass("active");
      } else {
        selectFilter.toggleClass("active");
        if (selectFilter.hasClass("active")) {
          eventFilter.find("li[filter-value='all']").removeClass('active');
        } else {
          if (eventFilter.find("li.active").length == 0) {
            eventFilter.find("li[filter-value='all']").addClass('active');
          }
        }       
      }    
      this.updateEventFilters();    
      // update event list
      EventList.updateFilter(false, 1);         
    },    
    
    // update filter list
    updateEventFilters: function() {
      eventFilters = {};
      $(".event-filter").each(function(key, value) {
        if (!$(value).find("li[filter-value='all']").hasClass("active")) {          
          eventFilters[$(value).attr("filter-type")] = [];
          $(value).find("li.active").each(function(key, filter_value) {
            eventFilters[$(value).attr("filter-type")].push($(filter_value).attr("filter-value"));
          });           
        }
      });
    },
    
  });
  
  // start Instance
  var EventFilter = new EventFilterView;        
                
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
    tagName: "tr",
    
    // class name
    className: "",    
    
    // Cache the template function for a single item.
    template: _.template($('#event-template').html()),
    
    // event detail template
    eventDetailTemplate: _.template($('#event-detail-template').html()),    

    // Reserved Events
    events: {   
      "click td:not(.severity)": "toggleDetail",
      "click td.severity": "toggleSelect",
      "click .close-event": "closeEvent",
      "click .acknowledge-event": "acknowledgeEvent",
    },

    // Reserved Initialization
    initialize: function() {
      _.bindAll(this, 'buildTrend', 'loadPlotData');
      this.model.bind('change', this.render, this);
      this.model.bind('remove', this.remove, this);
    },
    
    // toggle select
    toggleSelect: function(ev) {
      if (!$(ev.target).is("input")) {        
        $(ev.target).find("input").prop("checked", !$(ev.target).find("input").prop("checked"));
        EventList.checkOne();
      }
    },
    
    // closeEvent
    closeEvent: function(ev) {
      this.model.save({"status": 2}, {patch: true});
      // refresh list
      EventList.updateFilter(false, 1);
    },
    
    // acknowledege event
    acknowledgeEvent: function(ev) {
      this.model.save({"status": 1}, {patch: true});
      // refresh list    
      EventList.updateFilter(false, 1);
    },
    
    // toggle detail
    toggleDetail: function(ev) {
      var self = this;
      ev.stopPropagation();
      selectRow = $(ev.target).closest("tr");
      if (selectRow.next().length > 0 && selectRow.next().hasClass("detail")) {
        if (!$(".refresh-ctl .pause > span").hasClass("glyphicon-play")) {
          EventList.autoRefresh = true;
        }
        // hide
        selectRow.next().find(".event-detail").slideUp(100, function() {
          selectRow.next().remove();  
          selectRow.removeClass("selected");        
        });        
      } else {
        EventList.autoRefresh = false;
        var detailObj = this.model.toJSON();
        // remove all detail
        this.$el.parent().find("tr.detail").remove();
        this.$el.parent().find("tr").removeClass("selected");        
        eventDetail = $("<tr class='detail'></tr>");        
        detailObj.severity = severityTypes[detailObj.severity];
        detailObj.update_time = pastTimeString(Date.parse(detailObj.update_time))
          + "  (Lasted " + durationString(new Date(detailObj.create_time), new Date(detailObj.update_time)) + ")";
        detailObj.create_time = pastTimeString(Date.parse(detailObj.create_time));
        detailObj.metric_value = "N/A";
        eventDetail.html(this.eventDetailTemplate(detailObj));
        selectRow.after(eventDetail);
        selectRow.addClass("selected");
        eventDetail.find(".event-detail").hide().slideDown(300);
        eventDetail.addClass(statusTypes[this.model.get('status')]);
        // get alert info        
        if (detailObj.alert != undefined && detailObj.alert != "") {
          $.get("/api/alerts/" + detailObj.alert, {},
            function(data) { 
              eventDetail.find("#operand").text(getSIPrefixString(data.operand));              
              eventDetail.find("#operator").text(alertOperators[data.operator]);
              eventDetail.find("#trigger_type").text(alertTriggerTypes[data.trigger_type]);
              self.buildTrend(eventDetail.find("#metric_value"), alertTriggerTypes[data.trigger_type], 
                severityTypes[data.severity], data.operand); 
            }, "json"        
          );                
        } else {
          // build chart
          this.buildTrend(eventDetail.find("#metric_value"), "", "Error", -1);          
        }  
      }                  
    },     
    
    // build line trend
    buildTrend: function(valueEl, alertTriggerType, severity, operand) {      
      // create new plot           
      this.plot = nv.models.lineChart()
      .margin({ left : 50, top: 10, bottom: 25 })
      .x(function(d) { return d[0] })
      .y(function(d) { return d[1] })      
      .useInteractiveGuideline(true)
      .transitionDuration(350)
      .showLegend(false)
      .showYAxis(true)
      .showXAxis(true)
      .forceY(0)
      .useExtArea(true)
      .extAreaClass(severity);

      this.plot.xAxis
      .axisLabel('').tickFormat(function(d) { 
          return d3.time.format("%H:%M")(new Date(d)); 
       });
  
      this.plot.yAxis
      .axisLabel('').tickFormat(getSIPrefixString);
        
      nv.addGraph(this.loadPlotData(valueEl, alertTriggerType, operand));
      
    },    
    
    // load plot data
    loadPlotData: function(valueEl, alertTriggerType, operand) {
      // GlobalFilter
      var self = this;
      var detailObj = this.model.toJSON();      
      var params = {
        visualization: "linetrend",
        live: false,
        metrics: detailObj.metric_id,
        from: Date.parse(detailObj.create_time) - 15 * 60 * 1000,
        to: Date.parse(detailObj.create_time) + 15 * 60 * 1000,   
        scope_type: "all",
        breakdown_type: "scope",                      
      };
            
      var create_time = Date.parse(detailObj.create_time);
      $.get("/api/metric_data", params,
        function(data) { 
          var normValue = {key: "threshold", color: "#f66", values: []};
          var offsetArray = [];
          if (data.length > 0) {
            var dataArray = data[0].values;
            for (i = 0; i < dataArray.length; i ++) {
              offsetArray.push([Math.abs(dataArray[i][0] - create_time), dataArray[i][1]]);            
            }            
            // set norm
            if (alertTriggerType == "threshold") {
              for (i = 0; i < dataArray.length; i ++) {
                normValue.values.push([dataArray[i][0], operand]);            
              }
              data.push(normValue);                          
            }
          }
          var minValue = _.min(offsetArray, function(item) {
            return item[0];
          });
          if (minValue != Infinity) {
            valueEl.text(getSIPrefixString(minValue[1]));
          }
          
          self.plotData = data;

          d3.selectAll(self.$el.next().find('svg').toArray())
          .datum(self.plotData)
          .call(self.plot);
          // self.$(".plot-loading").hide();
          // self.$el.hide(0).show(0);
          // self.plot.update();                   
        }, "json"        
      ).fail(function() {
        // self.$(".plot-loading").hide();
      });      
    },    
    
    // Re-render the list item.
    render: function() {      
      var eventObj = this.model.toJSON();
      eventObj.scope = "*";
      eventObj.severity = severityTypes[eventObj.severity];
      eventObj.priority = priorityTypes[eventObj.priority];
      eventObj.status = statusTypes[eventObj.status];
      eventObj.create_time = formatDateTime(eventObj.create_time); // pastTimeString(Date.parse(eventObj.create_time));
      eventObj.update_time = formatDateTime(eventObj.update_time); // pastTimeString(Date.parse(eventObj.update_time));
      this.$el.html(this.template(eventObj));
      this.$("input.select-event").attr("data-id", eventObj.id);
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
      
      this.perPage = 20;
    },    
    
    // parse
    parse: function(resp) {
      this.count = resp.count;
      this.page = resp.page;
      this.pages = Math.floor((resp.count  - 0.0001) / this.perPage) + 1;
      this.next = resp.next;
      this.previous = resp.previous;
      this.showingCount = resp.results.length;
      this.fromNum = (resp.page - 1) * this.perPage + 1;
      this.toNum = this.fromNum + this.showingCount - 1;
      return resp.results;
    },        
  });       
            
  // Define Event List instance
  var Events = new EventList;  
      
  // common variables    
  var eventFilters = {}; 
  var keywordChangeTime = Date.now();  
  var keywordChanging = false;       
          
  // Event List View
  // **************
  var EventListView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#event-content"),
        
    // showing count template
    showingNumberTemplate: _.template($('#showing-number-template').html()),
                
    // Delegated events
    events: {
      "input #input-search-events": "seachEvent",
      "click tbody :checkbox": "checkOne",
      "click thead :checkbox": "checkAll",
      "click thead > tr > th.sortable": "toggleSort",
      "click #close-one": "closeOne",
      "click #acknowledge-one": "acknowledgeOne",
      "click #close-all": "closeAll",
      "click #acknowledge-all": "acknowledgeAll",     
      "click #page-row-count li": "changePageRows",
      "click .refresh-ctl .pause": "pauseAutoRefresh",
      "click .refresh-ctl .refresh": "refreshEvent",
      "click .search-events span.glyphicon-remove": "clearSearchKey" 
    },

    // init
    initialize: function() {      
            
      // bind view to functions
      _.bindAll(this, 'updateFilter', 'addOne', 'addAll');
             
      // init variables
      this.keyword = this.$("#input-search-events");
      this.eventContainer = this.$("tbody");
      this.loadingBackdrop = this.$("#loading-backdrop");
      this.showingNumber = this.$(".showing-number");
      this.sortField = "-update_time";
      this.visiblePages = 20;
      
      this.autoRefresh = true;  
      this.selectingEvents = false;    
      this.refreshInterval = 30;
      this.refreshTime = new Date().getTime() / 1000;
      this.refreshProgress = this.$(".refresh-progress");
      this.refreshProgress.width("0%");      

      
      GlobalFilter.initTimeRange(24 * 60);

      // bind model events            
      Events.bind('add', this.addOne, this);
      Events.bind('reset', this.addAll, this);
            
      // register observer
      GlobalFilter.addObserver(this);
      
      // init event filters
      EventFilter.updateEventFilters();
      // init data
      this.updateFilter(false, 1);
      
      var self = this;
      
      // auto refresh data
      setInterval(function timeout() {
        var second = new Date().getTime() / 1000;
        if (self.autoRefresh && !self.selectingEvents) {
          self.refreshProgress.width((second - self.refreshTime) * 100 
            / self.refreshInterval +"%");
        }
        if (self.autoRefresh && !selectingEvents && second - self.refreshTime > self.refreshInterval) {
          self.updateFilter(false, 1);
        }
      }, 1000);            
    },
    
    // pause Auto Refresh
    pauseAutoRefresh: function(ev) {
      if (this.$(".refresh-ctl .pause > span").hasClass("glyphicon-pause")) {
        this.$(".refresh-ctl .pause > span").removeClass("glyphicon-pause");
        this.$(".refresh-ctl .pause > span").addClass("glyphicon-play");
        this.autoRefresh = false;
      } else {
        this.$(".refresh-ctl .pause > span").removeClass("glyphicon-play");
        this.$(".refresh-ctl .pause > span").addClass("glyphicon-pause");
        this.autoRefresh = true;                
      }
    },
    
    // manually refresh events
    refreshEvent: function(ev) {
      this.updateFilter(false, 1);  
    },
    
    // change page rows
    changePageRows: function(ev) {      
      this.$("#page-row-count li").removeClass("active");
      $(ev.target).closest("li").addClass("active");
      this.visiblePages = parseInt($(ev.target).closest("li").attr("page-rows"), 10) || 20;
      Events.perPage = this.visiblePages;
      this.$("#page-row-count .dropdown-name").text($(ev.target).closest("li").text());
      this.updateFilter(false, 1); 
    },
    
    // close one event
    closeOne: function(ev) {
      $(ev.target).closest("tr.detail").prev().find(".close-event").trigger("click");
    },
    
    // ack one event
    acknowledgeOne: function(ev) {
      $(ev.target).closest("tr.detail").prev().find(".acknowledge-event").trigger("click");  
    },
    
    // ack one event
    acknowledgeAll: function(ev) {
      var showWarning = false;
      this.$('input.select-event:checkbox:checked').each(function(el) {
        var eventID = $(this).attr("data-id");
        Events.forEach(function(item) {
          if (item.get("id") == eventID && item.get("status") != 0) {
            showWarning = true;
          }
        });            
      });      
      if (showWarning) {
        showAlertMessage("warning", "You can only acknowledge events with 'open' status!");
        return;        
      }
      this.$('input.select-event:checkbox:checked').each(function(el) {
        var eventID = $(this).attr("data-id");
        Events.forEach(function(item) {
          if (item.get("id") == eventID) {
            if (item.get("status") == 0) {            
              item.save({"status": 1}, {patch: true});
            }                                
          }
        });            
      });
      this.updateFilter(false, 1);        
    },    
    
    // close one event
    closeAll: function(ev) {
      var showWarning = false;
      this.$('input.select-event:checkbox:checked').each(function(el) {
        var eventID = $(this).attr("data-id");
        Events.forEach(function(item) {
          if (item.get("id") == eventID && item.get("status") != 1) {
            showWarning = true;
          }
        });            
      });      
      if (showWarning) {
        showAlertMessage("warning", "You can only close events with 'acknowledged' status!");
        return;        
      }      
      this.$('input.select-event:checkbox:checked').each(function(el) {
        var eventID = $(this).attr("data-id");
        Events.forEach(function(item) {
          if (item.get("id") == eventID) {
            if (item.get("status") < 2) {
              item.save({"status": 2}, {patch: true});              
            }                                
          }
        });            
      });
      this.updateFilter(false, 1);      
    },
                      
    // toggle sort
    toggleSort: function(ev) {
      var isAscending = $(ev.target).hasClass('ascending');
      this.$('thead > tr > th').removeClass('ascending');
      this.$('thead > tr > th').removeClass('descending');
      isAscending ? $(ev.target).addClass('descending') : $(ev.target).addClass('ascending');   
      // reload data
      this.sortField = $(ev.target).hasClass('ascending') ? $(ev.target).attr("sort-field") : "-" + $(ev.target).attr("sort-field");
      this.updateFilter(false, 1);
      
    },
            
    // check one
    checkOne: function() {
      if (this.$('tbody :checkbox').is(":checked")) {
        var selectedNum = this.$('input.select-event:checkbox:checked').length;
        this.$(".edit-buttons span.name").text("Edit Selected (" + selectedNum + ") Events");
        this.$(".edit-buttons").fadeIn(500);
        this.selectingEvents = true;
      } else {
        this.$(".edit-buttons").fadeOut(500); 
        this.selectingEvents = false;
      }      
    },
    
    // check all
    checkAll: function(ev) {
      if ($(ev.target).is(':checked')) {
          this.$("tbody :checkbox").prop('checked', true);
          var selectedNum = this.$('input.select-event:checkbox:checked').length;
          this.$(".edit-buttons span.name").text("Edit Selected (" + selectedNum + ") Events");
          this.$(".edit-buttons").fadeIn(500);
          this.selectingEvents = true;
      } else {
          this.$("tbody :checkbox").prop('checked', false);
          this.$(".edit-buttons").fadeOut(500);
          this.selectingEvents = false;          
      }      
    },   
    
    // clear seach key
    clearSearchKey: function(ev) {
      this.keyword.val("");
      this.updateFilter(false, 1);
      this.keyword.parent().find("span").addClass("glyphicon-search");        
      this.keyword.parent().find("span").removeClass("glyphicon-remove");      
    },
    
    // seachEvent
    seachEvent: function() {   
      // change search icon status
      if (this.keyword.val() == "") {
        this.keyword.parent().find("span").addClass("glyphicon-search");        
        this.keyword.parent().find("span").removeClass("glyphicon-remove");
      } else {
        this.keyword.parent().find("span").removeClass("glyphicon-search");      
        this.keyword.parent().find("span").addClass("glyphicon-remove");
      }
      var callback = this.updateFilter;
      keywordChangeTime = Date.now();
      if (keywordChanging) {
        return;
      } else {
        keywordChanging = true;
      }
      setTimeout(function timeout() {
        if (Date.now() - keywordChangeTime > 400) {
          callback(false, 1);
          keywordChanging = false;
        } else {
          setTimeout(timeout, 500);
        }
      }, 500);
    },
    
    // update filter
    updateFilter: function(switchingPage, page) {
      // GlobalFilter
      var selectedFilters = GlobalFilter.getSelectedFilters();
      var scopes = [];
      selectedFilters.forEach(function(item) {
        scopes.push(item.id.substring(1));
      });
      var params = {
        page: page,
        sort: this.sortField,
        scope_type: selectedFilters.length > 0 ? selectedFilters[0].type : "all",                         
      };
      if (params.scope_type != "all") {
        params.scopes = scopes.join(',');
      }      
      var selectedTimeRange = GlobalFilter.getSelectedTimeRange();
      if (selectedTimeRange.live) {
        params.from = (new Date()).getTime() - selectedTimeRange.length * 60 * 1000; 
      } else {
        params.to = selectedTimeRange.to;
        params.from = selectedTimeRange.from;
      }            
      for(var key in eventFilters) {
        params[key] = eventFilters[key].join(",");
      }
      if ($.trim(this.keyword.val()).length > 0) {
        params.key = $.trim(this.keyword.val());
      }
      params.rows = this.visiblePages;
      
      // close detail panel
      this.$("tr.detail").remove();
      
      // load data
      this.loadingBackdrop.show();
      this.$("thead :checkbox").prop('checked', false);
      this.$("tbody :checkbox").prop('checked', false);
      this.$(".edit-buttons").fadeOut(500);
      this.selectingEvents = false;
      var self = this;
      Events.fetch({ 
        data: params, 
        reset: true,
        success: function(collection, response, options) {         
          options.previousModels.forEach(function(item){
            item.el.remove();
            item.el.unbind();
          });
          self.loadingBackdrop.hide();
          if (Events.length == 0) {
            self.$("tr.reserve").show();
            if (self.$('#event-pagination li').length > 0) {
              self.$('#event-pagination').twbsPagination("destroy");
            }                               
            self.$('#event-pagination').hide();
            self.$('.showing-number').hide();
          } else {
            self.$("tr.reserve").hide();
            self.$('.showing-number').show();
            self.$('#event-pagination').show();
            if (!switchingPage) {
              if (self.$('#event-pagination li').length > 0) {
                self.$('#event-pagination').twbsPagination("destroy");
              }                   
              self.$('#event-pagination').twbsPagination({
                totalPages: Events.pages,
                visiblePages: 5,
                onPageClick: function (event, page) {
                  self.updateFilter(true, page);
                }
              });
            }
          }             
          self.showingNumber.html(self.showingNumberTemplate({count: Events.count, 
            fromNum: Events.fromNum, toNum: Events.toNum}));          
        },
        error: function() {
          self.loadingBackdrop.hide();
        },
      });  
      this.refreshTime = new Date().getTime() / 1000;                
    },    
    
    // add one event
    addOne: function(item) {
      var view = new EventView({model: item});
      this.eventContainer.append(view.render().el);
    },

    // Add all events
    addAll: function() {    
      Events.each(this.addOne);
    },        
  });
  
  // start Instance
  var EventList = new EventListView;  
        
});
