d3.sankey = function() {
  var sankey = {},
      nodeWidth = 34,
      nodePadding = 8,
      padding = [1, 1],
      size = [1, 1],
      nodes = [],
      flows = [],
      groups = [],
      landingPos = 0;

  sankey.depth = function(_) {
    if (!arguments.length) return depth;
    depth = +_;
    return sankey;
  }

  sankey.nodeWidth = function(_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  sankey.nodePadding = function(_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function(_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };
  
  sankey.groups = function(_) {
    if (!arguments.length) return groups;
    groups = _;
    return sankey;
  };  

  sankey.flows = function(_) {
    if (!arguments.length) return flows;
    flows = _;
    return sankey;
  };
  
  sankey.init = function(_) {
    if (arguments.length) {
      nodes = _.nodes;
      flows = _.flows;
      groups = _.groups;
    }
    return sankey;
  };
  
  sankey.size = function(_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };
  
  sankey.padding = function(_) {
    if (!arguments.length) return padding;
    padding = _;
    return sankey;
  };  

  sankey.layout = function(iterations) {
    for (var i = 0; i < nodes.length; i ++) {
      for (var j = 0; j < groups.length; j ++) {
        if (nodes[i].group == groups[j].id) {
          nodes[i].group = groups[j];
          break;
        }
      }
    }     
    computeGroupBreadths();
    computeNodeFlows();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeFlowDepths();
    return sankey;
  };
  
  sankey.createGroup = function(id, order, name) {
    for (var i = 0; i < groups.length; i ++) {
      if (groups[i].order >= order) {
        groups[i].order ++;
      }  
    }
    var newGroup = {id: id, order: order, name: name}; 
    groups.splice(order, 0, newGroup);
  }
  
  sankey.deleteGroup = function(order) {
    for (var i = 0; i < groups.length; i ++) {
      if (groups[i].order > order) {
        groups[i].order --;
      }  
    }
    groups.splice(order, 1);        
  }

  sankey.setLanding = function(landing) {
    landingPos = landing;
  }
  
  sankey.relayout = function() {
    computeFlowDepths();
    return sankey;
  };
  
  sankey.relayoutGroup = function(groupNo) {
    refreshNodeDepth(groupNo);
    return sankey;
  };  

  sankey.flowPath = function() {
    var curvature = .5;

    function flowPath(d) {            
      var xOverlap = Math.abs(d.source.x - d.target.x) <= Math.max(d.source.dx, d.target.dx);
      var arclength = d.source.y > d.target.y ? -80 : 80;
      var x0, x1, xi, x2, x3, y0, y1;
      d.overlap = xOverlap;
      d.arclength = arclength;      
      if (xOverlap) {
        x0 = arclength > 0 ? d.source.x + d.source.dx : d.source.x,      
        x1 = arclength > 0 ? d.target.x + d.target.dx : d.target.x,
        xi = d3.interpolateNumber(x0, x1),
        x2 = x0 + arclength;
        x3 = x1 + arclength;
        y0 = d.source.y + d.sy + d.dy / 2,
        y1 = d.target.y + d.ty + d.dy / 2;                        
      } else {
        d.overlap = false;
        var reverse = d.source.x >= d.target.x;        
        x0 = reverse ? d.source.x : d.source.x + d.source.dx,      
        x1 = reverse ? d.target.x + d.target.dx : d.target.x,
        xi = d3.interpolateNumber(x0, x1),
        x2 = xi(curvature),
        x3 = x2,
        y0 = d.source.y + d.sy + d.dy / 2,
        y1 = d.target.y + d.ty + d.dy / 2;                
      }
      d.x0 = x0;
      d.y0 = y0;
      d.x1 = x1;
      d.y1 = y1;
      return "M" + x0 + "," + y0
           + "C" + x2 + "," + y0
           + " " + x2 + "," + y1
           + " " + x1 + "," + y1;
    }

    flowPath.curvature = function(_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      return flowPath;
    };

    return flowPath;
  };

  sankey.groupPath = function() {
    function groupPath(d) {        
      var x0 = (groups.length > 1 ? d.order * ((size[0] - padding[0] - padding[1] - nodeWidth) / (groups.length - 1)) : 0) 
             + nodeWidth / 2 + padding[0],
          y0 = 0,
          x1 = x0,
          y1 = size[1];          
      return "M" + x0 + "," + y0
           + "L" + x1 + "," + y1;
    }
    return groupPath;
  };
  
  sankey.landingPath = function() {
    function landingPath(d) {        
      var x0 = (groups.length > 1 ? d.order * ((size[0] - padding[0] - padding[1] - nodeWidth) / (groups.length - 1)) : 0)
             + nodeWidth / 2 - 20 + padding[0],
          y0 = landingPos,
          x1 = x0 + 40,
          y1 = landingPos;
      return "M" + x0 + "," + y0
           + "L" + x1 + "," + y1;
    }
    return landingPath;
  };  
  
  function computeGroupBreadths() {
      groups.forEach(function(group) {
          group.x = (groups.length > 1 ? group.order * ((size[0] - padding[0] - padding[1] - nodeWidth) / (groups.length - 1)) : 0) 
                  + nodeWidth / 2 + padding[0];
      });
  }
  
  // Populate the sourceFlows and targetFlows for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeFlows() {
    nodes.forEach(function(node) {
      node.sourceFlows = [];
      node.targetFlows = [];
    });
    for (var i = 0; i < flows.length; ++i) {
      var flow = flows[i];
      var useSource = false;
      var useTarget = false; 
      nodes.forEach(function(node) {  
        if ((flow.source.id && (node.id == flow.source.id))
        || (flow.source == node.ip_address)) {
          flow.source = node;
          node.sourceFlows.push(flow);
          useSource = true;
        }
        if ((flow.target.id && (node.id == flow.target.id))
        || (flow.target == node.ip_address)) {
          flow.target = node;
          node.targetFlows.push(flow);
          useTarget = true;
        }                      
      });        
      if (!useSource || !useTarget) {
        flows.splice(i--, 1);
      }      
    }      
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the maximum breadth.
  function computeNodeBreadths() {        
    nodes.forEach(function(node) {      
      node.dx = node.type < nodeType.length ? nodeType[node.type].width : nodeType[0].width;
      node.image = node.type < nodeType.length ? nodeType[node.type].image : nodeType[0].image;
      node.x = (groups.length > 1 ? node.group.order * ((size[0] - padding[0] - padding[1] - nodeWidth) / (groups.length - 1)) : 0) 
             + padding[0] + nodeWidth / 2 - node.dx / 2;    
    });
  }

  function refreshNodeDepth(groupOrder) {
    var node,
      dy,
      y0 = 0,
      i,
      n = nodes.length,
      groupNodes = [];     
    for (i = 0; i < n; i ++) {
      if (nodes[i].group.order == groupOrder) {
        groupNodes.push(nodes[i]);  
        nodes[i].x = (groups.length > 1 ? nodes[i].group.order * ((size[0] - padding[0] - padding[1] - nodeWidth) / (groups.length - 1)) : 0)
                   + padding[0] + nodeWidth / 2 - nodes[i].dx / 2;      
      }
    }
    n = groupNodes.length;

    groupNodes.sort(ascendingOrder);
    
    // Push any overlapping nodes down.    
    for (i = 0; i < n; ++i) {
      node = groupNodes[i];
      dy = y0 - node.y;
      if (dy > 0) node.y += dy;
      y0 = node.y + node.dy + nodePadding;
    }

    // If the bottommost node goes outside the bounds, push it back up.
    dy = y0 - nodePadding - size[1];
    if (dy > 0) {
      y0 = node.y -= dy;
      // Push any overlapping nodes back up.
      for (i = n - 2; i >= 0; --i) {
        node = nodes[i];
        dy = node.y + node.dy + nodePadding - y0;
        if (dy > 0) node.y -= dy;
        y0 = node.y;
      }
    }
    
    // Push any overlapping nodes up.
    y0 = size[1];
    for (i = n - 1; i >= 0; i --) {
      node = groupNodes[i];
      dy = node.y + node.dy - y0;
      if (dy > 0) node.y -= dy;
      y0 = node.y - nodePadding;
    }

    
    function ascendingOrder(a, b) {
      return a.order - b.order;
    }
  }
  
  function computeNodeDepths(iterations) {
    var nodesByBreadth = d3.nest()
        .key(function(d) { return d.group.order; })
        .sortKeys(d3.ascending)
        .entries(nodes)
        .map(function(d) { return d.values; });

    //
    initializeNodeDepth();
    resolveCollisions();
    for (var alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeDepth() {
      nodesByBreadth.forEach(function(nodes) {
        nodes.sort(ascendingOrder);
        nodes.forEach(function(node, i) {                    
          node.y = i + 4;
          node.dy = node.type < nodeType.length ? nodeType[node.type].height : nodeType[0].height;
          // init next and prev
          if (i == 0) {
            node.prev = {"y": -1};
            node.next = nodes.length > 1 ? nodes[1] : {"y": 9999};
          } else if (i == nodes.length - 1) {
            node.prev = nodes.length > 1 ? nodes[i - 1] : {"y": -1};
            node.next = {"y": 9999};
          } else {
            node.prev = nodes[i - 1];
            node.next = nodes[i + 1];
          }
        });
      });

      flows.forEach(function(flow) {   
        flow.dy = 64;
      });
    }

    function relaxLeftToRight(alpha) {
      nodesByBreadth.forEach(function(nodes, breadth) {
        nodes.slice(0).reverse().forEach(function(node) {
          if (node.targetFlows.length) {
            var y = d3.sum(node.targetFlows, weightedSource) / (node.targetFlows.length);
            var offset = (y - center(node)) * alpha;
            if (offset > 0) {
              if (node.y + offset + node.dy > node.next.y)
                node.y = node.next.y - node.dy;
              else
                node.y += offset;   
            } else {
              if (node.y + offset < node.prev.y)
                node.y = node.prev.y + 1;
              else
                node.y += offset;
            }
          }
        });
      });

      function weightedSource(flow) {
        return center(flow.source);
      }
    }

    function relaxRightToLeft(alpha) {
      nodesByBreadth.slice().reverse().forEach(function(nodes) {
        nodes.slice(0).reverse().forEach(function(node) {
          if (node.sourceFlows.length) {
            var y = d3.sum(node.sourceFlows, weightedTarget) / (node.sourceFlows.length);
            var offset = (y - center(node)) * alpha;
            if (offset > 0) {
              if (node.y + offset > node.next.y)
                node.y = node.next.y - 1;
              else
                node.y += offset;   
            } else {
              if (node.y + offset < node.prev.y)
                node.y = node.prev.y + 1;
              else
                node.y += offset;
            }            
          }
        });
      });

      function weightedTarget(flow) {
        return center(flow.target);
      }
    }

    function resolveCollisions() {
      nodesByBreadth.forEach(function(nodes) {
        var node,
            dy,
            y0 = 4,
            n = nodes.length,
            i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingOrder);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    function ascendingOrder(a, b) {
      return a.order - b.order;
    }
  }

  function computeFlowDepths() {        
    nodes.forEach(function(node) {
      node.sourceFlows.sort(ascendingTargetDepth);
      node.targetFlows.sort(ascendingSourceDepth);
    });
    nodes.forEach(function(node) {
      var sy = 0, ty = 0;
      node.sourceFlows.forEach(function(flow) {
        flow.sy = sy;        
      });
      node.targetFlows.forEach(function(flow) {
        flow.ty = ty;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  return sankey;
};