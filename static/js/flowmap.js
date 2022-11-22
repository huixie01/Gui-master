$(function() {  
  // highlight menu                
  $("#nav-menu-flowmap").addClass("active");
  
  // hide group edit panel
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
        
  // Flow traffic Item
  // --------------
  var FlowTraffic = Backbone.Model.extend({    
    urlRoot: '',    
    initialize: function() {
    },                   
  });  
  
  // Flow traffic View
  // **************
  var FlowTrafficView = Backbone.View.extend({

    // container element
    tagName: "div",
    
    // class name
    className: "traffic-item",
  
    // Cache the template function for a single item.
    template: _.template($('#flow-traffic-template').html()),

    // Reserved Events
    events: {   
      "click li.select": "changeFlowTraffic",
    },

    // Reserved Initialization
    initialize: function() {      
      // bind this
      // _.bindAll(this, "addOne");
      
      // bind view to functions           
      this.model.bind('remove', this.remove, this);
      this.model.bind('change', this.render, this);
    },
    
    // Re-render the list item.
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.attr("flow-id", this.model.get("id"));
      return this;
    },  
  });
  
  // FLow traffic List
  // --------------
  var FlowTrafficList = Backbone.Collection.extend({

    // model
    model: FlowTraffic,
    
    // url
    url: ""        
    
  });  
        
  // Flowmap Item
  // --------------
  var FlowMap = Backbone.Model.extend({    
    urlRoot: '',
    
    initialize: function() {
    },                   
  });  
  
  // Flowmap View
  // **************
  var FlowMapView = Backbone.View.extend({

    // container element
    tagName: "li",
    
    // class name
    className: "flowmap",
  
    // Cache the template function for a single item.
    template: _.template($('#flowmap-template').html()),

    // Reserved Events
    events: {   
      "click li.select": "changeFlowmap",
    },

    // Reserved Initialization
    initialize: function() {      
      // bind this
      // _.bindAll(this, "addOne");
      
      // bind view to functions           
      this.model.bind('remove', this.remove, this);
      this.model.bind('change', this.render, this);
    },
    
    // Re-render the list item.
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      if (this.model.get("is_default") == 1) {
        this.$el.addClass("default");
      } else {
        this.$el.removeClass("default");
      }
      return this;
    },  
  });
  
  
  // Flowmap List
  // --------------
  var FlowMapList = Backbone.Collection.extend({

    // model
    model: FlowMap,
    
    // url
    url: "/api/flowmaps"        
    
  });   
          
  // variabes
  var mapWidth = window.innerWidth - 93;
  var mapHeight = window.innerHeight - 88 - 35 - 40;
  var margin = {
    top : 0,
    right : 0,
    bottom : 0,
    left : 0
  };  
  var width = mapWidth - margin.left - margin.right;
  var height = mapHeight - margin.top - margin.bottom;  
  
  var formatNumber = d3.format(",.0f");
  var format = function(d) {
    return formatNumber(d) + " TWh";
  };
  var color = d3.scale.category20();  
            
  var sankey = d3.sankey()
    .nodeWidth(32)
    .nodePadding(5)
    .size([width, height])
    .padding([100, 100]);

  // variables
  var flowPath = sankey.flowPath();  
  var groupPath = sankey.groupPath();      
  var landingPath = sankey.landingPath();      
  var editorList = [];  
  var editing = false;
  var creating = false;
  var dragging = false;
  var destNodeList = [];
  var landingOrder = 0;
      
  var lastEditorIndex = -1;
  var lastNearestIndex = -1;
  
  var flowMap;     
  var landing, flow, node, group;
  
  var selectedEditor;
  
  var flowMapData = {}; 
  var oldFlowMapData = {};
  
  var plotMargin = {top: 5, right: 5, bottom: 5, left: 5},
      plotWidth = 300 - plotMargin.left - plotMargin.right,
      plotHeight = 60 - plotMargin.top - plotMargin.bottom;
  
  var parseDate = d3.time.format("%Y%m%d").parse;
  
  var plotX = d3.scale.linear()
      .range([0, plotWidth]);
  
  var plotY1 = d3.scale.linear()
      .range([plotHeight / 2, plotHeight]);
      
  var plotY2 = d3.scale.linear()
      .range([plotHeight / 2 , 0]);      
  
  var plotPath1 = d3.svg.area()
      .x(function(d) { return plotX(d.time); })
      .y0(plotHeight / 2)
      .y1(function(d) { return plotY1(d.value); });
      
  var plotPath2 = d3.svg.area()
      .x(function(d) { return plotX(d.time); })
      .y0(plotHeight / 2)
      .y1(function(d) { return plotY2(d.value); });      
  
  var plotSVG = d3.select("#traffic-popup-trend").append("svg")
      .attr("width", plotWidth + plotMargin.left + plotMargin.right)
      .attr("height", plotHeight + plotMargin.top + plotMargin.bottom)
    .append("g")
      .attr("transform", "translate(" + plotMargin.left + "," + plotMargin.top + ")");        
        
  var plotData1 = [];
  var plotData2 = [];
  
  var plot1 = plotSVG.append("path")
        .datum(plotData1)
        .attr("class", function() {
          return "area1";
        })
        .attr("d", plotPath1);
        
  var plot2 = plotSVG.append("path")
        .datum(plotData2)
        .attr("class", function() {
          return "area2";
        })
        .attr("d", plotPath2);  
  
  function cloneFlowMapData(source) {
    var newData = {"nodes": [], "groups": [], "flows": []};
    source.groups.forEach(function(item) {
      newData.groups.push({id: item.id, order: item.order, name: item.name});
    });
    source.nodes.forEach(function(item) {
      newData.nodes.push({id: item.id, order: item.order, type: item.type, 
        name: item.name, ip_address: item.ip_address, group: item.group.id ? item.group.id : item.group});
    });
    source.flows.forEach(function(item) {
      var flow_ = {protocol: [], 
        source: item.source.ip_address ? item.source.ip_address : item.source, 
        target: item.target.ip_address ? item.target.ip_address : item.target};
       item.protocol.forEach(function(p_item) {
         flow_.protocol.push({id: p_item.id, port: p_item.port, type: p_item.type, alias: p_item.alias});
       });
      newData.flows.push(flow_);
    });            
    return newData;
  };
  
  // ---
  // Handle dragging from HTML to dropping on SVG
  // ---
  var DragDropManager = {
    type: null,
    droppable: null,
    draggedMatchesTarget: function() {
      if (!this.droppable) return false;
      return (dwarfSet[this.droppable].indexOf(this.dragged) >= 0);
    }
  };  
             
  // Flow Map Control View
  // **************
  var FlowMapControlView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#body"),
    
    // Cache the template function for a single item.
    groupTemplate: _.template($('#group-template').html()),
    
    // Delegated events
    events: {
      "click #btn-edit-map": "editFlowMap",
      "click #btn-finish-edit": "finishEditing",
      "click #btn-cancel-edit": "cancelEditing",      
      "click #change-label-mode li": "changeLableMode",
      "click #change-show-count li": "changeShowCount",
      "click #edit-actions li.default": "markFlowMap",      
      "click #edit-actions li.create": "newFlowMap",
      "click #edit-actions li.delete": "deleteFlowMap",
      "click #btn-cancel-delete": "cancelDeleting",
      "click #btn-confirm-delete": "confirmDeleting",
      "click .group-info .remove": "removeGroup",
      "input #edit-flowmap #flowmap-name": "changeflowMapName", 
      "click #select-map li.flowmap": "changeSelectedFlowMap",  
      "click #traffic-popup-list .traffic-item:not(.header)": "changeSelectedFlowTraffic"   
    },

    // init
    initialize: function() {                  
      // bind view to functions
      _.bindAll(this, 'nodeMove', 'nodeDrop', 'initFlowMap', 'createSkeleton', 
        'removeNodeFlow', 'updateNodeFlow', 'createFlowMap', 'updateGroupInfo', 
        'updateLabel', 'refreshLayout', 'createOneFlowMap', 'addAllFlowMaps', 
        'toggleGlobalFilters', 'loadFlowMap', 'saveFlowMap', 'initDraggable', 
        'createOneFlowTraffic', 'selectFlow', 'selectFlowTraffic', 'refreshFlowTraffic', 'changeWidth');
             
      this.$("#traffic-popup").draggable({
          containment : "parent"
      });    
      
      GlobalFilter.initTimeRange(24 * 60);      
      
      GlobalFilter.switchToSelectorMode();
      
      this.flowMaps = new FlowMapList;
      this.flowTraffics = new FlowTrafficList;
      this.showingTraffic = false;
      this.trafficRefreshInterval = 30;
      this.trafficRefreshTime = 0;
      
      // init variables
      this.labelType = "ip_address";
      this.mapActions = this.$("#map-actions");
      this.selectedFlowMap = this.$("#select-map > button");
      this.flowMapContainer = this.$("#select-map > ul");
      this.flowTrafficContainer = this.$("#traffic-popup-list");
      this.flowMapNameEditor = this.$("#edit-flowmap #flowmap-name");
      this.flowMapNameShower = this.$("#view-flowmap .dropdown-name");
      
      // init binding events            
      this.flowMaps.bind('add', this.createOneFlowMap, this);
      this.flowMaps.bind('reset', this.addAllFlowMaps, this);            
      this.flowTraffics.bind('add', this.createOneFlowTraffic, this);
      
      // set height      
      this.$("#flowmap").height(height);
            
      // load data from db
      this.flowMaps.fetch({reset: true});
      
      // init flow map
      this.initFlowMap();  
      
      // loop refresh flow traffic data
      var self = this;
      setInterval(function timeout() {
        var second = new Date().getTime() / 1000;
        if (second - self.trafficRefreshTime > self.trafficRefreshInterval 
          && self.showingTraffic && self.flowTraffics.length > 0) {
          self.refreshFlowTraffic();
          self.trafficRefreshTime = second;
        }
      }, 1000);      
    },
          
    // refresh flow traffic
    refreshFlowTraffic: function() {
      var self = this;
      if (this.showingTraffic && this.flowTraffics.length > 0) {        
        var queryData = {
          flow_ids: []          
        };
        this.flowTraffics.forEach(function(item) {
          queryData.flow_ids.push(item.get('id'));          
        });  
        queryData.flow_ids = queryData.flow_ids.join(',');
        // load node related flows
        var select_flow_id = "";
        var select_item = self.$(".traffic-item.active");  
        if (select_item.length > 0) {
          select_flow_id = select_item.attr("flow-id");
        }                
        
        $.get("/api/flow_traffic", queryData,
          function(data) { 
            data.forEach(function(traffic) {
              self.flowTraffics.forEach(function(item) {
                if (item.get('id') == traffic.flow_id) {
                  item.set({
                    egress: trafficFormat(traffic.egress), 
                    ingress: trafficFormat(traffic.ingress)
                  });                  
                }   
                if (traffic.flow_id == select_flow_id) {
                  updateTrafficHistory(traffic.time, traffic.egress, traffic.ingress);
                }                            
              });
            });
          }, "json"        
        ).fail(function() {
        });      
      }
      
      function updateTrafficHistory(time, egress, ingress) {  
        plotData1.push({time: time, value: egress});
        if (plotData1.length >= 61) {
          plotData1 = plotData1.slice(1);
        }
        plotData2.push({time: time, value: ingress});
        if (plotData2.length >= 61) {
          plotData2 = plotData2.slice(1);
        }        
        var min_time = 0;
        var max_time = 0;            
        var min_value = 0;
        var max_value = 0;
        plotData1.forEach(function(item) {
          if (item.value > max_value)
            max_value = item.value;
        });                
        plotData2.forEach(function(item, index) {
          if (item.value > max_value)
            max_value = item.value;
          if (index == 0)
            min_time = item.time;
          if (index == plotData1.length - 1)
            max_time = item.time;
        });
        plotX.domain([min_time, max_time]);
        plotY1.domain([min_value, max_value]);
        plotY2.domain([min_value, max_value]);                                

        plot1.datum(plotData1).attr("d", plotPath1);
        plot2.datum(plotData2).attr("d", plotPath2);
      }
    },
    
    // selectFlowTraffic
    selectFlowTraffic: function(flow_id) {
      var self = this;
      if (this.showingTraffic && this.flowTraffics.length > 0) {        
        var queryData = {flow_id: flow_id};
        // load node related flows
        $.get("/api/flow_traffic_history", queryData,
          function(data) {
            plotData1 = [];
            plotData2 = [];            
            var min_time = 0;
            var max_time = 0;            
            var min_value = 0;
            var max_value = 0;
            data.forEach(function(item, index) {
              if (item.egress > max_value)
                max_value = item.egress;
              if (item.ingress > max_value)
                max_value = item.ingress;
              if (index == 0)
                min_time = item.time;
              if (index == data.length - 1)
                max_time = item.time;
              plotData1.push({
                time: item.time, 
                value: item.egress
              });
              plotData2.push({
                time: item.time, 
                value: item.ingress
              });            
            });
            plotX.domain([min_time, max_time]);
            plotY1.domain([min_value, max_value]);
            plotY2.domain([min_value, max_value]);                                
            plot1.datum(plotData1).attr("d", plotPath1);
            plot2.datum(plotData2).attr("d", plotPath2);            
          }, "json"        
        ).fail(function() {
        });      
      }
    },        
         
    // select flow
    selectFlow: function(flow_) {  
      // clear models
      var model = this.flowTraffics.pop();
      while (model) {
        model = this.flowTraffics.pop();
      }          
      if (!flow_) {
        flowMap.selectAll(".flow").classed("selected", false);        
        this.$("#traffic-popup-title span").text("Select Flow to monitor");
        this.$("#traffic-popup").addClass("shrink");        
      } else {
        this.showingTraffic = true;
        this.selectedFlowSource = flow_.source.ip_address;
        this.selectedFlowTarget = flow_.target.ip_address;
        this.$("#traffic-popup").removeClass("shrink");
        $("#traffic-popup-title span").text(flow_.source.ip_address + " - " + flow_.target.ip_address);
        for (var i = 0; i < flow_.protocol.length; i ++) {
          this.flowTraffics.add({
            id: flow_.protocol[i].id,
            protocol: flow_.protocol[i].type + ":" + flow_.protocol[i].port,
            protocol_alias: flow_.protocol[i].type + ":" + flow_.protocol[i].port + 
              (flow_.protocol[i].alias != "" ? "(" + flow_.protocol[i].alias + ")" : ""),
            egress: "0bps",
            ingress: "0bps"
          }); 
        }
        if (flow_.protocol.length  > 0) {
          // load history data
          this.$(".traffic-item[flow-id='" + flow_.protocol[0].id + "']").addClass("active");             
          this.selectFlowTraffic(flow_.protocol[0].id);
          this.trafficRefreshTime = 0;                   
        }
      }
    },
        
    // createOneFlowTraffic
    createOneFlowTraffic: function(item) {
      var view = new FlowTrafficView({model: item});
      this.flowTrafficContainer.append(view.render().el);
    },
    
    // mark flow map
    markFlowMap: function(ev) {
      this.flowMaps.each(function(item) {        
        if (item.get("id") == self.selectedID) {
          if (item.get("is_default") == 0) {
            item.set("is_default", 1);
            item.save();
          }
        } else {
          if (item.get("is_default") == 1) {
            item.set("is_default", 0);
            item.save();
          }
        }          
      });
    },
    
    // new flow map
    newFlowMap: function(ev) {
      self.selectFlow(null);
      this.$("#traffic-popup").hide();
      editing = true;
      creating = true;
      GlobalFilter.showScopeSelector(-1, this.initDraggable);            
      this.toggleGlobalFilters(true);
      this.flowMapNameEditor.val("");
      // create empty flow map
      flowMapData = { 
        nodes: [], 
        flows: [],
        groups: []
      };
      this.createFlowMap();
    },
    
    // delete flow map
    deleteFlowMap: function(ev) {
      this.mapActions.toggleClass("deleting");
    },
    
    // cancel delete flow map
    cancelDeleting: function(ev) {
      this.mapActions.removeClass();      
    },
    
    // confirm delete flow map
    confirmDeleting: function(ev) {
      var self = this;
      this.selectFlow(null);      
      this.flowMaps.each(function(item) {        
        if (item.get("id") == self.selectedID) {
          item.destroy({success: function(model, response) {
            self.cancelDeleting(ev);
            self.addAllFlowMaps(true);            
          }});
        }          
      });      
    },
    
    // change flow map name
    changeflowMapName: function(ev) {
      if ($(ev.target).val() != "" && $(ev.target).parent().hasClass("has-error")) {
        $(ev.target).parent().removeClass("has-error");  
      }
    },
    
    // create one flowmap
    createOneFlowMap: function(item, selectedID) {
      var className = "flowmap";
      if (item.get("id") == selectedID) className += " active";
      if (item.get("is_default") == 1)  className += " default";
      var view = new FlowMapView({model: item, 
        className: className,
        attributes: {'data-id': item.get('id')}});      
      this.flowMapContainer.append(view.render().el);                             
    },
    
    // add all flowmaps
    addAllFlowMaps: function(revert) {
      var self = this;
      var selectedID = -1;
      var selectedName = "";
      this.flowMaps.each(function(item) {
        if (item.get("is_default") == 1) {
          selectedID = item.get("id");
          selectedName = item.get("name");          
        } else if (selectedID == -1) {
          selectedID = item.get("id");
          selectedName = item.get("name");
        }        
      });
      if (revert != true) {
        this.flowMaps.each(function(item) {
          self.createOneFlowMap(item, selectedID);
        });              
      }
      // select default or fist map
      if (selectedID > -1) {
        // create flow map
        this.selectedID = selectedID;
        this.loadFlowMap(selectedID);  
        this.selectedFlowMap.removeClass("disabled");
        this.$("#btn-edit-map").removeClass("disabled");        
        this.flowMapNameShower.text(selectedName);                    
      } else {
        // clear flow map
        flowMapData = {groups:[], nodes:[], flows:[]};
        this.createFlowMap();
        this.$("#edit-actions li.delete").hide();
        this.$("#edit-actions li.default").hide();
        this.selectedFlowMap.addClass("disabled");
        this.$("#btn-edit-map").addClass("disabled");        
        this.flowMapNameShower.text("Please create flow map first...");                            
      }
    },
        
    // change lable mode
    changeLableMode: function(ev) {
      this.$("#change-label-mode li").removeClass("active");
      $(ev.target).closest("li").addClass("active");
      this.$("#change-label-mode .dropdown-name").text($(ev.target).closest("li").text());
      this.labelType = $(ev.target).closest("li").attr("data-id");
      this.updateLabel();
    },

    // change show count
    changeShowCount: function(ev) {
      this.$("#change-show-count li").removeClass("active");
      $(ev.target).closest("li").addClass("active");
      this.$("#change-show-count .dropdown-name").text($(ev.target).closest("li").text());
    },    
        
    // hide or show global filters
    toggleGlobalFilters: function(create) {
      if (editing) {        
        this.$el.addClass("shrink", 300, create ? this.changeWidth : this.refreshLayout);
        if (create)
          this.mapActions.toggleClass("creating");
        else
          this.mapActions.toggleClass("editing");
        this.flowMapNameEditor.focus();
        this.flowMapNameEditor.val(this.flowMapNameShower.text());        
        flowMap.selectAll(".node image").style("stroke-dasharray", "2, 2").style("cursor", "move");
        flowMap.selectAll(".node rect").style("visibility", "visible");
        flowMap.selectAll(".node text.remove").style("visibility", "visible");
        flowMap.selectAll(".editor").style("visibility", "visible");        
      } else {        
        var filters = GlobalFilter.hideScopeSelector();      
        filters.draggable("destroy");  
        this.$el.removeClass("shrink", 300, create ? this.changeWidth : this.refreshLayout);
        this.mapActions.removeClass();
        flowMap.selectAll(".node image").style("stroke-dasharray", "").style("cursor", "auto");;        
        flowMap.selectAll(".editor").style("visibility", "hidden");
        flowMap.selectAll(".node text.remove").style("visibility", "hidden");
        flowMap.selectAll(".node rect").style("visibility", "hidden");        
      }
    },
    
    // init draggable
    initDraggable: function(filters) {
      var self = this;
      filters.draggable({
        cursorAt: { left: -2, top: 0 },
        helper: function() {
          return $("<div class='helper' align='right'></div>");
        }, 
        start: function (e, ui) {
          DragDropManager.type = $(e.target).find("div").attr("item-type");
          ui.helper.addClass(DragDropManager.type);
          if (DragDropManager.type == "groups")
            ui.helper.text($(e.target).find("div").attr("item-name"));
        },
        drag: function (e) {
          // do nothing
        },
        stop: function (e, ui) {
          var selectedItem = $(e.target).find(".div-filter-item");          
          if (DragDropManager.type == "nodes" && lastNearestIndex > -1) {            
            var new_node = {
              "group": null,
              "id": selectedItem.attr("dbid"),               
              "name": selectedItem.attr("item-name"), 
              "type": 0,  
              "ip_address": selectedItem.attr("dbid").split("|")[1], 
              "order": 0
            };
            // load node related flows
            invokeAPI("/api/wrapup_flowmaps/" + self.selectedID + "?node_ip=" 
              + selectedItem.attr("dbid").split("|")[1], {}, "GET", function(data) {
              self.nodeDrop(new_node, data.flows, true);
              GlobalFilter.removeSelectedItem(selectedItem.attr("dbid"));                                  
            });                 
          } else if (DragDropManager.type == "groups" 
            && lastEditorIndex > -1 && self.selectedEditor) {              
            // load group related nodes and flows
            invokeAPI("/api/wrapup_flowmaps/" + this.selectedID + "?group_id=" 
              + selectedItem.attr("dbid"), {}, "GET", function(data) {            
              self.createGroup(selectedItem.attr("dbid"), selectedItem.attr("item-name"), data);
              GlobalFilter.removeSelectedItem(selectedItem.attr("dbid"));
            });
          }
          DragDropManager.type = null;        
        }        
      });        
    },
    
    // edit map
    editFlowMap: function(ev) { 
      //load flowmap scopes
      self.selectFlow(null);
      this.$("#traffic-popup").hide();
      editing = true;
      GlobalFilter.showScopeSelector(this.selectedID, this.initDraggable); 
      this.toggleGlobalFilters(false);
    },
    
    // finish editing
    finishEditing: function(ev) {
      this.$("#traffic-popup").show();
      editing = false;      
      var i, self = this;
      // save flowmap name
      var newName = this.flowMapNameEditor.val();
      if (newName == "") {
        this.flowMapNameEditor.focus();
        this.flowMapNameEditor.parent().addClass("has-error");        
        return;
      }
      // save data to db
      var newData = {"groups": [], "nodes": []};
      for (i = 0; i < flowMapData.nodes.length; i ++) {
        newData.nodes.push({
          "id": flowMapData.nodes[i].id,
          "order": flowMapData.nodes[i].order,
          "group": flowMapData.nodes[i].group.id
        });
      }
      for (i = 0; i < flowMapData.groups.length; i ++) {
        newData.groups.push({
          "id": flowMapData.groups[i].id,
          "order": flowMapData.groups[i].order
        });
      }      
      // save flowmap name
      if (creating) {
        var newFlowMap = this.flowMaps.create({
          name: newName,
          order: 0,
          is_default: 0
        }, {
          wait: true,
          success: function(model, response) {
            // save flowmap relations         
            invokeAPI("/api/wrapup_flowmaps/" + newFlowMap.get('id'), newData, "PUT", function() {
              oldFlowMapData = cloneFlowMapData(flowMapData);
              self.selectedFlowMap.removeClass("disabled");
              self.$("#btn-edit-map").removeClass("disabled");        
              self.flowMapNameShower.text(newFlowMap.get('name'));   
              self.$("#edit-actions li.delete").show();
              self.$("#edit-actions li.default").show();
              self.$("li.flowmap").removeClass("active");
              self.$("li.flowmap[data-id='" + newFlowMap.get('id') + "']").addClass("active");
              self.selectedID = newFlowMap.get('id');
              // hide global filters
              self.toggleGlobalFilters(false);        
            });                                 
          },
        });
        creating = false;
      } else {
        this.flowMaps.each(function(item) {
          if (item.get("id") == self.selectedID) {
            if (item.get("name") != newName) {
              item.set("name", newName);
              item.save();   
              self.flowMapNameShower.text(newName);         
            }
          }        
        });   
        // save flowmap relations         
        invokeAPI("/api/wrapup_flowmaps/" + this.selectedID, newData, "PUT", function() {
          oldFlowMapData = cloneFlowMapData(flowMapData);
          // hide global filters
          self.toggleGlobalFilters(false);        
        });             
      }
    },
    
    // cancel editing
    cancelEditing: function(ev) {
      this.$("#traffic-popup").show();
      editing = false;
      if (creating) {
        this.addAllFlowMaps(true);
        creating = false;
      } else {
        // reload data from old data        
        flowMapData = cloneFlowMapData(oldFlowMapData);        
        // recreate flow map
        this.createFlowMap()      
      }
      // hide global filters
      this.toggleGlobalFilters(false);                      
    },
        
    // change width
    changeWidth: function() {
      mapWidth = window.innerWidth - (this.$el.hasClass("shrink") ? 93 + 240 : 93);
      width = mapWidth - margin.left - margin.right;      
      sankey.size([width, height]);      
    },
        
    // refresh layout
    refreshLayout: function() {
      mapWidth = window.innerWidth - (this.$el.hasClass("shrink") ? 93 + 240 : 93);
      width = mapWidth - margin.left - margin.right;      
      sankey.size([width, height]);
      // layout
      sankey.layout(16);
      // update nodes
      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });                   
      flow.selectAll("path").attr("d", flowPath);     
      flow.selectAll("text").attr("x", function(d) {
        return ((d.x0 + d.x1) / 2) + (d.overlap ? d.arclength : 0);
      }).attr("y", function (d) {
        return (d.y0 + d.y1) / 2;
      });      
      // refresh Group and landing
      self.updateGroupAndLanding();
      // refresh editor    
      self.updateEditor();    
      // refresh group info
      self.updateGroupInfo();                                        
    },
    
    // remove group
    removeGroup: function(ev) {      
      var groupEl = $(ev.target).parent();
      var groupID = groupEl.attr("data-id");
      var groupOrder = groupEl.attr("order");
      var groupName = groupEl.find(".group-name").text();
      
      // remove flows related in this group
      for (var i = 0; i < flowMapData.flows.length; ++i) {
        var related = false;
        for (var j = 0; j < flowMapData.nodes.length; j ++) {
          node_ = flowMapData.nodes[j];
          if (node_.group.id == groupID 
          && (flowMapData.flows[i].source === node_ 
          || flowMapData.flows[i].target === node_)) {
            related = true;    
          }
        }
        if (related) {
          flowMapData.flows.splice(i--, 1);          
        }
      }
      
      // remove nodes that belong to this group      
      for (var i = 0; i < flowMapData.nodes.length; ++i) {
        if (flowMapData.nodes[i].group.id == groupID) {
          flowMapData.nodes.splice(i--, 1);
        }
      }
      // remove node elements
      flowMap.selectAll(".node-group")
        .selectAll(".node")
        .data(flowMapData.nodes, function(d) {
          return d.id;
        })
        .exit()
        .remove();
      // refresh node selection
      node = flowMap.selectAll(".node-group").selectAll(".node");                    
           
      // remove flows
      flow = flowMap.selectAll(".flow-group")
        .selectAll(".flow")
        .data(flowMapData.flows, function(d) {
          return (d.source.id ? d.source.id : d.source) + "-" + (d.target.id ? d.target.id : d.target) 
        })
        .exit().remove();
      // refresh flow selection
      flow = flowMap.selectAll(".flow-group").selectAll(".flow");  
      
      // remove groups 
      sankey.deleteGroup(groupOrder);
      // layout
      sankey.layout(16);
      // update positions
      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
      flow.selectAll("path").attr("d", flowPath);
      flow.selectAll("text").attr("x", function(d) {
        return ((d.x0 + d.x1) / 2) + (d.overlap ? d.arclength : 0);
      }).attr("y", function (d) {
        return (d.y0 + d.y1) / 2;
      });                                                         
      // refresh Group and landing
      self.updateGroupAndLanding();
      // refresh editor    
      self.updateEditor();    
      // refresh group info
      self.updateGroupInfo();                                       
      // simulate move
      flowMap.selectAll(".editor").attr("class", "editor");                               
      
      // revert global filter
      this.initDraggable(GlobalFilter.revertSelectedItem({
        id: "G" + groupID,
        dbid: groupID,
        name: groupName,
        type: 'groups'
      }));      
    },
    
    // create group
    createGroup: function(groupID, groupName, data) {
      var self = this;
      sankey.createGroup(groupID, this.selectedEditor.order, groupName);
      // load node and flow data
      data.nodes.forEach(function(item) {
        flowMapData.nodes.push(item);
      })
      // add flows
      for (var i = 0; data.flows && i < data.flows.length; i ++) {
        var repeated = false;
        for (var j = 0; j < flowMapData.flows.length; j ++) {
          if (data.flows[i].source == flowMapData.flows[j].source.ip_address 
            && data.flows[i].target == flowMapData.flows[j].target.ip_address) {
            repeated = true;
            break;    
          }
        }
        if (!repeated) {
          flowMapData.flows.push(data.flows[i]);
        }
      }               
      // layout
      sankey.layout(16);
      // update node flow
      self.updateNodeFlow(false);
      // update positions
      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
      flow.selectAll("path").attr("d", flowPath);
      flow.selectAll("text").attr("x", function(d) {
        return ((d.x0 + d.x1) / 2) + (d.overlap ? d.arclength : 0);
      }).attr("y", function (d) {
        return (d.y0 + d.y1) / 2;
      });                                                         
      // refresh Group and landing
      self.updateGroupAndLanding();
      // refresh editor    
      self.updateEditor();    
      // refresh group info
      self.updateGroupInfo();                                       
      // simulate move
      flowMap.selectAll(".editor").attr("class", "editor");                               
    },

    // create group
    deleteGroup: function(groupID) {
      // 
      sankey.deleteGroup(selectedEditor.order);
      // layout
      sankey.layout(16);
      this.refreshLayout();      
      // simulate move
      flowMap.selectAll(".editor").attr("class", "editor");
    },

    // create group
    cancelEditingGroup: function() {
      this.$("#confirm-edit-group").fadeOut(300);      
    },
    
    // move node function
    nodeMove: function(x, y, nodeID) {
      function ascendingOrder(a, b) {
        return a.order - b.order;
      }                                 
      // highlight nearest group path
      var nearestIndex = 0;
      var offset = 9999;
      flowMapData.groups.forEach(function(group) {
        var new_offset = Math.abs(x - group.x);
        if (new_offset < offset) {
          offset = new_offset;
          nearestIndex = group.order;
        }
      });            
 
      if (nearestIndex != lastNearestIndex) {
        flowMap.selectAll(".group").attr("class", "group");
        flowMap.selectAll(".landing").attr("class", "landing");
        flowMap.select("#group" + nearestIndex).attr("class", "group active");
        flowMap.select("#landing" + nearestIndex).attr("class", "landing active");          
        lastNearestIndex = nearestIndex;
        // refresh node list
        destNodeList = [];
        flowMapData.nodes.forEach(function(node) {
          if (node.group.order == nearestIndex && node.id != nodeID) {
            destNodeList.push(node);
          }
        });       
        destNodeList.sort(ascendingOrder);
      }
      landingOrder = 0;
      var i, landingPos = y + 32;
      for (i = 0; i < destNodeList.length; i ++) {
        if (landingPos >= destNodeList[i].y 
        && landingPos < destNodeList[i].y + destNodeList[i].dy / 2) {
          landingPos = destNodeList[i].y - 5 / 2;
          landingOrder = destNodeList[i].order;
          break;
        } else 
        if (landingPos >= destNodeList[i].y  + destNodeList[i].dy / 2 
        && landingPos <= destNodeList[i].y + destNodeList[i].dy) {
          landingPos = destNodeList[i].y + destNodeList[i].dy + 5 / 2;
          landingOrder = destNodeList[i].order + 1; 
          break;
        } else
        if (landingPos >= destNodeList[i].y + destNodeList[i].dy) {
          landingOrder = destNodeList[i].order + 1;
        }
      }
      sankey.setLanding(landingPos);        
      landing.attr("d", landingPath);                  
    },
    
    // node drop function
    nodeDrop: function(node_, flows_, create) {
      flowMap.selectAll(".group").attr("class", "group");
      flowMap.selectAll(".landing").attr("class", "landing");
      if (lastNearestIndex > -1) {
        flowMapData.groups.forEach(function(group) {
          if (group.order == lastNearestIndex) {
            // submit to database if group is changed
            if (node_.group != group) {
              node_.order = landingOrder;                      
            }                    
            node_.group = group;    
          }
        }); 
        if (node_.order != landingOrder) {
          node_.order = landingOrder;
        }                
        var orderConflict = false;                           
        for (var i = 0; i < destNodeList.length; i ++) {
          if (destNodeList[i].order == node_.order) {
            orderConflict = true;
            break;
          }
        }
        if (orderConflict) {
          for (var i = 0; i < destNodeList.length; i ++) {                
            if (destNodeList[i].order >= node_.order)
              destNodeList[i].order ++;
          }
        }
        if (!create) {
          sankey.relayoutGroup(lastNearestIndex);
        } else {
          // add node
          flowMapData.nodes.push(node_);
          // add flows
          for (var i = 0; flows_ && i < flows_.length; i ++) {
            var repeated = false;
            for (var j = 0; j < flowMapData.flows.length; j ++) {
              if (flows_[i].source == flowMapData.flows[j].source.ip_address 
                && flows_[i].target == flowMapData.flows[j].target.ip_address) {
                repeated = true;
                break;    
              }
            }
            if (!repeated) {
              flowMapData.flows.push(flows_[i]);
            }
          }     
          sankey.layout(16);
          this.updateNodeFlow(false);                    
        }
        node.attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
        flow.selectAll("path").attr("d", flowPath);
        flow.selectAll("text").attr("x", function(d) {
          return ((d.x0 + d.x1) / 2) + (d.overlap ? d.arclength : 0);
        }).attr("y", function (d) {
          return (d.y0 + d.y1) / 2;
        });                                         
      }
      lastNearestIndex = -1;
    },                  

    // init flow map    
    initFlowMap: function() {
      self = this;
      
      flowMap = d3.select("#flowmap")
        .append("svg")
        .on("click", mapClick)
        .on("mousemove", mapMouseMove)
        .on("mouseleave", mapMouseLeave)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      // define arrow markers for graph links
      flowMap.append('svg:defs')
        .append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#000')
        .attr('opacity', .4);
  
      flowMap.append('svg:defs')
        .append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .attr('opacity', .4);
  
      function mapClick() {
        self.selectFlow(null); 
      }
      
      function mapMouseMove() {
        if (editing) {          
          var pX = d3.mouse(this)[0];
          var pY = d3.mouse(this)[1];          
          if (DragDropManager.type == "nodes") {
            self.nodeMove(pX, pY, null);                    
          } else if (DragDropManager.type == "groups") {
            var editorIndex = 0;
            var offset = 9999;
            editorList.forEach(function(editor) {
              var new_offset = Math.abs(pX - editor.x);
              if (new_offset < offset) {
                offset = new_offset;
                editorIndex = editor.id;            
              }
            });
            if (editorIndex != lastEditorIndex) {
              flowMap.selectAll(".editor").attr("class", "editor");
              flowMap.selectAll("#editor" + editorIndex).attr("class", "editor active");
              self.selectedEditor = editorList[editorIndex];                            
              lastEditorIndex = editorIndex;
            }                   
          }
        }
      }
      
      function mapMouseLeave() {
        if (editing) {
          if (DragDropManager.type == "nodes") {
            flowMap.selectAll(".group").attr("class", "group");
            flowMap.selectAll(".landing").attr("class", "landing");
            lastNearestIndex = -1;            
          } else if (DragDropManager.type == "groups") {
            flowMap.selectAll(".editor").attr("class", "editor");     
            lastEditorIndex = -1;                        
          } else if (!dragging) {
            flowMap.selectAll(".editor").attr("class", "editor");     
            lastEditorIndex = -1;            
          }
        }
      }
    },
    
    
    // create skeleton
    createSkeleton: function() {
      var self = this;            
      
      self.updateGroupInfo();      
            
      // remove old ones
      flowMap.selectAll(".group-group").remove();            
      // draw groups
      group = flowMap.append("g")
        .attr("class", "group-group")
        .selectAll(".group")
        .data(flowMapData.groups)
        .enter().append("path")
        .attr("class", "group")
        .attr("d", groupPath)
        .attr("id", function(d) {
          return "group" + d.order;
        });  
            
      // remove old ones
      flowMap.selectAll("landing-group").remove();
      // draw landing
      landing = flowMap.append("g")
        .attr("class", "landing-group")
        .selectAll(".landing").data(flowMapData.groups)
        .enter().append("path")
        .attr("class", "landing")
        .attr("d", landingPath)
        .attr("id", function(d) {
          return "landing" + d.order;
        });     

      // draw editor
      self.updateEditor();      
    },
    
    // remove node and related flow
    removeNodeFlow: function(rNode) {
      // remove flows in flowmap data
      for (var i = 0; i < flowMapData.flows.length; ++i) {
        if (flowMapData.flows[i].source === rNode || flowMapData.flows[i].target === rNode) {
          flowMapData.flows.splice(i--, 1);
        }
      }      
      var index = flowMapData.nodes.indexOf(rNode);
      if (index > -1) {
        flowMapData.nodes.splice(index, 1);
      }
      // remove nodes      
      flowMap.selectAll(".node-group")
        .selectAll(".node")
        .data(flowMapData.nodes, function(d) {
          return d.id;
        })
        .exit()
        .remove();
      // refresh node
      node = flowMap.selectAll(".node-group").selectAll(".node");                    
           
      // remove flows
      flow = flowMap.selectAll(".flow-group")
        .selectAll(".flow")
        .data(flowMapData.flows, function(d) {
          return (d.source.id ? d.source.id : d.source) + "-" + (d.target.id ? d.target.id : d.target) 
        })
        .exit().remove();

      // refresh flow
      flow = flowMap.selectAll(".flow-group").selectAll(".flow");  
      
      // revert global filter
      this.initDraggable(GlobalFilter.revertSelectedItem({
        id: "N" + rNode.id,
        dbid: rNode.id,
        name: rNode.name,
        type: 'nodes'
      }));
    },
    
    // update or create nodes and flows
    updateNodeFlow: function(create) {
      var self = this;               
      // draw nodes
      if (create) {
        // remove old ones
        flowMap.selectAll(".node-group").remove();
        flowMap.selectAll(".flow-group").remove();
        flowMap.append("g").attr("class", "node-group");
        flowMap.append("g").attr("class", "flow-group");
      }
      node = flowMap.selectAll(".node-group")
        .selectAll(".node").data(flowMapData.nodes, function(d) {
          return d.id;
        })
        .enter().append("g").attr("class", "node")
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        }).call(d3.behavior.drag().origin(function(d) {
          return d;
        }).on("dragstart", function(d) {
          this.parentNode.appendChild(this);
          lastNearestIndex = -1;
          dragging = true;
        }).on("drag", dragmove).on("dragend", dragend));
      // draw icon
      node.append("image").attr("height", function(d) {
          return d.dy;
        }).attr("width", function(d) {
          return d.dx;
        }).attr("xlink:href", function(d) {
          return d.image;
        }).style("stroke-dasharray", create ? "" : "2, 2").style("cursor", create ? "" : "move");
      
      // draw image frame
      node.append("rect")
        .attr("class", "frame")
        .attr("height", function(d) {
          return d.dy;
        }).attr("width", function(d) {
          return d.dx;
        }).attr("rx", 3).attr("ry", 3)
        .style("visibility", create ? "" : "visible");
      // draw remove button
      node.append("rect")
        .attr("class", "remove")
        .attr("x", 23)
        .attr("y", -2)
        .attr("height", 12)
        .attr("width", 12)
        .attr("rx", 3)
        .attr("ry", 3)
        .style("visibility", create ? "" : "visible")
        .on("click", function (d) {
          self.removeNodeFlow(d);
        });;
      node.append("text")
        .attr("class", "remove")
        .attr("x", 26)
        .attr("y", 7)
        .text("x").style("visibility", create ? "" : "visible");
      // draw note
      node.append("text").attr("x", -6).attr("y", function(d) {
          return d.dy / 2;
        }).attr("dy", ".35em").attr("text-anchor", "end").attr("transform", null).text(function(d) {
          return self.labelType == "hostname" ? d.name : d.ip_address;
        }).filter(function(d) {
          return d.x < width / 2;
        }).attr("x", 6 + sankey.nodeWidth()).attr("text-anchor", "start");                    
      // refresh node
      node = flowMap.selectAll(".node-group").selectAll(".node");
           
      // draw flows
      flow = flowMap.selectAll(".flow-group")
        .selectAll(".flow")
        .data(flowMapData.flows, function(d) {
          return (d.source.id ? d.source.id : d.source) + "-" + (d.target.id ? d.target.id : d.target)          
        })
        .enter()
        .append("g").attr("class", "flow")
        .on("click", function (d) {
          d3.selectAll(".flow").classed("selected", false);
          d3.select(this).classed("selected", true);
          self.selectFlow(d);
          d3.event.stopPropagation();         
        }); 
      flow.append("path").attr("d", flowPath)
        .style("stroke-width", 3)
        .style("marker-end", "url(#end-arrow)").append("title");            
      flow.append("text").attr("x", function(d) {
        return ((d.x0 + d.x1) / 2) + (d.overlap ? d.arclength : 0);
      }).attr("y", function (d) {
        return (d.y0 + d.y1) / 2;
      }).text(function(d) {
        var protocolItem = d.protocol[0];        
        return protocolItem.type + ":" + protocolItem.port 
          + (protocolItem.alias == "" ? "" : "(" + protocolItem.alias + ")");
      }).attr("text-anchor", "middle").attr("dy", "-.2em");      
      // refresh node
      flow = flowMap.selectAll(".flow-group").selectAll(".flow");      
        
      // dragmove callback
      function dragmove(d) {
        if (!editing)
          return;
        d3.select(this).attr("transform", "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) 
          + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
        d3.select(this).selectAll("text").style("visibility", "hidden");
        d3.select(this).select("rect.remove").style("visibility", "hidden");
        sankey.relayout();
        flow.selectAll("path").attr("d", flowPath);
        flow.selectAll("text").attr("x", function(d) {
          return ((d.x0 + d.x1) / 2) + (d.overlap ? d.arclength : 0);
        }).attr("y", function (d) {
          return (d.y0 + d.y1) / 2;
        });
        self.nodeMove(d3.event.x, d3.event.y, d.id);
      }

      // dragend callback
      function dragend(d) {
        dragging = false;
        if (editing) {
          self.nodeDrop(d, null, false);
          d3.select(this).selectAll("text").style("visibility", "visible");
          d3.select(this).select("rect.remove").style("visibility", "visible");
        }
      }
    },
    
    // create flow map
    createFlowMap: function() {
      // init sankey chart       
      sankey.init(flowMapData);      
      // don't know why must layout twice
      sankey.layout(16);      
      self.createSkeleton();
      self.updateNodeFlow(true);      
    },
    
    // change selected flowmap
    changeSelectedFlowMap: function(ev) {
      var mapID = $(ev.target).closest("li.flowmap").attr("data-id");
      var mapName = $(ev.target).closest("a").text(); 
      this.loadFlowMap(mapID);
      this.$("li.flowmap").removeClass("active");
      $(ev.target).closest("li.flowmap").addClass("active");
      this.flowMapNameShower.text(mapName);
      this.selectedID = mapID;
      self.selectFlow(null);      
    },
    
    // change selected traffic
    changeSelectedFlowTraffic: function(ev) {
      this.$(".traffic-item").removeClass("active");
      $(ev.target).closest(".traffic-item").addClass("active");
      this.selectFlowTraffic($(ev.target).closest(".traffic-item").attr("flow-id"));   
      this.trafficRefreshTime = 0;                         
    },
    
    // load flow map
    loadFlowMap: function(flowMapID) {
      var self = this;      
      invokeAPI("/api/wrapup_flowmaps/" + flowMapID, {}, "GET", function(data) {
        // update group orders
        for (var i = 0; i < data.groups.length; i ++) {
          if (data.groups[i].order != i) {
            data.groups[i].order = i;
          }          
        }
        oldFlowMapData = data;
        flowMapData = cloneFlowMapData(oldFlowMapData);
        self.createFlowMap();        
      });           
    },
    
    // save flowmap
    saveFlowMap: function() {
      // do nothing
    },    
    
    // update label
    updateLabel: function() {
      var self = this;
      flowMap.selectAll(".node text").remove();
      node.append("text").attr("x", -6).attr("y", function(d) {
        return d.dy / 2;
      }).attr("dy", ".35em").attr("text-anchor", "end").attr("transform", null).text(function(d) {
        return self.labelType == "hostname" ? d.name : d.ip_address;
      }).filter(function(d) {
        return d.x < width / 2;
      }).attr("x", 6 + sankey.nodeWidth()).attr("text-anchor", "start");            
    },
    
    // update group info position
    updateGroupInfo: function() {
      // remove current groups
      this.$(".group-info").remove();      
      // init group info          
      var groups = flowMapData.groups;      
      for (var i = 0; i < groups.length; i ++) {
        var newGroupInfo = $("<div class='group-info'></div>");
        newGroupInfo.html(this.groupTemplate({name: groups[i].name}));        
        newGroupInfo.css("left", i *  ((width - 200 - 15) / (groups.length - 1)) + 15.0 / 2 + 25);
        newGroupInfo.attr("data-id", groups[i].id);        
        newGroupInfo.attr("order", groups[i].order);
        if (editing) {
          newGroupInfo.find(".remove").show(); 
        } else {
          newGroupInfo.find(".remove").hide();
        }        
        this.$("#group-infos").append(newGroupInfo);  
      }    
    },
    
    // update editor
    updateEditor: function() {
      self = this;
      flowMap.selectAll(".editor-group").remove();
      editorList = [];
      var editorHeight = 20, editorWidth = 20;
      var groups = flowMapData.groups;
      if (groups.length == 0) {
          editorList.push({"id": 0, "x": 116 - editorWidth / 2, 
            "y": height / 5 - editorHeight / 2, "text":"+", "order": 0});                 
      }
      for (var i = 0; i < groups.length; i ++) {
        if (i == 0) {
          editorList.push({"id": 0, "x": groups[i].x - 60 - editorWidth / 2, 
            "y": height / 5 - editorHeight / 2, "text":"+", "order": 0});         
        }         
        if (i + 1 < groups.length) {
          editorList.push({"id": groups[i].order + 1, "x": (groups[i].x + groups[i + 1].x) / 2 - editorWidth / 2, 
            "y": height / 5 - editorHeight / 2, "text":"+", "order": groups[i].order + 1});
        }
        if (i == groups.length - 1) {
          editorList.push({"id": i + 1, "x": groups[i].x + 60 - editorWidth / 2, 
            "y": height / 5 - editorHeight / 2, "text":"+", "order": i + 1});
        }       
      }
      
      var editor = flowMap.append("g")
        .attr("class", "editor-group")
        .selectAll(".editor")
        .data(editorList)
        .enter()
        .append("g")
        .attr("class", "editor")
        .attr("id", function(d) {
          return "editor" + d.id;})
        .attr("type", function(d) {
          return d.type;})
        .attr("depth", function(d) {
          return d.depth;})
        .style("visibility", function() {return editing ? "visible" : "hidden";});
        
      editor.append("rect")
        .attr("x", function(d) {
          return d.x;})
        .attr("y", function(d) {
          return d.y;})
        .attr("height", editorHeight).attr("width", editorWidth);
        
      editor.append("text")
        .attr("x", function(d) {
          return d.x + 4;})
        .attr("y", function(d) {
          return d.y + 17;})
        .text(function(d) {
          return d.text;
        }); 
        
      editor.append("title").text("Drag group here to add...");                                                           
    },
    
    updateGroupAndLanding: function() {
      // drow group
      flowMap.selectAll(".group-group").remove();      
      group = flowMap.append("g")
        .attr("class", "group-group")
        .selectAll(".group").data(flowMapData.groups)
        .enter().append("path").attr("class", "group")
        .attr("d", groupPath).attr("id", function(d) {
          return "group" + d.order;
        });
      // draw landing        
      flowMap.selectAll(".landing-group").remove();
      landing = flowMap.append("g")
        .attr("class", "landing-group")
        .selectAll(".landing").data(flowMapData.groups)
        .enter().append("path").attr("class", "landing")
        .attr("d", landingPath).attr("id", function(d) {
          return "landing" + d.order;
        });             
    },       
  });
  
  // start Instance
  var FlowMapController = new FlowMapControlView;      
    
});
