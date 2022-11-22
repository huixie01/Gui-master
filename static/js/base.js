$(function() {  
  
  window.onError = function(msg) {
    console.log(msg);
  }   
  
  window.showAlertMessage = function(type, message) {
    // do your stuff
    $("#alert-message").removeClass("alert-success");
    $("#alert-message").removeClass("alert-info");
    $("#alert-message").removeClass("alert-warning");
    $("#alert-message").removeClass("alert-danger");
    $("#alert-message").addClass("alert-" + type);
    $("#alert-message").text(message);
    $("#alert-message").slideDown(1000);
      setTimeout(function timeout() {
        $("#alert-message").slideUp(500);
      }, 5000);          
  }
  
  $(document).ajaxError(function (e, xhr, options) {
    console.log(e);
    console.log(xhr);
    console.log(options);
    showAlertMessage("danger", "Data accessing error, please check your network!");
  });
    
  // common dropdown hidden
  $(document).mouseup(function(ev) {
    $(".dropdown-menu-nav").each(function(key, value) {
      if (!$(value).is(ev.target) // if the target of the click isn't the container...
          && $(value).has(ev.target).length === 0) // ... nor a descendant of the container
      {
        if (!$(value).find(".dropdown-panel").hasClass("showing")) {
          $(value).removeClass("toggle");
          $(value).find(".dropdown-panel").hide();                
        }
      }    
    });
  });
  
  $(".dropdown-menu-nav.nav").click(function() {
    $(this).find(".dropdown-panel").toggle();
  });
  
  // Time Range View
  // --------------  
  var TimeRangeView = Backbone.View.extend({    
    // bind to the existing skeleton that already present in the HTML.
    el: $("#time-range"),

    // Delegated events for time range actions
    events: {
      "click .dropdown-menu-nav a": "toggleDropdown",
      "click .dropdown-menu-item": "selectTimeRange",
      "click .cancel": "cancelSelect",
      "click .confirm": "confirmSelect",  
      "input .hasDatepicker": "datepickerInput",   
    },

    // init
    initialize: function() {
            
      // get attrs
      _.bindAll(this, 'initTimePicker', 'moveFoward', 'moveBackward', 'initTimeRange');
      
      this.dropdownCtl   = this.$(".dropdown-menu-nav");
      this.dropdownList  = this.$("ul");
      this.dropdownItems = this.$("li");
      this.shownValue = this.$(".shown-value");  
      
      this.selectedTimeRange = {};
      this.selectedTimeRange.live = true;
      this.selectedTimeRange.length = parseInt(this.dropdownList.find("li.active").attr("time-length"), 10) || 30;
      
      // Initialize date time picker
      this.startTimePicker = $("#start-time");
      this.endTimePicker   = $("#end-time");
      
      this.startTimePicker.datetimepicker({  
        showTime: false,
        onSelect: function(date) {
          // showActionButtons();      
        }      
      });
    
      this.endTimePicker.datetimepicker({
        showTime: false,
        onSelect: function(date) {
          // showActionButtons();
        }    
      });                          
    },
    
    datepickerInput: function() {
      // showActionButtons();
    },
        
    // toggle display of dropdown list
    toggleDropdown: function(ev) {
      ev.stopPropagation();
      this.dropdownList.toggle();
      this.dropdownCtl.toggleClass("toggle");
    },

    // init time picker content
    initTimePicker: function() {
      if (this.selectedTimeRange.live) {
        var dateNow = new Date();
        this.endTimePicker.datetimepicker("setDate", dateNow);
        this.startTimePicker.datetimepicker("setDate", 
          new Date(dateNow.getTime() - this.selectedTimeRange.length * 60 * 1000));          
      } else {
        this.endTimePicker.datetimepicker("setDate", new Date(this.selectedTimeRange.to));
        this.startTimePicker.datetimepicker("setDate", new Date(this.selectedTimeRange.from));              
      }
    },
    
    // select time item
    selectTimeRange: function(ev) {      
      this.dropdownItems.removeClass("active");                 
      if ($(ev.target).attr("time-type") == "custom") {
        this.initTimePicker();        
        this.$el.addClass('confirm');        
        this.$el.addClass("picktime");        
        this.dropdownList.hide();
        this.startTimePicker.datetimepicker("show"); 
      } else {
        this.$el.removeClass("picktime");
        this.shownValue.text($(ev.target).text());
        this.selectedTimeRange.live = true;
        this.selectedTimeRange.length = parseInt($(ev.target).attr("time-length"), 10) || 30;    
        this.dropdownList.hide();
        GlobalFilter.updateFilter();
      }            
      this.dropdownCtl.removeClass("toggle");
    },
    
    // cancel time select
    cancelSelect: function() {
      this.$el.removeClass('confirm');      
      this.$el.removeClass('picktime');        
    },
    
    // confirm time select
    confirmSelect: function() {
      var startTime = this.startTimePicker.datetimepicker("getDate").getTime() / (1000 * 60);
      var endTime = this.endTimePicker.datetimepicker("getDate").getTime() / (1000 * 60);
      if (startTime >= endTime) {
        showAlertMessage("danger", "Begin time should not exceed end time!");
        return;
      } 
      if (endTime - startTime > 60 * 24 * 7) {
        showAlertMessage("danger", "Time range should not exceed one week!");
        return;        
      }
      this.shownValue.text(this.startTimePicker.val() 
        + " - " 
        + this.endTimePicker.val());
      this.$el.removeClass('confirm');
      this.$el.removeClass('picktime');
      this.selectedTimeRange.live = false;
      this.selectedTimeRange.from = this.startTimePicker.datetimepicker("getDate").getTime();          
      this.selectedTimeRange.to = this.endTimePicker.datetimepicker("getDate").getTime();
      this.selectedTimeRange.length = (this.selectedTimeRange.to - this.selectedTimeRange.from) / (1000 * 60);
      GlobalFilter.updateFilter();
    },
    
    // move forward
    moveFoward: function() {
      var self = this;
      if (this.selectedTimeRange.live) {
        // do noting
      } else {
        this.selectedTimeRange.from = this.selectedTimeRange.to;
        this.selectedTimeRange.to += this.selectedTimeRange.length * 60 * 1000;
        // handle abnormal time
        if (Math.round(this.selectedTimeRange.to / (1000 * 60)) 
          >= Math.round((new Date()).getTime() / (1000 * 60) - 1)) {
          // get nearest option item
          var dropdownItem = null;
          var itemTimeLength = 0;
          var maxOffset = 88888888;          
          this.dropdownList.find("li").each(function(index, item) {
            itemTimeLength = parseInt($(item).attr("time-length"), 10) || 30;            
            if (Math.abs(itemTimeLength - self.selectedTimeRange.length) < maxOffset) {
              maxOffset = Math.abs(itemTimeLength - self.selectedTimeRange.length);
              dropdownItem = $(item);
            }
          });
          if (dropdownItem) {
            dropdownItem.addClass("active");            
            this.dropdownList.find("li.active").removeClass("active");
            this.$el.removeClass("picktime");
            this.shownValue.text(dropdownItem.text());
            this.selectedTimeRange.live = true;
            this.selectedTimeRange.length = parseInt(dropdownItem.attr("time-length"), 10) || 30;    
            GlobalFilter.updateFilter();            
          }
        } else {
          this.initTimePicker();
          this.confirmSelect();                  
        }               
      }
    },
    
    // move backward
    moveBackward: function() {
      if (this.selectedTimeRange.live) {
        this.selectedTimeRange.to = (new Date()).getTime() - this.selectedTimeRange.length * 60 * 1000;
        this.selectedTimeRange.from = this.selectedTimeRange.to - this.selectedTimeRange.length * 60 * 1000;
        this.selectedTimeRange.live = false;
      } else {
        this.selectedTimeRange.to = this.selectedTimeRange.from;
        this.selectedTimeRange.from -= this.selectedTimeRange.length * 60 * 1000;        
      }
      this.initTimePicker();
      this.confirmSelect();            
    },
    
    // init time range
    initTimeRange: function(length) {
      // get nearest option item
      var dropdownItem = null;
      var itemTimeLength = 0;
      var maxOffset = 88888888;          
      this.dropdownList.find("li").each(function(index, item) {
        itemTimeLength = parseInt($(item).attr("time-length"), 10) || 30;            
        if (Math.abs(itemTimeLength - length) < maxOffset) {
          maxOffset = Math.abs(itemTimeLength - length);
          dropdownItem = $(item);
        }
      });
      if (dropdownItem) {
        dropdownItem.addClass("active");            
        this.dropdownList.find("li.active").removeClass("active");
        this.$el.removeClass("picktime");
        this.shownValue.text(dropdownItem.text());
        this.selectedTimeRange.live = true;
        this.selectedTimeRange.length = parseInt(dropdownItem.attr("time-length"), 10) || 30;
      }      
    }    
  });

  // start an new Time Range Instance
  var TimeRangeControl = new TimeRangeView;
  
  // Object Filter Item
  // --------------
  var ObjectFilter = Backbone.Model.extend({
    urlRoot:'',
    
    // Default attributes for the Item
    defaults: function() {
      return {
        display: "normal"
      };      
    }
    
  }); 
  
  // Object Filter Item List
  // --------------
  var ObjectFilterList = Backbone.Collection.extend({
    
    // url address
    url: '/api/scopes',
    
    // model
    model: ObjectFilter,
        
    // Filter which to show
    showList: function(filter) {
      return this.filter(function(item){ 
        return item.get('type') == filter;
      });
    },
    
    // Filter which to hide
    hideList: function(filter) {
      return this.without.apply(this, this.showList(filter));
    },
    
    // Match to show
    matchList: function(filter, keyword) {
      return this.filter(function(item){ 
        return item.get('type') == filter && item.get('name').toLowerCase().indexOf(keyword) >= 0; 
      });
    },
    
    // Unmatch to hide
    unmatchList: function(filter, keyword) {
      return this.without.apply(this, this.matchList(filter, keyword));
    }
    
  }); 
    
  // Create collection of filters.
  var ObjectFilters = new ObjectFilterList;
  
  
  // Object Filter View
  // --------------
  var ObjectFilterView = Backbone.View.extend({

    //... is a list tag.
    tagName: "li",
    
    // class name
    className: "dropdown-menu-item",

    // Cache the template function for a single item.
    template: _.template($('#filter-item-template').html()),

    // Reserved Initialization
    initialize: function() {
      this.model.bind('remove', this.remove, this);      
      this.model.bind('change', this.render, this);
      this.model.bind('show', this.showItem, this);
      this.model.bind('hide', this.hideItem, this);
      this.model.bind('match', this.matchItem, this);
    },
        
    // change the display to show
    showItem: function() {
      this.render();
      this.$el.removeClass("hidden");
      return this;
    },
    
    // change the display to hide
    hideItem: function() {      
      this.$el.addClass("hidden");
      return this;
    },
    
    // show match string
    matchItem: function(keyword) {
      var itemName = this.model.get('name').toLowerCase();
      var index = itemName.indexOf(keyword);
      var length = keyword.length;      
      itemName = this.model.get('name');
      var matchText = itemName.substring(index, index + length);      
      var prefixText = itemName.substring(0, index);
      var suffixText = itemName.substring(index + length);
      this.$el.html(this.template({
        id: this.model.get('id'),
        dbid: this.model.get('dbid'),
        name: this.model.get('name'),
        prefix: prefixText,
        suffix: suffixText,
        match: matchText,
        type: this.model.get('type')
      }));
      this.$el.removeClass("hidden");
      return this;      
    },
    
    // Re-render the list item.
    render: function() {
      this.$el.html(this.template({
        id: this.model.get('id'),
        dbid: this.model.get('dbid'),
        name: this.model.get('name'),
        prefix: this.model.get('name'),
        suffix: '',
        match: '',
        type: this.model.get('type')
      }));
      return this;
    },  
      
  });
  
  
  // Object Filter Control View
  // --------------  
  var ObjectFilterCtlView = Backbone.View.extend({

    // bind to the existing skeleton that already present in the HTML.
    el: $("#object-filter"),

    // Delegated events
    events: {
      "click .dropdown-menu-nav a": "toggleDropdown",
      "click .dropdown-menu-item div": "addOnClick",
      "keydown .bootstrap-tagsinput input": "processOnKeyDown",
      "keyup .bootstrap-tagsinput input": "processOnKeyUp",
      "mouseenter .filter-select li": "selectOnMouseEnter",
      "click .btn-filter-type": "changeFilterType",
      "click .cancel": "cancelSelect",
      "click .confirm": "confirmSelect",      
      "click .clear-all": "clearAllSelection",
    },

    // init
    initialize: function() {      
      // bind view to functions
      _.bindAll(this, 'onFilterRemoved', 'onFilterAdded', 'addOne', 'addAll',
        'displayByType', 'displayByMatch', 'refreshSelect', 
        'changeSelectedFilters', 'confirmSelectedFilters', 'reloadSelectedFilters', 
        'switchToSelectorMode', 'showSelector', 'hideSelector', 'clearAllSelection');
      
      // init variables
      this.filterType = "nodes";
      this.preFilterType = "none";
      this.selectedFilterType = "none";
      this.selectedFilters = [];
      this.shownValue = this.$(".shown-value");   
      this.dropdownCtl   = this.$(".dropdown-menu-nav");
      this.dropdownPanel = this.$(".dropdown-panel");
      this.dropdownItemList = this.$("ul");
      this.tagsinput = this.$('.input-filter-select');      
      this.tagsinput.tagsinput({itemText: 'text', itemValue: 'value'});      
      this.input = this.$(".bootstrap-tagsinput input");
      this.tagsinput.on("itemAdded", this.onFilterAdded);      
      this.tagsinput.on("itemRemoved", this.onFilterRemoved);  
      this.selectorMode = false;
      
      this.scopeSelector = this.$("#scope-selector");    

      // init clear all button
      this.$(".bootstrap-tagsinput").append("<span class='clear-all glyphicon glyphicon-remove'></span>");
            
      // init binding events         
      ObjectFilters.bind('add', this.addOne, this);
      ObjectFilters.bind('reset', this.addAll, this);
            
      // load data from db
      ObjectFilters.fetch({reset: true});
    },
    
    // clear all selections
    clearAllSelection: function() {    
      this.tagsinput.tagsinput("removeAll");
      this.$("li div").parent().removeClass('active');
      this.$("li").removeClass("selected");
      this.changeSelectedFilters();
      this.input.val("");                  
    },
    
    // switch to selector mode
    switchToSelectorMode: function() {
      this.$el.addClass("selector");
      this.dropdownPanel.addClass("showing");
      this.selectorMode = true;
      this.$("span.label").text("SELECT");
      this.$("span.shown-value").text("Drag objects to Flow Map");      
    },
    
    // show selector mode
    showSelector: function(flowMapID, callback) {
      var self = this;
      ObjectFilters.fetch({
        reset: true, 
        data:{flowmap_id: flowMapID},         
        success: function(collection, response, options) {
          options.previousModels.forEach(function(item) {
            item.trigger("remove");
          });          
          self.$el.show("slide", { direction: "left" }, 300);
          self.dropdownPanel.show("slide", { direction: "left" }, 300);
          self.dropdownCtl.addClass("toggle");
          if (self.dropdownPanel.is(":visible")) {
            // refresh display        
            self.displayByType();
          }
          callback(self.$(".dropdown-menu-item"));        
        }
      });      
    },
    
    // hide selector mode
    hideSelector: function() {  
      this.$el.hide("slide", { direction: "left" }, 300);    
      this.dropdownPanel.hide("slide", { direction: "left" }, 300);
      this.dropdownCtl.removeClass("toggle");
      if (this.dropdownPanel.is(":visible")) {
        // refresh display        
        this.displayByType();
      }
      return this.$(".dropdown-menu-item");
    },
    
    // cancel filter select
    cancelSelect: function() {
      this.$el.removeClass('confirm');
      this.dropdownPanel.hide();
      this.dropdownCtl.removeClass("toggle");  
      this.reloadSelectedFilters(false);
    },
    
    // confirm filter select
    confirmSelect: function() {
      this.confirmSelectedFilters()
      this.$el.removeClass('confirm');
      this.dropdownPanel.hide();
      this.dropdownCtl.removeClass("toggle");      
    },  
    
    // change filter type
    changeFilterType: function(ev) {
      this.filterType = $(ev.target).attr("filter-type");
      this.$(".btn-filter-type").removeClass("active");
      $(ev.target).addClass("active");
      this.displayByType();
    },
    
    // display filters by changing filter type
    displayByType: function() {
      ObjectFilters.showList(this.filterType).forEach(function(item) {
        item.trigger("show");
      });
      ObjectFilters.hideList(this.filterType).forEach(function(item) {
        item.trigger("hide");
      });
      this.input.val("");      
      this.refreshSelect();               
    },
    
    // display filters by matching text
    displayByMatch: function(keyword) {
      ObjectFilters.matchList(this.filterType, keyword).forEach(function(item) {
        item.trigger("match", keyword);
      });
      ObjectFilters.unmatchList(this.filterType, keyword).forEach(function(item) {
        item.trigger("hide");
      });
      this.refreshSelect();         
    },    
    
    // refresh select
    refreshSelect: function() {
      // set selected
      var visibleActive = this.$("li.active:visible");
      if (visibleActive.length == 0) {
        this.$("li").removeClass("selected");
        this.$('li:visible:first').addClass("selected");
      } else {
        this.$("li").removeClass("selected");
        visibleActive.addClass("selected");
      }
      if (!this.selectorMode)
        this.input.focus();              
    },
    
    // add one
    addOne: function(item) {
      var view = new ObjectFilterView({model: item});
      this.dropdownItemList.append(view.render().el);
    },
    
    // add all
    addAll: function(item) {
      ObjectFilters.each(this.addOne);
    },
    
    
    // toggle display of dropdown list
    toggleDropdown: function(ev) {
      if (ev) ev.stopPropagation();
      this.dropdownPanel.toggle();
      this.dropdownCtl.toggleClass("toggle");
      if (this.dropdownPanel.is(":visible")) {
        // reload selected filters
        this.reloadSelectedFilters(true);                        
        // refresh display        
        this.displayByType();
      }
    },
    
    // change selected filters
    changeSelectedFilters: function() {      
      var tagsinputItems = this.tagsinput.tagsinput('items');      
      if (tagsinputItems.length < 1) {
        this.shownValue.text("ALL");    
        this.preFilterType = "none";           
      } else {
        if (this.filterType == "nodes" && tagsinputItems.length > 1) {
          this.shownValue.text(tagsinputItems.length + " Nodes");          
        } else {
          this.shownValue.text(tagsinputItems[0].text);         
        }
        this.preFilterType = this.filterType;
      }
      //
      this.$el.addClass('confirm'); 
    },
    
    // confirm selected filters
    confirmSelectedFilters: function() {
      this.selectedFilters = [];      
      var tagsinputItems = this.tagsinput.tagsinput('items');      
      if (tagsinputItems.length > 0) {
        for (var i = 0; i < tagsinputItems.length; i ++) {
          this.selectedFilters.push({
            id: tagsinputItems[i].value, 
            name: tagsinputItems[i].text, 
            type: tagsinputItems[i].type
          });
        }
      }
      GlobalFilter.updateFilter();      
    },
    
    // reload selected filters from cache
    reloadSelectedFilters: function(toggle) {
      if (toggle) {        
        this.tagsinput.tagsinput("removeAll");
        var selectedFilterType = "nodes";
        this.$("li").removeClass("active");        
        for (var i = 0; i < this.selectedFilters.length; i ++) {
          this.tagsinput.tagsinput('add', 
            {"value": this.selectedFilters[i].id, "text":this.selectedFilters[i].name, "type":this.selectedFilters[i].type}); 
          selectedFilterType = this.selectedFilters[i].type;
          // active item
          this.$("li div[item-id='" + this.selectedFilters[i].id + "']").parent().addClass('active');
        }
        this.$(".btn-filter-type").removeClass("active");
        this.$(".btn-filter-type[filter-type='" + selectedFilterType +"']").addClass("active");
        this.filterType = selectedFilterType;                                       
      } else {
        if (this.selectedFilters.length == 0) {
          this.shownValue.text("ALL");
        } else if (this.selectedFilters.length > 1) {
          this.shownValue.text(this.selectedFilters.length + " Nodes");
        } else {
          this.shownValue.text(this.selectedFilters[0].name);
        }
      }
    },

    // add item to tagsinput
    addOnClick: function(ev) {
      if (this.selectorMode) return;
      // quit if target has been selected
      if ($(ev.target).closest("li").hasClass("active")) {
        this.input.focus();
        return;
      }
      // clear tagsinputs if change filter type or type is not nodes
      if (this.filterType != this.preFilterType || this.filterType != "nodes") {
        this.$("li").removeClass("active");   
        this.tagsinput.tagsinput('removeAll');              
      }      
      this.tagsinput.tagsinput('add', 
        {"value":$(ev.target).attr("item-id"), "text":$(ev.target).attr("item-name"), "type":$(ev.target).attr("item-type")});      
      this.displayByType();                
    },
    
    // select on mouse enter
    selectOnMouseEnter: function(ev) {
      this.$("li").removeClass("selected");
      $(ev.target).closest("li").addClass("selected");
    },
    
    // key down event
    processOnKeyDown: function(ev) {      
      if (ev.keyCode == 13) { // Enter
        var selectedItem = this.$("li.selected div");
        if (selectedItem.length > 0) {
          if (this.selectorMode) return;
          // quit if target has been selected
          if (selectedItem.parent().hasClass("active")) {
            this.input.focus();
            return;
          }
          // clear tagsinputs if change filter type or type is not nodes
          if (this.filterType != this.preFilterType || this.filterType != "nodes") {
            this.$("li").removeClass("active");   
            this.tagsinput.tagsinput('removeAll');              
          }      
          this.tagsinput.tagsinput('add', 
            {"value":selectedItem.attr("item-id"), "text":selectedItem.attr("item-name"), "type":$(ev.target).attr("item-type")});          
          this.displayByType();          
        }                        
        return;           
      }
      if (ev.keyCode == 38) {// Up
        var selectedItem = this.$("li.selected:visible");
        var firstItem = this.$("li:visible:first");
        if (selectedItem.length > 0 
        && selectedItem.find("div").attr("item-id") != firstItem.find("div").attr("item-id")) {
          this.$("li").removeClass("selected");
          selectedItem.prevAll(":visible:first").addClass("selected");
        }
        return;
      }
      if (ev.keyCode == 40) {// Down
        var selectedItem = this.$("li.selected:visible");
        var lastItem = this.$("li:visible:last");
        if (selectedItem.length > 0 
        && selectedItem.find("div").attr("item-id") != lastItem.find("div").attr("item-id")) {
          this.$("li").removeClass("selected");
          selectedItem.nextAll(":visible:first").addClass("selected");
        }
        return;
      }    
    },
    
    // key down event
    processOnKeyUp: function(ev) {
      if (ev.keyCode == 13 || ev.keyCode == 38 || ev.keyCode == 40) return;
      var inputValue = this.input.val();      
      this.input.attr('size', this.input.val().length);      
      if (inputValue.trim().length == 0) {
        this.displayByType();
      } else {
        this.displayByMatch(inputValue.trim().toLowerCase());        
      }            
    },   
    
    // on filter added    
    onFilterAdded: function(ev) {
      if (ev.item) {
        this.$("li div[item-id='" + ev.item.value + "']").parent().addClass('active');
        this.$("li").removeClass("selected");
        this.$("li div[item-id='" + ev.item.value + "']").parent().addClass("selected");
        this.changeSelectedFilters();
      }            
    },            

    // on filter removed    
    onFilterRemoved: function(ev) {
      if (ev.item) {
        this.$("li div[item-id='" + ev.item.value + "']").parent().removeClass('active');
        this.$("li").removeClass("selected");
        this.$('li:visible:first').addClass("selected");
        this.changeSelectedFilters();
      }            
    }
        
  });
  
  // start new Time Range Instance
  var ScopeControl = new ObjectFilterCtlView;
  
  window.GlobalFilter = {
    observers: [],
    // reload report after updating
    updateFilter: function() {      
      this.observers.forEach(function(item) {
        item.updateFilter();
      });
    },
    // add Observer
    addObserver: function(observer) {
      this.observers.push(observer);
    },
    // get current scope filters
    getSelectedFilters: function() {
      return ScopeControl.selectedFilters;
    },
    // get current time ranges
    getSelectedTimeRange: function() {
      return TimeRangeControl.selectedTimeRange;
    },
    // 
    moveForward: function() {
      // change time range
      TimeRangeControl.moveFoward();
    },
    // 
    moveBackward: function() {
      // change time range
      TimeRangeControl.moveBackward();
    },
    // init select timeRange
    initTimeRange: function(length) {
      // change time range manually
      TimeRangeControl.initTimeRange(length);
    },
    // switch to selector mode
    switchToSelectorMode: function() {
      ScopeControl.switchToSelectorMode();
    },
    // show selector
    showScopeSelector: function(flowMapID, callback) {
      return ScopeControl.showSelector(flowMapID, callback);
    },
    // hide selector
    hideScopeSelector: function() {
      return ScopeControl.hideSelector();
    },
    // remove selected item
    removeSelectedItem: function(itemID) {
      ObjectFilters.each(function(item) {
        if (item.get('dbid') == itemID) {
          ObjectFilters.remove(item);    
        }        
      });
    },
    // revert selected item
    revertSelectedItem: function(item) {
      ObjectFilters.add(item);
      ScopeControl.displayByType();
      return $(".div-filter-item[dbid='" + item.dbid + "']").parent();
    }    
  };
});
