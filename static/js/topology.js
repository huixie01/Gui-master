var panWidth  = 500;
var panHeight = 500;

d3.topology = {};

d3.topology.canvas = function(test) {

    "use strict";
    
    var minX = 9999,
        maxX = 0,
        minY = 9999,
        maxY = 0;

    var width           = 500,
        height          = 500,
        zoomEnabled     = true,
        dragEnabled     = true,
        scale           = 1,
        translation     = [0,0],
        base            = null,
        wrapperBorder   = 0,
        minimap         = null,
        minimapPadding  = 0,
        minimapScale    = 0.17,
        force           = d3.layout.force()
          .gravity(.05)
          .distance(150)
          .charge(-500)
          .size([1, 1]),
        nodes           = [],
        links           = [],
        circles         = [],
        events          = [],
        showMinimap     = true;
    
    var selectNodeCallback = function() {};
    var selectFlowCallback = function() {};
    var unselectCallback = function() {};
        
    function canvas(selection) {

        base = selection;

        var xScale = d3.scale.linear()
            .domain([-width / 2, width / 2])
            .range([0, width]);

        var yScale = d3.scale.linear()
            .domain([-height / 2, height / 2])
            .range([height, 0]);

        var zoomHandler = function(newScale) {
            if (!zoomEnabled) { return; }
            if (d3.event) {
                scale = d3.event.scale;
            } else {
                scale = newScale;
            }

            if (dragEnabled) {
                var tbound = -9999,
                    bbound = 9999,
                    lbound = -9999,
                    rbound = 9999;
                // limit translation to thresholds
                translation = d3.event ? d3.event.translate : [0, 0];
                translation = [
                    Math.max(Math.min(translation[0], rbound), lbound),
                    Math.max(Math.min(translation[1], bbound), tbound)
                ];
            }

            d3.select(".panCanvas, .panCanvas .bg")
                .attr("transform", "translate(" + translation + ")" + " scale(" + scale + ")");

            minimap.scale(scale).render();
        }; // startoff zoomed in a bit to show pan/zoom rectangle
            
        var zoom = d3.behavior.zoom()
            .x(xScale)
            .y(yScale)
            .scaleExtent([0.5, 1])                       
            .on("zoom.canvas", zoomHandler)
            .translate([width / 2, height / 2]);

        var svg = selection.append("svg")
            .attr("class", "svg canvas")
            .attr("width",  width  + (wrapperBorder*2) + minimapPadding*2 + (width*minimapScale))
            .attr("height", height + (wrapperBorder*2) + minimapPadding*2)
            .attr("shape-rendering", "auto").on("click", function() {
              var selectedNode = d3.selectAll(".node.selected");
              var selectedFlow = d3.selectAll(".flow.selected");
              if (!selectedNode.empty()) {
                selectedNode.classed("selected", false);
                selectedNode.select("image").transition().attr("x", -12).attr("y", -24).attr("width", 24).attr("height", 48);
                selectedNode.select("circle").transition().attr("cx", 10).attr("cy", -24).attr("r", 5);
                // selected.select("text").transition().attr("dx", 13);   
                selectedNode.datum().selected = false;
                var link = panCanvas.selectAll(".link"); 
                link.filter(function(d, i) { return d.source == selectedNode.datum() || d.target == selectedNode.datum() }).attr("style", null);
              } else if (!selectedFlow.empty()) {
                // 
              }       
              unselectCallback();              
            });

        var svgDefs = svg.append("defs");

        svgDefs.append("clipPath")
            .attr("id", "wrapperClipPath")
            .attr("class", "wrapper clipPath")
            .append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height);
            
        svgDefs.append("clipPath")
            .attr("id", "minimapClipPath")
            .attr("class", "minimap clipPath")
            .attr("width", width)
            .attr("height", height)
            //.attr("transform", "translate(" + (width + minimapPadding) + "," + (minimapPadding/2) + ")")
            .append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height);
            
        var filter = svgDefs.append("svg:filter")
            .attr("id", "minimapDropShadow")
            .attr("x", "-20%")
            .attr("y", "-20%")
            .attr("width", "150%")
            .attr("height", "150%");

        filter.append("svg:feOffset")
            .attr("result", "offOut")
            .attr("in", "SourceGraphic")
            .attr("dx", "1")
            .attr("dy", "1");

        filter.append("svg:feColorMatrix")
            .attr("result", "matrixOut")
            .attr("in", "offOut")
            .attr("type", "matrix")
            .attr("values", "0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.5 0");

        filter.append("svg:feGaussianBlur")
            .attr("result", "blurOut")
            .attr("in", "matrixOut")
            .attr("stdDeviation", "10");

        filter.append("svg:feBlend")
            .attr("in", "SourceGraphic")
            .attr("in2", "blurOut")
            .attr("mode", "normal");
            
        var minimapRadialFill = svgDefs.append("radialGradient")
            .attr({
                id:"minimapGradient",
                gradientUnits:"userSpaceOnUse",
                cx:"500",
                cy:"500",
                r:"400",
                fx:"500",
                fy:"500"
            });
        minimapRadialFill.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#FFFFFF");
        minimapRadialFill.append("stop")
            .attr("offset", "40%")
            .attr("stop-color", "#EEEEEE");
        minimapRadialFill.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#E0E0E0");

        var outerWrapper = svg.append("g")
            .attr("class", "wrapper outer")
            .attr("transform", "translate(0, " + minimapPadding + ")");

        outerWrapper.append("rect")
            .attr("class", "background")
            .attr("width", width + wrapperBorder*2)
            .attr("height", height + wrapperBorder*2);

        var innerWrapper = outerWrapper.append("g")
            .attr("class", "wrapper inner")
            .attr("clip-path", "url(#wrapperClipPath)")
            .attr("transform", "translate(" + (wrapperBorder) + "," + (wrapperBorder) + ")")
            .call(zoom);

        innerWrapper.append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height);

        var panCanvas = innerWrapper.append("g")
            .attr("class", "panCanvas")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(" + [width / 2, height / 2] + ")");

        minimap = d3.topology.minimap()
            .zoom(zoom)
            .target(panCanvas)
            .minimapScale(minimapScale)
            //.x(width + minimapPadding)
            .x(width * ( 1 - minimapScale) - minimapPadding - 6)
            .y(minimapPadding + 6);

        svg.call(minimap);
            
        // startoff zoomed in a bit to show pan/zoom rectangle
        // zoom.scale(1.5);
        // zoomHandler(1.5);
        
        // Draw canvas
        canvas.draw = function() {
          force.nodes(nodes).links(links).on("end", function() {
            }).on("tick", function() {
              link.selectAll(".link").attr("x1", function(d) { return d.source.x; })
                  .attr("y1", function(d) { return d.source.y; })
                  .attr("x2", function(d) { return d.target.x; })
                  .attr("y2", function(d) { return d.target.y; });              
              link.selectAll(".text").attr("x", function(d) {
                return (d.source.x + d.target.x) / 2;
              }).attr("y", function (d) {
                return (d.source.y + d.target.y) / 2;
              });
                                            
              node.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")"; 
              });
              panWidth = Math.max($('.panCanvas')[0].getBoundingClientRect().width, width * 0.95);
              panHeight = Math.max($('.panCanvas')[0].getBoundingClientRect().height, height * 0.95);
              //
              minimap.render();
              // update width and height
            }).start();
            
          var link = panCanvas.selectAll(".link")
              .data(links)
              .enter().append("g").attr("class", "flow")              
              .on("click", function (flow_d) {
                selectFlowCallback(flow_d.source.ip, flow_d.target.ip);  
              });
              
          link.append("line").attr("class", "link");              
          link.append("text").attr("class", "text").text(function(flow_d) {        
            return flow_d.protocol; 
          }).attr("text-anchor", "middle").attr("dy", "-.2em");
        
          var node = panCanvas.selectAll(".node")
              .data(nodes)
              .enter().append("g")
              .attr("class", "node")
              .on("click", function(node_d) {
                if (!node_d.selected) {
                  var selected = d3.selectAll(".node.selected");
                  if (!selected.empty()) {
                    selected.classed("selected", false);
                    selected.select("image").transition().attr("x", -12).attr("y", -24).attr("width", 24).attr("height", 48);
                    selected.select("circle").transition().attr("cx", 10).attr("cy", -24).attr("r", 5);
                    // selected.select("text").transition().attr("dx", 13);   
                    selected.datum().selected = false;
                    link.filter(function(d, i) { return d.source == selected.datum() || d.target == selected.datum() }).selectAll(".link").attr("style", null);
                  }       
                  // select current
                  node_d.selected = true;          
                  d3.select(this).classed("selected", true);
                  selectNodeCallback(node_d.ip);                  
                }                    
                d3.event.stopPropagation();                   
              }).on("mouseenter", function(node_d) {
                d3.select(this).select("image").transition().attr("x", -16).attr("y", -32).attr("width", 32).attr("height", 64);
                d3.select(this).select("circle").transition().attr("cx", 14).attr("cy", -30).attr("r", 6);
                // d3.select(this).select("text").transition().attr("dx", 17);
                link.filter(function(d, i) { return d.source == node_d || d.target == node_d })
                .selectAll(".link").style("stroke-dasharray", "0,1000").style("stroke-width", 2.5).style("stroke", "blue")
                .transition()
                .duration(2000)
                .ease("linear").style("stroke-dasharray", "1000,1000");
              }).on("mouseleave", function(node_d) {
                if (!node_d.selected) {
                  d3.select(this).select("image").transition().attr("x", -12).attr("y", -24).attr("width", 24).attr("height", 48);
                  d3.select(this).select("circle").transition().attr("cx", 10).attr("cy", -24).attr("r", 5);
                  // d3.select(this).select("text").transition().attr("dx", 13);          
                  link.filter(function(d, i) { return d.source == node_d || d.target == node_d }).selectAll(".link").attr("style", null);                      
                }
              }).call(force.drag);
        
          node.append("image")
              .attr("xlink:href", function(d) { return nodeType[d.type].image })
              .attr("x", -12)
              .attr("y", -24)
              .attr("width", 24)
              .attr("height", 48);
              
          node.append("rect")
            .attr("class", "border")
              .attr("x", -16)
              .attr("y", -32)      
              .attr("width", 32)
              .attr("height", 64)
              .attr("rx", 3)
              .attr("ry", 3);
              
          // draw errors
          node.filter(function(d, i) { return d.errors > 0 || d.warns > 0 || d.infos > 0})
            .append("circle")
            .attr("class", function(d) {
              if (d.errors > 0)
                return "error";
              if (d.warns > 0)
                return "warn";
              if (d.infos > 0)
                return "info";
            })
            .attr("cx", 10)
            .attr("cy", -24)      
            .attr("r", 5);
        
          node.append("text")
              .attr("dx", 0)
              .attr("dy", 32)
              .attr("text-anchor", "middle")
              .text(function(d) { return d.ip });                                
        };
        
        // Draw canvas
        canvas.refresh = function() {
          
          nodes.forEach(function(node_) {
            node_.infos = 0;
            node_.warns = 0;
            node_.errors = 0;
          });
          events.forEach(function(event_) {
            nodes.forEach(function(node_) {
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
            })           
          });

          var node = panCanvas.selectAll(".node");
          node.selectAll("circle").remove();
          // draw errors
          node.filter(function(d, i) { return d.errors > 0 || d.warns > 0 || d.infos > 0})
            .append("circle")
            .attr("class", function(d) {
              if (d.errors > 0)
                return "error";
              if (d.warns > 0)
                return "warn";
              if (d.infos > 0)
                return "info";
            })
            .attr("cx", function(d) {return d.selected ? 14 : 10;})
            .attr("cy", function(d) {return d.selected ? -30 : -24;})      
            .attr("r", function(d) {return d.selected ? 6 : 5;}); 
        };        
          
        /** ADD SHAPE **/
        canvas.addItem = function(item) {
            panCanvas.node().appendChild(item.node());
            minimap.render();
        };
        
        canvas.addCircle = function(circle) {
            panCanvas.call(circle);
            circles.push(circle);
            force.nodes(circles)
                .size([width,height])
                .on("tick", function() {
                    circles.forEach(function(circle) {
                        circle.cx(circle.x).cy(circle.y).render();
                    });
                    minimap.render();
                })
                .start();
                
            function mousedown() {
                circles.forEach(function(o, i) {
                    o.x += (Math.random() - 0.5) * 40;
                    o.y += (Math.random() - 0.5) * 40;
                });
               force.resume();
            }
            circle.node().on("mousedown", mousedown);
        };
        
        /** RENDER **/
        canvas.render = function() {
            svgDefs
                .select(".clipPath .background")
                .attr("width", width)
                .attr("height", height);

            svg
                .attr("width",  width  + (wrapperBorder*2) + minimapPadding*2 + (width*minimapScale))
                .attr("height", height + (wrapperBorder*2));

            outerWrapper
                .select(".background")
                .attr("width", width + wrapperBorder*2)
                .attr("height", height + wrapperBorder*2);

            innerWrapper
                .attr("transform", "translate(" + (wrapperBorder) + "," + (wrapperBorder) + ")")
                .select(".background")
                .attr("width", width)
                .attr("height", height);

            panCanvas
                .attr("width", width)
                .attr("height", height)
                .select(".background")
                .attr("width", width)
                .attr("height", height);

            minimap
                .x(width + minimapPadding)
                .y(minimapPadding)
                .render();
        };

        canvas.zoomEnabled = function(isEnabled) {
            if (!arguments.length) { return zoomEnabled }
            zoomEnabled = isEnabled;
        };

        canvas.dragEnabled = function(isEnabled) {
            if (!arguments.length) { return dragEnabled }
            dragEnabled = isEnabled;
        };

        canvas.reset = function() {
            d3.transition().duration(750).tween("zoom", function() {
                var ix = d3.interpolate(xScale.domain(), [-width  / 2, width  / 2]),
                    iy = d3.interpolate(yScale.domain(), [-height / 2, height / 2]),
                    iz = d3.interpolate(scale, 1);
                return function(t) {
                    zoom.scale(iz(t)).x(x.domain(ix(t))).y(y.domain(iy(t)));
                    zoomed(iz(t));
                };
            });
        };
    }


    //============================================================
    // Accessors
    //============================================================

    canvas.svg = function() {
      return svg;
    };    
    
    canvas.showMinimap = function(value) {
      if (!arguments.length) return showMinimap;
      showMinimap = value;
      return this;            
    };

    canvas.selectNodeCallback = function(value) {
      if (!arguments.length) return selectNodeCallback;
      selectNodeCallback = value;
      return this;      
    };
    
    canvas.selectFlowCallback = function(value) {
      if (!arguments.length) return selectFlowCallback;
      selectFlowCallback = value;
      return this;      
    };    

    canvas.unselectCallback = function(value) {
      if (!arguments.length) return unselectCallback;
      unselectCallback = value;
      return this;      
    };
    
    canvas.width = function(value) {
        if (!arguments.length) return width;
        width = parseInt(value, 10);
        return this;
    };

    canvas.height = function(value) {
        if (!arguments.length) return height;
        height = parseInt(value, 10);
        return this;
    };

    canvas.scale = function(value) {
        if (!arguments.length) { return scale; }
        scale = value;
        return this;
    };

    canvas.events = function(value) {
        if (!arguments.length) { return events; }
        events = value;
        return this;
    };
    
    canvas.nodes = function(value) {
        if (!arguments.length) { return nodes; } 
        value.forEach(function(value_) {
          nodes.forEach(function(node_) {
            if (node_.id == value_.id) {
              value_.x = node_.x;
              value_.y = node_.y;
            }            
          });
        });
        nodes = value;        
        return this;
    };
    
    canvas.links = function(value) {
        if (!arguments.length) { return links; }
        value.forEach(function(value_) {
          links.forEach(function(link_) {
            if (link_.source.ip == value_.source_ip 
             && link_.target.ip == value_.target_ip) {
              value_.x = link_.x;
              value_.y = link_.y;
              // value_.px = link_.px;
              // value_.py = link_.py;
            }            
          });
        });        
        links = value;
        return this;
    };
    

    return canvas;
};




/** MINIMAP **/
d3.topology.minimap = function() {

    "use strict";

    var minimapScale    = 0.15,
        scale           = 1,
        zoom            = null,
        base            = null,
        target          = null,
        width           = 0,
        height          = 0,
        x               = 0,
        y               = 0,
        frameX          = 0,
        frameY          = 0,
        maxWidth        = 150,
        maxHeight       = 150;        

    function minimap(selection) {

        base = selection;

        var container = selection.append("g")
            .attr("class", "minimap")
            .call(zoom);

        zoom.on("zoom.minimap", function() {
            scale = d3.event.scale;
        });


        minimap.node = container.node();

        var frame = container.append("g")
            .attr("class", "frame")

        frame.append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height)
            .attr("filter", "url(#minimapDropShadow)");

        var drag = d3.behavior.drag()
            .on("dragstart.minimap", function() {
                var frameTranslate = d3.topology.util.getXYFromTranslate(frame.attr("transform"));
                frameX = frameTranslate[0];
                frameY = frameTranslate[1];
            })
            .on("drag.minimap", function() {
                d3.event.sourceEvent.stopImmediatePropagation();
                frameX += d3.event.dx;
                frameY += d3.event.dy;
                frame.attr("transform", "translate(" + frameX + "," + frameY + ")");
                var translate =  [(-frameX*scale),(-frameY*scale)];
                target.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
                zoom.translate(translate);
            });

        frame.call(drag);

        /** RENDER **/
        minimap.render = function() { 
          
            minimapScale = Math.min(maxWidth * 1.0 / panWidth, maxHeight * 1.0 / panHeight);
            var actualWidth = panWidth * minimapScale;
            var actualHeight = panHeight * minimapScale;            
            container.attr("transform", "translate(" + (1042 - actualWidth / 2 - 6) + "," + (6 + actualHeight / 2) + ")scale(" + minimapScale + ")");
            scale = zoom.scale();            
            var node = target.node().cloneNode(true);
            node.removeAttribute("id");
            base.selectAll(".minimap .panCanvas").remove();            
            minimap.node.appendChild(node);
            base.selectAll(".minimap .panCanvas").append("rect")
                .attr("class", "background")
                .attr("width", panWidth)
                .attr("height", panHeight)
                .attr("transform", "translate(" + [-panWidth / 2, -panHeight / 2] + ")");                                    
            var targetTransform = d3.topology.util.getXYFromTranslate(target.attr("transform"));
            frame.attr("transform", "translate(" + (-targetTransform[0]/scale) + "," + (-targetTransform[1]/scale) + ")")
                .select(".background")
                .attr("width", width / scale)
                .attr("height", height / scale);
            frame.node().parentNode.appendChild(frame.node());
            d3.select(node).attr("transform", "translate(1,1)");
        };
    }


    //============================================================
    // Accessors
    //============================================================


    minimap.width = function(value) {
        if (!arguments.length) return width;
        width = parseInt(value, 10);
        return this;
    };


    minimap.height = function(value) {
        if (!arguments.length) return height;
        height = parseInt(value, 10);
        return this;
    };


    minimap.x = function(value) {
        if (!arguments.length) return x;
        x = parseInt(value, 10);
        return this;
    };


    minimap.y = function(value) {
        if (!arguments.length) return y;
        y = parseInt(value, 10);
        return this;
    };


    minimap.scale = function(value) {
        if (!arguments.length) { return scale; }
        scale = value;
        return this;
    };


    minimap.minimapScale = function(value) {
        if (!arguments.length) { return minimapScale; }
        minimapScale = value;
        return this;
    };


    minimap.zoom = function(value) {
        if (!arguments.length) return zoom;
        zoom = value;
        return this;
    };


    minimap.target = function(value) {
        if (!arguments.length) { return target; }
        target = value;
        width  = parseInt(target.attr("width"),  10);
        height = parseInt(target.attr("height"), 10);
        return this;
    };

    return minimap;
};




d3.topology.forcecircle = function() {
    
    "use strict";

    var cx          = 0,
        cy          = 0,
        r           = 0,
        color       = "#000000",
        node        = null,
        base        = null;

    function forcecircle(selection) {
        base = selection;
        forcecircle.base = base;
        node = base.append("circle")
            .attr("class", "forcecircle");
        
        function render() {
            node.attr("cx", cx)
                .attr("cy", cy)
                .attr("r",  r)
                .style("fill", color);
        }
        
        forcecircle.render = render;
        
        render();
        
    }


    //============================================================
    // Accessors
    //============================================================


    forcecircle.cx = function(value) {
        if (!arguments.length) return cx;
        cx = parseInt(value, 10);
        return this;
    };

    forcecircle.cy = function(value) {
        if (!arguments.length) return cy;
        cy = parseInt(value, 10);
        return this;
    };

    forcecircle.r = function(value) {
        if (!arguments.length) return r;
        r = parseInt(value, 10);
        return this;
    };
    
    forcecircle.color = function(value) {
        if (!arguments.length) return color;
        color = value;
        return this;
    };
    
    forcecircle.node = function() {
        return node;
    };
    
    forcecircle.x = 0;
    forcecircle.y = 0;

    return forcecircle;
};



/** UTILS **/
d3.topology.util = {};
d3.topology.util.getXYFromTranslate = function(translateString) {
    var split = translateString.split(",");
    var x = split[0] ? ~~split[0].split("(")[1] : 0;
    var y = split[1] ? ~~split[1].split(")")[0] : 0;
    return [x, y];
};