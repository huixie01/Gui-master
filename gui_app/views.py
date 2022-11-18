import json
import redis
from django.shortcuts import render
from django.db.models import Count, Sum, Max, Min, Avg, Q
from models import Alert, Node, Group, GroupNodes, Application, Report, ReportCategory, ReportPlots, SessionField,\
    MetricDataSec, MetricDataMin, MetricDataHour, Metric, Dimension, MetricDimensions, Event, Flow, Flowmap, FlowmapGroups
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder
from datetime import datetime, timedelta
from rest_framework import viewsets
from rest_framework.response import Response
from gui_app.serializers import *
#from django.shortcuts import render_to_response, get_object_or_404
from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
import calendar 
import random
import time
from django.db import connection
from django.db.models import Q
from rest_framework import status
import pymongo
from pymongo import MongoClient
from bson import BSON
from bson import json_util
import pql

class ScopeViewSet(viewsets.ViewSet):
    """
    Get of combined result of Nodes, Groups and Applications
    """    
    def list(self, request):
        json_result = []
        
        if request.QUERY_PARAMS.has_key('flowmap_id'):
            # return group data        
            db_result = Group.objects.exclude(flowmaps__id=request.QUERY_PARAMS.get('flowmap_id')).order_by('name')
            for db_item in db_result:
                json_result.append({'id': 'G' + str(db_item.id), 'dbid': db_item.id, 'name': db_item.name, 'type': 'groups'})
            # return node data  
            cursor = connection.cursor()
            cursor.execute("SELECT `id`, `name`, `ip_address`, `type` \
                from `t_node` where `id` not in (select `node_id` from t_group_nodes) order by `name`")
            row = cursor.fetchone()
            while row:
                if row[2] != '':
                    json_result.append({'id': 'N' + str(row[0]), 'dbid': row[0], 'name': row[1], 'type': 'nodes'})        
                row = cursor.fetchone()
        else:    
            # return all filter data        
            db_result = Node.objects.all().order_by('name')
            for db_item in db_result:
                json_result.append({'id': 'N' + str(db_item.id), 'dbid': db_item.id, 'name': db_item.name, 'type': 'nodes'})        
            db_result = Group.objects.all().order_by('name')
            for db_item in db_result:
                json_result.append({'id': 'G' + str(db_item.id), 'dbid': db_item.id, 'name': db_item.name, 'type': 'groups'})
            db_result = Application.objects.all().order_by('name')
            for db_item in db_result:
                json_result.append({'id': 'A' + str(db_item.id), 'dbid': db_item.id, 'name': db_item.name, 'type': 'apps'})                        
        return Response(json_result)

class NodeViewSet(viewsets.ModelViewSet):
    """
    Get or set Nodes
    """    
    queryset = Node.objects.all()
    serializer_class = NodeSerializer                
    
class ReportCategoryViewSet(viewsets.ModelViewSet):
    """
    Get or set Report Category result
    """            
    queryset = ReportCategory.objects.all().order_by('order')
    serializer_class = ReportCategorySerializer

class ReportViewSet(viewsets.ModelViewSet):
    """
    Get or set Report result
    """                
    queryset = Report.objects.all().order_by('order')
    serializer_class = ReportSerializer
    
    def list(self, request):        
        if request.QUERY_PARAMS.has_key('report_category_id'):
            queryset = Report.objects.filter(report_category_id=request.QUERY_PARAMS.get('report_category_id')).order_by('order')
        else:
            queryset = Report.objects.all().order_by('order')
        serializer = ReportSerializer(queryset, many=True)
        return Response(serializer.data)            
    
class SessionFieldViewSet(viewsets.ModelViewSet):
    """
    Get or set Report result
    """                
    queryset = SessionField.objects.all().order_by('order')
    serializer_class = SessionFieldSerializer
    
    def list(self, request):        
        if request.QUERY_PARAMS.has_key('protocol'):
            queryset = SessionField.objects.filter(protocol=request.QUERY_PARAMS.get('protocol')).order_by('order')
        else:
            queryset = SessionField.objects.all().order_by('order')
        serializer = SessionFieldSerializer(queryset, many=True)
        return Response(serializer.data)            
    
class ReportPlotsViewSet(viewsets.ModelViewSet):
    """
    Get or set Report plot result
    """       
    queryset = ReportPlots.objects.all().order_by('col', 'row')    
    serializer_class = ReportPlotsSerializer         
    def list(self, request):
        if request.QUERY_PARAMS.has_key('report_id'):
            queryset = ReportPlots.objects.filter(report_id=request.QUERY_PARAMS.get('report_id')).order_by('col', 'row')
        else:
            queryset = ReportPlots.objects.all().order_by('col', 'row')
        serializer = ReportPlotsSerializer(queryset, many=True)            
        return Response(serializer.data)        

class MetricViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Get Metric result
    """            
    queryset = Metric.objects.all().order_by('id')
    serializer_class = MetricSerializer
 
class EventViewSet(viewsets.ModelViewSet):
    """
    Get or set Event
    """                
    queryset = Event.objects.all().order_by('-update_time')
    serializer_class = EventSerializer
    paginate_by = 2
    def list(self, request):
        rows = 50
        sort_field = "-update_time"
        scope_type = "all"
        if request.QUERY_PARAMS.has_key('scope_type'):
            scope_type = request.QUERY_PARAMS.get('scope_type')
        scopes = []
        if scope_type != 'all' and request.QUERY_PARAMS.has_key('scopes'):
            scopes = request.QUERY_PARAMS.get('scopes').strip().split(',')            
        if request.QUERY_PARAMS.has_key('sort'):
            sort_field = request.QUERY_PARAMS.get('sort')
        queryset = Event.objects.all().order_by(sort_field)
        if request.QUERY_PARAMS.has_key('key'): 
            queryset = queryset.filter(name__icontains=request.QUERY_PARAMS.get('key').strip())
        if request.QUERY_PARAMS.has_key('status'):
            queryset = queryset.filter(status__in=request.QUERY_PARAMS.get('status').strip().split(','))                                            
        if request.QUERY_PARAMS.has_key('severity'): 
            queryset = queryset.filter(severity__in=request.QUERY_PARAMS.get('severity').strip().split(','))
        if request.QUERY_PARAMS.has_key('priority'): 
            queryset = queryset.filter(priority__in=request.QUERY_PARAMS.get('priority').strip().split(','))
        if request.QUERY_PARAMS.has_key('from'):
            start_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
            queryset = queryset.filter(update_time__gte=start_time)
            if request.QUERY_PARAMS.has_key('to'):
                end_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
                queryset = queryset.filter(create_time__lte=end_time)
        if scope_type == "nodes" and len(scopes) > 0:
            queryset = queryset.filter(node_id__in=scopes)
        elif scope_type == "apps" and len(scopes) > 0:
            queryset = queryset.filter(application_id=scopes[0])
        elif scope_type == "groups" and len(scopes) > 0:
            node_list = []
            groups = Group.objects.get(pk=scopes[0]).nodes.all() 
            for node in groups:
                node_list.append(node.pk)
            queryset = queryset.filter(node_id__in=node_list)
        if request.QUERY_PARAMS.has_key('rows'): 
            rows = request.QUERY_PARAMS.get('rows').strip()            
        paginator = Paginator(queryset, rows)
        page = 1
        if request.QUERY_PARAMS.has_key('page'):
            page = request.QUERY_PARAMS.get('page')
        try:
            events = paginator.page(page)
        except PageNotAnInteger:
            # If page is not an integer, deliver first page.
            events = paginator.page(1)
        except EmptyPage:
            # If page is out of range (e.g. 9999),
            # deliver last page of results.
            events = paginator.page(paginator.num_pages)

        serializer_context = {'request': request}
        serializer = PaginatedEventSerializer(events, context=serializer_context)
        serializer.data['page'] = page        
#        serializer = EventSerializer(queryset, many=True)            
        return Response(serializer.data)      

class RankViewSet(viewsets.ViewSet):
    """
    Get wrapup flows
    """                
    def list(self, request):
        redis_result = []
        if request.QUERY_PARAMS.has_key('type') and request.QUERY_PARAMS.has_key('rows'):
            if request.QUERY_PARAMS.has_key('sort') and request.QUERY_PARAMS.get('ip').strip() == 'ascending':
                redis_result = get_redis_rank_data(request.QUERY_PARAMS.get('type').strip(), \
                                                   int(request.QUERY_PARAMS.get('rows').strip()), True)
            else:
                redis_result = get_redis_rank_data(request.QUERY_PARAMS.get('type').strip(), \
                                                   int(request.QUERY_PARAMS.get('rows').strip()), False)                
                
        return Response(redis_result)          
    
class WrapupFlowViewSet(viewsets.ViewSet):
    """
    Get wrapup flows
    """                
    def list(self, request):
        json_result = []
        sort_field = "-update_time"
        if request.QUERY_PARAMS.has_key('sort'):
            sort_field = request.QUERY_PARAMS.get('sort')
        queryset = Flow.objects.all().order_by(sort_field)
        if request.QUERY_PARAMS.has_key('ip'): 
            queryset = queryset.filter(Q(src_ip_address=request.QUERY_PARAMS.get('ip').strip()) \
                                       | Q(dst_ip_address=request.QUERY_PARAMS.get('ip').strip()))
        elif request.QUERY_PARAMS.has_key('src') and request.QUERY_PARAMS.has_key('dst'):
            queryset = queryset.filter(src_ip_address=request.QUERY_PARAMS.get('src').strip(), \
                                       dst_ip_address=request.QUERY_PARAMS.get('dst').strip())            
        if request.QUERY_PARAMS.has_key('from'):
            start_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
            queryset = queryset.filter(update_time__gte=start_time)
            if request.QUERY_PARAMS.has_key('to'):
                end_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
                queryset = queryset.filter(create_time__lte=end_time)
                
        params = {}
        params['live'] = request.QUERY_PARAMS.get("live");
        length = 30
        from_time = 0
        to_time = 0
        if params['live'] == "true":
            params['length'] = request.QUERY_PARAMS.get('length')
            params['to_time'] = datetime.utcnow()
            params['from_time'] = params['to_time'] - timedelta(minutes=int(params['length']))                       
        else:
            params['length'] = (to_time - from_time) * 1.0 / 1000 / 60;
            params['from_time'] = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
            params['to_time'] = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
        params['table'] = "ts.sec"    
        if int(params['length']) >= (4 * 60):
            params['table'] = "ts.min"
        if int(params['length']) >= (2 * 24 * 60):
            params['table'] = "ts.hour"
        for flow in queryset:
            req = 0
            rsp = 0
            rtt = 0
            cpr = 0
            watch_score = 0            
            req_his = []
            rsp_his = []
            rtt_his = []
            redis_result = get_redis_flow_data("ts.sec", flow.id, 'req', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                req_his.append([1000 * redis_item['time'], redis_item['value']])
            redis_result = get_redis_flow_data("ts.sec", flow.id, 'rsp', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                rsp_his.append([1000 * redis_item['time'], redis_item['value']])
            redis_result = get_redis_flow_data("ts.sec", flow.id, 'rtt', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                rtt_his.append([1000 * redis_item['time'], redis_item['value']])
            redis_result = get_redis_flow_data("ts.sec", flow.id, 'cpr', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            if len(redis_result) > 0:
                cpr = redis_result[-1]['value'] * 1.00 / 100
            redis_result = get_redis_flow_data("ts.sec", flow.id, 'ws', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            if len(redis_result) > 0:
                watch_score = redis_result[-1]['value']                                    
            if len(req_his) > 0:
                req = req_his[-1][1]
            if len(rsp_his) > 0:
                rsp = rsp_his[-1][1]
            if len(rtt_his) > 0:
                rtt = rtt_his[-1][1]                
            json_result.append({'id': flow.id, 'src_ip_address': flow.src_ip_address, 'dst_ip_address': flow.dst_ip_address, \
                                'type': flow.type, 'dst_port': flow.dst_port, 'req': req, 'req_his':req_his, 'rsp': rsp, 'rsp_his': rsp_his, \
                                'rtt': rtt, 'rtt_his': rtt_his, 'correlations': flow.correlations, 'cpr': cpr, 'watch_score': watch_score})
        return Response(json_result)      

 
class AlertViewSet(viewsets.ModelViewSet):
    """
    Get or set Alert information
    """            
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer


class NestedNodeViewSet(viewsets.ModelViewSet):
    """
    Get or set Node information    
    """            
    queryset = Node.objects.all()
    serializer_class = NodeSerializer    
    def list(self, request, group_pk):
        queryset = Node.objects.filter(groups__id=group_pk)
        serializer = NodeSerializer(queryset, many=True)            
        return Response(serializer.data)     
    
    def retrieve(self, request, group_pk, pk=None):
        queryset = Node.objects.filter(groups__id=group_pk)
        user = get_object_or_404(queryset, pk=pk)
        serializer = NodeSerializer(user)
        return Response(serializer.data)  
    
    def create(self, request, group_pk):
        group = get_object_or_404(Group.objects.all(), pk=group_pk)
        node = get_object_or_404(Node.objects.all(), pk=request.DATA['node_id'])
        group_node = GroupNodes(group=group, node=node, order=request.DATA['order'])
        group_node.save()
        serializer = GroupNodesSerializer(group_node)
        return Response(serializer.data)

    def partial_update(self, request, group_pk, pk=None):
        group_node = get_object_or_404(GroupNodes.objects.all(), group__id=group_pk, node__id=pk)
        group_node.order = request.DATA['order']   
        group_node.save()
        serializer = GroupNodesSerializer(group_node)
        return Response(serializer.data)
    
    def destroy(self, request, group_pk, pk=None):
        group_node = get_object_or_404(GroupNodes.objects.all(), group__id=group_pk, node__id=pk)
        group_node.delete()   
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class GroupViewSet(viewsets.ModelViewSet):
    """
    Get or set Group information
    """            
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    
class NestedGroupViewSet(viewsets.ModelViewSet):
    """
    Get or set nested Group information    
    """            
    queryset = Group.objects.all()
    serializer_class = GroupSerializer    
    def list(self, request, flowmap_pk):
        queryset = Group.objects.filter(flowmaps__id=flowmap_pk)
        serializer = GroupSerializer(queryset, many=True)            
        return Response(serializer.data)     
    
    def retrieve(self, request, flowmap_pk, pk=None):
        queryset = Group.objects.filter(flowmaps_id=flowmap_pk)
        user = get_object_or_404(queryset, pk=pk)
        serializer = GroupSerializer(user)
        return Response(serializer.data)  
    
    def create(self, request, flowmap_pk):
        flowmap = get_object_or_404(Flowmap.objects.all(), pk=flowmap_pk)
        group = get_object_or_404(Group.objects.all(), pk=request.DATA['group_id'])
        flowmap_group = FlowmapGroups(flowmap=flowmap, group=group, order=request.DATA['order'])
        flowmap_group.save()
        serializer = FlowmapGroupsSerializer(flowmap_group)
        return Response(serializer.data)

    def partial_update(self, request, flowmap_pk, pk=None):
        flowmap_group = get_object_or_404(FlowmapGroups.objects.all(), flowmap__id=flowmap_pk, group__id=pk)
        flowmap_group.order = request.DATA['order']   
        flowmap_group.save()
        serializer = GroupNodesSerializer(flowmap_group)
        return Response(serializer.data)
    
    def destroy(self, request, flowmap_pk, pk=None):
        flowmap_group = get_object_or_404(FlowmapGroups.objects.all(), flowmap__id=flowmap_pk, group__id=pk)
        flowmap_group.delete()   
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class FlowmapViewSet(viewsets.ModelViewSet):
    """
    Get or set Flowmap information
    """            
    queryset = Flowmap.objects.all()
    serializer_class = FlowmapSerializer
    
class TopologyViewSet(viewsets.ViewSet):
    """
    Get topology endpoints and links and ongoing events
    """    
    def list(self, request):
        json_result = {'nodes': [], 'links': [], 'events': []}
        for node in Node.objects.filter(ip_address__isnull=False):
            json_result['nodes'].append({'id': node.id, 'ip': node.ip_address, 'name': node.name, 'mac': node.mac_address, \
                                         'type': node.type, 'vender': node.vender, 'errors': 0, 'warns': 0, 'infos': 0, 'group': 0})                
            for flow in Flow.objects.all():
                source = -1;
                target = -1;
                for index in range(0, len(json_result['nodes'])):
                    if json_result['nodes'][index]['ip']:
                        if json_result['nodes'][index]['ip'] == flow.src_ip_address:
                            source = index
                        if json_result['nodes'][index]['ip'] == flow.dst_ip_address:
                            target = index
                if source > -1 and target > -1:
                    duplicate = False
                    for link in json_result['links']:
                        if (link['source'] == source and link['target'] == target) \
                        or (link['source'] == target and link['target'] == source):
                            duplicate = True
                            if link['protocol'][-1] != '.':
                                link['protocol'] = link['protocol'] + '...'
                    if not duplicate:
                        json_result['links'].append({'source_ip': flow.src_ip_address, 'source': source, 'target_ip': flow.dst_ip_address, \
                                                     'target': target, 'value': 1, 'protocol': flow.type + ':' + str(flow.dst_port)})
        for event in Event.objects.filter(status__in=[0, 1]):
            json_result['events'].append({'node_id': event.node_id, 'severity': event.severity, 'flow_id': event.flow_id, 'source': event.source})
        return Response(json_result)
        
class WrapupFlowmapViewSet(viewsets.ViewSet):
    """
    Get combination result of FlowMap: Groups, Nodes and Flows
    """    
    def retrieve(self, request, pk):
        json_result = {'groups': [], 'nodes': [], 'flows': []}
        if request.QUERY_PARAMS.has_key('group_id'):
            group_id = request.QUERY_PARAMS.get('group_id')
            group = Group.objects.get(pk=group_id)
            for node in group.nodes.all():
                json_result['nodes'].append({'id': node.id, 'group': group_id, 'name': node.name, 'ip_address': node.ip_address, 'type': node.type, \
                                             'order': node.groupnodes_set.get(group=group).order})
            db_result = Flow.objects.all()                
            for flow in db_result:
                source = -1;
                target = -1;
                for node in json_result['nodes']:
                    if node['ip_address'] == flow.src_ip_address:
                        source = node['id']
                    if node['ip_address'] == flow.dst_ip_address:
                        target = node['id']
                if source > -1 or target > -1:
                    data_exist = False
                    for flow_item in json_result['flows']:
                        if flow_item['source'] == flow.src_ip_address and flow_item['target'] == flow.dst_ip_address:
                            data_exist = True
                            flow_item['protocol'].append({'id': flow.id, 'port': flow.dst_port, 'type': flow.type, 'alias': ''})
                    if not data_exist:                        
                        json_result['flows'].append({'source': flow.src_ip_address, 'target': flow.dst_ip_address, \
                                                     'protocol': [{'id': flow.id, 'port': flow.dst_port, 'type': flow.type, 'alias': ''}]})

        elif request.QUERY_PARAMS.has_key('node_ip'):            
            node_ip = request.QUERY_PARAMS.get('node_ip')
            # return group data        
            db_result = Flow.objects.filter(Q(src_ip_address=node_ip) | Q(dst_ip_address=node_ip))
            for flow in db_result:
                data_exist = False
                for flow_item in json_result['flows']:
                    if flow_item['source'] == flow.src_ip_address and flow_item['target'] == flow.dst_ip_address:
                        data_exist = True
                        flow_item['protocol'].append({'id': flow.id, 'port': flow.dst_port, 'type': flow.type, 'alias': ''})
                if not data_exist:                        
                    json_result['flows'].append({'source': flow.src_ip_address, 'target': flow.dst_ip_address, \
                                                 'protocol': [{'id': flow.id, 'port': flow.dst_port, 'type': flow.type, 'alias': ''}]})
                                
        else:        
            # return all filter data 
            db_result = FlowmapGroups.objects.filter(flowmap__id=pk).order_by('order')
            for flowmap_group in db_result:                               
                group = flowmap_group.group            
                json_result['groups'].append({'id': group.id, 'name': group.name, 'order': flowmap_group.order})                  
                for node in group.nodes.all():
                    json_result['nodes'].append({'id': node.id, 'group': group.id, 'name': node.name, 'ip_address': node.ip_address, 'type': node.type, \
                                                 'order': node.groupnodes_set.get(group=group).order})
            db_result = Flow.objects.all()                
            for flow in db_result:
                source = -1;
                target = -1;
                for node in json_result['nodes']:
                    if node['ip_address'] == flow.src_ip_address:
                        source = node['id']
                    if node['ip_address'] == flow.dst_ip_address:
                        target = node['id']
                if source > -1 and target > -1:
                    data_exist = False
                    for flow_item in json_result['flows']:
                        if flow_item['source'] == flow.src_ip_address and flow_item['target'] == flow.dst_ip_address:
                            data_exist = True
                            flow_item['protocol'].append({'id':flow.id, 'port': flow.dst_port, 'type': flow.type, 'alias': ''})
                    if not data_exist:                        
                        json_result['flows'].append({'source': flow.src_ip_address, 'target': flow.dst_ip_address, \
                                                     'protocol': [{'id': flow.id, 'port': flow.dst_port, 'type': flow.type, 'alias': ''}]})
                        
        return Response(json_result)

    def update(self, request, pk):
        json_result = {}        
        map_data = request.DATA
        if map_data.has_key('groups') and map_data.has_key('nodes'):
            Flowmap.objects.get(pk=pk).groups.clear()
            for group in map_data['groups']:
                # clear group data
                Group.objects.get(pk=group['id']).nodes.clear()
                # create group nodes
                for node in map_data['nodes']:
                    if node['group'] == group['id']:
                        db_group = get_object_or_404(Group.objects.all(), pk=group['id'])
                        db_node  = get_object_or_404(Node.objects.all(), pk=node['id'])
                        group_node = GroupNodes(group=db_group, node=db_node, order=node['order'])
                        group_node.save()
                # update flowmap groups
                db_group = get_object_or_404(Group.objects.all(), pk=group['id'])
                db_flowmap  = get_object_or_404(Flowmap.objects.all(), pk=pk)
                flowmap_group = FlowmapGroups(flowmap=db_flowmap, group=db_group, order=group['order'])
                flowmap_group.save()                
            return Response(json_result)
        else:
            return Response(status=status.HTTP_204_NO_CONTENT)
                
class FlowTrafficViewSet(viewsets.ViewSet):
    """
    Get of combined result of Flow traffic
    """    
    def list(self, request):
        json_result = []    
        if request.QUERY_PARAMS.has_key('flow_ids'):
            flow_ids = request.QUERY_PARAMS.get('flow_ids').strip().split(',')
            for flow_id in flow_ids:
                # init empty data
                end_time = calendar.timegm(datetime.utcnow().timetuple())
                end_time -= end_time % 30
                directions = ['req', 'rsp']
                value_name = ['egress', 'ingress']
                value = {'flow_id': flow_id, 'time': end_time, 'egress': 0, 'ingress': 0}
                for i in range(len(directions)):
                    result = get_redis_flow_data(flow_id, directions[i], 12 * 30)
                    for index, item in enumerate(result):
                        speed = 0
                        if index > 0 and item['value'] - result[index - 1]['value'] and item['time'] - result[index - 1]['time'] > 0:                    
                            speed = (item['value'] - result[index - 1]['value']) / (item['time'] - result[index - 1]['time'])
                            start1 = result[index - 1]['time']
                            end1 = item['time']
                            end2 = end_time 
                            start2 = end2 - 30
                            overlap = min(end1, end2) - max(start1, start2)
                            if (overlap > 0):
                                value[value_name[i]] += (overlap * speed * 8) / 30             
                json_result.append(value)            
        else:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(json_result)

class FlowTrafficHistoryViewSet(viewsets.ViewSet):
    """
    Get of combined result of Flow traffic history
    """    
    def list(self, request):
        json_result = []    
        time1 = int(round(time.time() * 1000))        
        if request.QUERY_PARAMS.has_key('flow_id'):                                 
            # init empty data
            end_time = calendar.timegm(datetime.utcnow().timetuple())
            end_time -= end_time % 30
            for i in range(60):
                start_time = end_time - (59 - i) * 30
                json_result.append({'time': start_time, 'egress': 0, 'ingress': 0})
            directions = ['req', 'rsp']
            value_name = ['egress', 'ingress']
            for i in range(len(directions)):
                result = get_redis_flow_data(request.QUERY_PARAMS.get('flow_id'), directions[i], 1800 + 180)
                for index, item in enumerate(result):
                    speed = 0
                    if index > 0 and item['value'] - result[index - 1]['value'] and item['time'] - result[index - 1]['time'] > 0:                    
                        speed = (item['value'] - result[index - 1]['value']) / (item['time'] - result[index - 1]['time'])
                        start1 = result[index - 1]['time']
                        end1 = item['time']
                        for val in json_result:
                            end2 = val['time']
                            start2 = end2 - 30
                            overlap = min(end1, end2) - max(start1, start2)
                            if (overlap > 0):
                                val[value_name[i]] += (overlap * speed * 8) / 30
        else:
            return Response(status=status.HTTP_204_NO_CONTENT)
                        
        duration = int(round(time.time() * 1000)) - time1;

        #print '=====================>>> FlowTrafficHistoryViewSet() duration time = %d <<<=====================' % (duration)
                            
        return Response(json_result)

 
#-------------------------------------------------------------------
# Get Metric Data
#-------------------------------------------------------------------
SCOPE_TYPE_DICT = {'all':0, 'nodes':1, 'groups':1, 'apps':2}
AGGREGATE_CLASS = {"count": Sum('count'), "min": Min('min'), "max": Max('max'), "avg": Avg('avg')}
TIME_STEP = {'ts.sec':3600, 'ts.min': 3600 * 24, 'ts.hour': 3600 * 24 * 7}

redis = redis.StrictRedis(host='localhost', port=6379, db=0)
#print '*************************************'

def redis_dim_key(dim):
    return redis.smembers('dim|' + dim)
    
def redis_produce(key, range_begin, range_end):
    result = []
    reply = redis.getrange(key, range_begin, range_end);  
    records = reply.strip().split('\x02')
    for record in records:
        if len(record) > 10:
            fields = record.strip().split('\x01')
            result.append({'time': int(fields[0]), 'value': int(fields[1][1:])})
    return result
    
def redis_record(data):
    fields = data.strip().split('\x01')
    return {'time': int(fields[0]), 'value': int(fields[1][1:])}
    
def redis_flow_key(table, flow_id, data_type, time):
    key_time = time - (time % TIME_STEP[table]) 
    return table + "|" + flow_id + "|" + data_type + "|" + str(key_time);        
        
def redis_metric_key(table, metric, dim, dim_key, ip, mac, time):
    key_time = time - (time % TIME_STEP[table]) 
    return table + "|" + metric + "|" + dim + "|" + dim_key + "|" + mac + "|" + ip + "|" + str(key_time);        
    
def redis_seek(key, time, forward):
    best_start = -1
    best_end = -1
    best_time = 0
    rangelen = 64
    i_len = redis.strlen(key);
    if i_len == 0:
        return 0
    i_min = 0
    i_max = i_len - 1;
    record_start = -1
    record_end = -1
    end_of_string = False
    
    item = {'time': 0, 'value': 0}
    while (True):
        p = i_min + ((i_max - i_min) / 2)
        end_of_string = False
        # Seek the first complete record starting from position 'p'.
        # We need to search for two consecutive \x02 chars, and enlarnge
        # the range if needed as we don't know how big the record is.
        while (True):
            range_end = p + rangelen - 1
            if range_end > i_len:
                range_end = i_len
            reply = redis.getrange(key, p, range_end)
            sep1 = reply.find('\x02')
            sep2 = -1;
            if sep1 > -1 and p > 0:
                sep2 = reply.find("\x02", sep1 + 1)
            if sep1 > -1 and sep2 > -1:
                record_start = p + sep1 + 1
                record_end = p + sep2
                item = redis_record(reply[sep1 + 1 : sep2])
                if ((forward and item['time'] >= time and (best_time == 0 or best_time > item['time'])) 
                    or ((not forward) and item['time'] <= time and (best_time == 0 or best_time < item['time']))):
                    best_start = record_start
                    best_end = record_end
                    best_time = item['time']
                break
            elif sep1 > -1 and p == 0:
                record_start = 0
                record_end = sep1
                item = redis_record(reply[0 : sep1])
                if ((forward and item['time'] >= time and (best_time == 0 or best_time > item['time']))
                    or ((not forward) and item['time'] <= time and (best_time == 0 or best_time < item['time']))):
                    best_start = record_start
                    best_end = record_end
                    best_time = item['time']
                break
            elif range_end >= i_len:
                # Already at the end of the string but still no luck
                end_of_string = True
                break
            # We need to enlrange the range, it is interesting to note
            # that we take the enlarged value: likely other time series
            # will be the same size on average.
            rangelen *= 2
        if i_max - i_min <= 1:
            if best_start > -1:
                if forward:
                    return best_start
                else:
                    return best_end
            else:
                if forward:
                    return i_len
                else:
                    return 0
        if item['time'] == time:
            if forward:
                return record_start
            else:
                return record_end
        if end_of_string or item['time'] > time:
            i_max = p;
        else:
            i_min = p;
    
def get_redis_rank_data(rank_type, rank_rows, ascending):
    reply = []
    results = []
    if ascending:
        reply = redis.zrange('rank|' + rank_type, 0, rank_rows - 1)
    else:
        reply = redis.zrevrange('rank|' + rank_type, 0, rank_rows - 1)
    for item in reply:
        fields = item.strip().split('|')
        item_str = ''
        if len(fields) > 4:
            item_str = fields[1] + ' -> ' + fields[2]
            if fields[4] == '6':
                item_str += ' TCP:' 
            else:
                item_str += ' UDP:'
            item_str += fields[3]
        score = redis.zscore('rank|' + rank_type, item)
        if score != None:
            score = int(score)
        results.append([item_str, score])
    return results    
        
def get_redis_metric_data(table, metric, dim, dim_key, ip, mac, from_time, to_time):    
    result = []
    begin_key = redis_metric_key(table, metric, dim, dim_key, ip, mac, from_time)
    end_key = redis_metric_key(table, metric, dim, dim_key, ip, mac, to_time)    
    begin_off = redis_seek(begin_key, from_time, True)
    end_off = redis_seek(end_key, to_time, False)        

    if begin_key == end_key:
        result = redis_produce(begin_key, begin_off, end_off)
    else:
        result = redis_produce(begin_key, begin_off, -1);
        time = from_time - (from_time % TIME_STEP[table])
        while (True):
            time = time + TIME_STEP[table]
            key = redis_metric_key(table, metric, dim, dim_key, ip, mac, time)
            if (key == end_key):
                break
            result.extend(redis_produce(key, 0, -1))
        result.extend(redis_produce(end_key, 0, end_off))    
    return result
 
def get_redis_flow_data(table, flow_id, data_type, from_time, to_time):
    result = [];
    begin_key = redis_flow_key(table, flow_id, data_type, from_time)
    end_key = redis_flow_key(table, flow_id, data_type, to_time)    
    begin_off = redis_seek(begin_key, from_time, True)
    end_off = redis_seek(end_key, to_time, False)        
            
    if begin_key == end_key:
        result = redis_produce(begin_key, begin_off, end_off)
    else:
        result = redis_produce(begin_key, begin_off, -1);
        time = from_time - (from_time % TIME_STEP[table])
        while (True):
            time = time + TIME_STEP[table]
            key = redis_flow_key(table, flow_id, data_type, time)
            if (key == end_key):
                break
            result.extend(redis_produce(key, 0, -1))
        result.extend(redis_produce(end_key, 0, end_off))    
    return result    

#def get_redis_flow_data(flow_id, direction, time_length):        
#    result = []    
#    start_time = calendar.timegm(datetime.utcnow().timetuple()) - time_length
#    str_len = redis.strlen(flow_id + '|' + direction)        
#    range_len = 0    
#    while (True):
#        range_len += 500
#        reply = redis.getrange(flow_id + '|' + direction, 0 - range_len, -1)       
#        sep1 = reply.find('\x02')
#        sep2 = -1
#        if sep1 > -1:
#            sep2 = reply.find("\x02", sep1 + 1)
#        if sep1 > -1 and sep2 > -1:
#            fields = reply[sep1 + 1 : sep2].strip().split('\x01')
#            item = {'time': int(fields[0]), 'value': int(fields[1])}
#            if item['time'] > start_time:
#                if range_len >= str_len:
#                    records = reply[sep1 + 1 : ].split('\x02')
#                    for record in records:
#                        if len(record) > 10:
#                            fields = record.strip().split('\x01')
#                            result.append({'time': int(fields[0]), 'value': int(fields[1])})                            
#                    break
#                else:
#                    continue
#            else:
#                # go ahead to find right time
#                while (item['time'] < start_time): 
#                    sep1 = sep2
#                    sep2 = reply.find("\x02", sep1 + 1)
#                    if sep2 > -1:
#                        fields = reply[sep1 + 1 : sep2].strip().split('\x01')
#                        item = {'time': int(fields[0]), 'value': int(fields[1])}                        
#                    else:
#                        break
#                if item['time'] >= start_time:
#                    records = reply[sep1 + 1 : ].split('\x02')
#                    for record in records:
#                        if len(record) > 10:
#                            fields = record.strip().split('\x01')
#                            result.append({'time': int(fields[0]), 'value': int(fields[1])})
#                break
#        else:
#            break
#    return result
 
class MetricDataViewSet(viewsets.ViewSet):
    """
    Get Metric data
    """            
    def get_metric_trend_data(self, params):
        """
        Get metric broken down trend data
        """            
        time1 = int(round(time.time() * 1000))            
        values = [] 
        json_result = [] 
        for metric in params['metrics']:
            values = []
            if params['scope_type'] == "all" or params['scope_type'] == "apps":
                # load from redis
                redis_result = get_redis_metric_data(params['table'], metric, params['filter_dimension'], params['filter_dimension_key'], '', '', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
                for redis_item in redis_result:
                    values.append([1000 * redis_item['time'], redis_item['value']])                
                # iterate db result
#                for db_item in db_result:                
#                    values.append([1000 * calendar.timegm(db_item.data_time.timetuple()), getattr(db_item, params['value_type'])])
            elif params['scope_type'] == "nodes" or params['scope_type'] == "groups":
                node_list = []
                if params['scope_type'] == "nodes":
                    node_list = params['scopes']
                else:
                    groups = Group.objects.get(pk=params['scopes'][0]).nodes.all() 
                    for node in groups:
                        node_list.append(node.pk)
                # load from redis
                dict_result = {}
                for node in node_list:
                    db_node = Node.objects.get(pk=node)
                    redis_result = get_redis_metric_data(params['table'], metric, params['filter_dimension'], params['filter_dimension_key'], db_node.ip_address, db_node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                    for redis_item in redis_result:
                        if dict_result.has_key(1000 * redis_item['time']):
                            dict_result[1000 * redis_item['time']] = dict_result[1000 * redis_item['time']] + redis_item['value']
                        else:                
                            dict_result[1000 * redis_item['time']] = redis_item['value']
                for k in sorted(dict_result.keys()):
                    values.append([k, dict_result[k]])
            json_result.append({'key': metric, 'values': values})                        
        duration = int(round(time.time() * 1000)) - time1;
        #print '=====================>>> get_metric_trend_data() duration time = %d <<<=====================' % (duration)
        return Response(json_result)
    
    def get_scope_trend_data(self, params):
        """
        Get scope broken down trend data
        """         
#        print '**************************************'          
#        print params   
        time1 = int(round(time.time() * 1000))            
              
        key = "all"
        values = []
        json_result = [] 
        if params['scope_type'] == "all" or params['scope_type'] == "apps":
            # load from redis
            redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['filter_dimension'], params['filter_dimension_key'], '', '', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                values.append([1000 * redis_item['time'], redis_item['value']])                
            json_result.append({'key': key, 'values': values})                    
        elif params['scope_type'] == "groups":
            key = params['scopes'][0]
            dict_result = {}
            groups = Group.objects.get(pk=params['scopes'][0]).nodes.all() 
            for node in groups:
                redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['filter_dimension'], params['filter_dimension_key'], node.ip_address, node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                for redis_item in redis_result:
                    if dict_result.has_key(1000 * redis_item['time']):
                        dict_result[1000 * redis_item['time']] = dict_result[1000 * redis_item['time']] + redis_item['value']
                    else:                
                        dict_result[1000 * redis_item['time']] = redis_item['value']
                for k in sorted(dict_result.keys()):
                    values.append([k, dict_result[k]])
            json_result.append({'key': key, 'values': values})
        elif params['scope_type'] == "nodes":          
            for scope in params['scopes']:
                values = []
                key = scope
                node = Node.objects.get(pk=scope)
                # load from redis
                redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['filter_dimension'], params['filter_dimension_key'], node.ip_address, node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
                for redis_item in redis_result:
                    values.append([1000 * redis_item['time'], redis_item['value']])                
                json_result.append({'key': key, 'values': values})            
        duration = int(round(time.time() * 1000)) - time1;
        #print '=====================>>> get_scope_trend_data() duration time = %d <<<=====================' % (duration)
        return Response(json_result)
    
    def get_dimension_trend_data(self, params):
        """
        Get dimension and dimension key broken down trend data
        """           
#        print '**************************************'           
#        print params    
        time1 = int(round(time.time() * 1000))            

        values = []        
        json_result = [] 
        dimension_keys = redis_dim_key(params['breakdown_dimension'])
        for key in dimension_keys:
            values = [];
            if params['scope_type'] == "all" or params['scope_type'] == "apps":   
                redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['breakdown_dimension'], key, '', '', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                for redis_item in redis_result:
                    values.append([1000 * redis_item['time'], redis_item['value']])                                                    
            elif params['scope_type'] == "nodes" or params['scope_type'] == "groups":
                node_list = []
                if params['scope_type'] == "nodes":
                    node_list = params['scopes']
                else:
                    groups = Group.objects.get(pk=params['scopes'][0]).nodes.all() 
                    for node in groups:
                        node_list.append(node.pk)
                # load from redis
                dict_result = {}
                for node in node_list:
                    db_node = Node.objects.get(pk=node)
                    redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['breakdown_dimension'], key, db_node.ip_address, db_node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                    for redis_item in redis_result:
                        if dict_result.has_key(1000 * redis_item['time']):
                            dict_result[1000 * redis_item['time']] = dict_result[1000 * redis_item['time']] + redis_item['value']
                        else:                
                            dict_result[1000 * redis_item['time']] = redis_item['value']
                for k in sorted(dict_result.keys()):
                    values.append([k, dict_result[k]])
            json_result.append({'key': key, 'values': values})

        duration = int(round(time.time() * 1000)) - time1;
        #print '=====================>>> get_dimension_trend_data() duration time = %d <<<=====================' % (duration)
        
        return Response(json_result)
    
    
    def get_metric_distribution_data(self, params):
        """
        Get metric broken down distribution data
        """          
        time1 = int(round(time.time() * 1000))            
        
        values = []
        json_result = [] 
        for metric in params['metrics']:            
            metric_value = 0;
            if params['scope_type'] == "nodes" or params['scope_type'] == "groups":
                node_list = []            
                if params['scope_type'] == "nodes":
                    node_list = params['scopes']
                else:
                    groups = Group.objects.get(pk=params['scopes'][0]).nodes.all() 
                    for node in groups:
                        node_list.append(node.pk)
                # load from redis
                for node in node_list:
                    db_node = Node.objects.get(pk=node)
                    redis_result = get_redis_metric_data(params['table'], metric, params['filter_dimension'], params['filter_dimension_key'], db_node.ip_address, db_node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                    for redis_item in redis_result:
                        metric_value += redis_item['value']
            else:
                # load from redis
                redis_result = get_redis_metric_data(params['table'], metric, params['filter_dimension'], params['filter_dimension_key'], '', '', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
                for redis_item in redis_result:
                    metric_value += redis_item['value']                
            values.append([metric, metric_value])             
        json_result.append({'key': 'metric_distribution', 'values': values})
        duration = int(round(time.time() * 1000)) - time1;
        #print '=====================>>> get_metric_distribution_data() duration time = %d <<<=====================' % (duration)
          
        return Response(json_result)

    
    def get_scope_distribution_data(self, params):
        """
        Get scope broken down distribution data
        """         
        time1 = int(round(time.time() * 1000))            
        
        values = []        
        json_result = [] 
        metric_value = 0;
        if params['scope_type'] == "all":  
            redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['filter_dimension'], params['filter_dimension_key'], '', '', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
            for redis_item in redis_result:
                metric_value += redis_item['value']
            values.append(['all', metric_value])
        elif params['scope_type'] == "groups":
            metric_value = 0;
            groups = Group.objects.get(pk=params['scopes'][0]).nodes.all() 
            for node in groups:
                redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['filter_dimension'], params['filter_dimension_key'], node.ip_address, node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                for redis_item in redis_result:
                    metric_value += redis_item['value']
            values.append([params['scopes'][0], metric_value])                                                                                  
        elif params['scope_type'] == "nodes":            
            for scope in params['scopes']:                
                metric_value = 0
                db_node = Node.objects.get(pk=scope)
                redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['filter_dimension'], params['filter_dimension_key'], db_node.ip_address, db_node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                for redis_item in redis_result:
                    metric_value += redis_item['value']
                values.append([scope, metric_value])                                                                                        
        json_result.append({'key': 'scope_distribution', 'values': values})
        
        duration = int(round(time.time() * 1000)) - time1;
        #print '=====================>>> get_scope_distribution_data() duration time = %d <<<=====================' % (duration)
          
                              
        return Response(json_result)
    
    
    def get_dimension_distribution_data(self, params):
        """
        Get dimension and dimension key broken down distribution data
        """           
#        print '**************************************'           
#        print params
                      
        time1 = int(round(time.time() * 1000))            
                      
        values = []
        json_result = [] 
        
        dimension_keys = redis_dim_key(params['breakdown_dimension'])
        for key in dimension_keys:
            metric_value = 0
            
            if params['scope_type'] == "all":   
                redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['breakdown_dimension'], key, '', '', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                for redis_item in redis_result:
                    metric_value += redis_item['value']
                values.append([key, metric_value])
            elif params['scope_type'] == "nodes" or params['scope_type'] == "groups":
                node_list = []
                if params['scope_type'] == "nodes":
                    node_list = params['scopes']
                else:
                    groups = Group.objects.get(pk=params['scopes'][0]).nodes.all() 
                    for node in groups:
                        node_list.append(node.pk)
                # load from redis
                for node in node_list:
                    db_node = Node.objects.get(pk=node)
                    redis_result = get_redis_metric_data(params['table'], params['metrics'][0], params['breakdown_dimension'], key, db_node.ip_address, db_node.mac_address, int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))                    
                    for redis_item in redis_result:
                        metric_value += redis_item['value']
                values.append([key, metric_value])                        


        json_result.append({'key': 'dimension_distribution', 'values': values})      
                                                      
        duration = int(round(time.time() * 1000)) - time1;
        #print '=====================>>> get_dimension_distribution_data() duration time = %d <<<=====================' % (duration)

        return Response(json_result)

        
    def list(self, request):        
        # get params from request
        params = {}
        params['live'] = request.QUERY_PARAMS.get("live");
        params['metrics'] = []
        if request.QUERY_PARAMS.has_key('metrics') and len(request.QUERY_PARAMS.get('metrics').strip()) > 0:
            params['metrics'] = request.QUERY_PARAMS.get('metrics').strip().split(',')
        params['scope_type'] = request.QUERY_PARAMS.get('scope_type')
        params['breakdown_type'] = request.QUERY_PARAMS.get('breakdown_type')
        params['visualization'] = request.QUERY_PARAMS.get('visualization')
        params['value_type'] = "count"
        if request.QUERY_PARAMS.has_key('value_type') and len(request.QUERY_PARAMS.get('value_type').strip()) > 0:
            params['value_type'] = request.QUERY_PARAMS.get('value_type')
        
        length = 30
        from_time = 0
        to_time = 0
        if params['live'] == "true":
            params['length'] = request.QUERY_PARAMS.get('length')
            params['to_time'] = datetime.utcnow()
            params['from_time'] = params['to_time'] - timedelta(minutes=int(params['length']))                       
        else:
            params['length'] = (to_time - from_time) * 1.0 / 1000 / 60;
            params['from_time'] = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
            params['to_time'] = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
        params['table'] = "ts.sec"        
        if int(params['length']) >= (4 * 60):
            params['table'] = "ts.min"
        if int(params['length']) >= (2 * 24 * 60):
            params['table'] = "ts.hour"
            
        params['scopes'] = []
        if params['scope_type'] != 'all':
            params['scopes'] = request.QUERY_PARAMS.get('scopes').strip().split(',')
        
        params['breakdown_dimension'] = ""
        if params['breakdown_type'] == 'dimension':
            params['breakdown_dimension'] = request.QUERY_PARAMS.get('breakdown_dimension')
        
        params['filter_dimension'] = ""
        params['filter_dimension_key'] = ""
        if request.QUERY_PARAMS.has_key('filter_dimension'):
            params['filter_dimension'] = request.QUERY_PARAMS.get('filter_dimension')
            params['filter_dimension_key'] = request.QUERY_PARAMS.get('filter_dimension_key')
            
            
        if len(params['metrics']) == 0:
            return Response([])
        if params['breakdown_type'] == "metric":
            if params['visualization'] == "bardistribution" or params['visualization'] == "piedistribution":
                return self.get_metric_distribution_data(params)                
            else:
                return self.get_metric_trend_data(params)                            
        elif params['breakdown_type'] == "scope":
            if params['visualization'] == "bardistribution" or params['visualization'] == "piedistribution":
                return self.get_scope_distribution_data(params)
            else:    
                return self.get_scope_trend_data(params)
        elif params['breakdown_type'] == "dimension":
            if params['visualization'] == "bardistribution" or params['visualization'] == "piedistribution":
                return self.get_dimension_distribution_data(params)                
            else:
                return self.get_dimension_trend_data(params)
        return Response([])

class FlowDataViewSet(viewsets.ViewSet):
    """
    Get Flow data
    """                
    def list(self, request):   
        json_result = []     
        # get params from request
        params = {}
        params['live'] = request.QUERY_PARAMS.get("live")
        params['flow_id'] = request.QUERY_PARAMS.get("flow_id")
        params['type'] = request.QUERY_PARAMS.get("type")
        from_time = 0
        to_time = 0
        if params['live'] == "true":
            params['length'] = request.QUERY_PARAMS.get('length')
            params['to_time'] = datetime.utcnow()
            params['from_time'] = params['to_time'] - timedelta(minutes=int(params['length']))                       
        else:
            params['length'] = (to_time - from_time) * 1.0 / 1000 / 60;
            params['from_time'] = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
            params['to_time'] = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
        params['table'] = "ts.sec"        
        if int(params['length']) >= (4 * 60):
            params['table'] = "ts.min"
        if int(params['length']) >= (2 * 24 * 60):
            params['table'] = "ts.hour"
            
        if params['type'] == "throughput":
            values = []            
            redis_result = get_redis_flow_data(params['table'], params['flow_id'], 'req', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                values.append([1000 * redis_item['time'], redis_item['value']])            
            json_result.append({'key': 'Request', 'values': values})
            values = []
            redis_result = get_redis_flow_data(params['table'], params['flow_id'], 'rsp', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                values.append([1000 * redis_item['time'], redis_item['value']])            
            json_result.append({'key': 'Response', 'values': values})
        elif params['type'] == "rtt":
            values = []            
            redis_result = get_redis_flow_data(params['table'], params['flow_id'], 'rtt', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                values.append([1000 * redis_item['time'], redis_item['value']])            
            json_result.append({'key': 'rtt', 'values': values})
        elif params['type'] == "cpr":
            values = []            
            redis_result = get_redis_flow_data(params['table'], params['flow_id'], 'cpr', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                values.append([1000 * redis_item['time'], redis_item['value']])            
            json_result.append({'key': 'cpr', 'values': values})
        elif params['type'] == "ws":
            values = []            
            redis_result = get_redis_flow_data(params['table'], params['flow_id'], 'ws', int(params['from_time'].strftime('%s')), int(params['to_time'].strftime('%s')))
            for redis_item in redis_result:
                values.append([1000 * redis_item['time'], redis_item['value']])            
            json_result.append({'key': 'ws', 'values': values})
            
        return Response(json_result)
    
mongodb = MongoClient('localhost', 27017)
#print '*************************************'

class SessionViewSet(viewsets.ViewSet):
    """
    Get Session data
    """                
    def list(self, request):  
        json_result = {'total': 0, 'rows': []}
        pql_param = ''      
        session = mongodb.sodero.session
        keyword = request.QUERY_PARAMS.get('keyword')        
        from_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
        pql_param = pql_param + "create_time >= date('" + from_time.strftime("%Y-%m-%d %H:%M:%S") +  "')"        
        if request.QUERY_PARAMS.has_key('to'):
            to_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
            pql_param = pql_param + " and create_time <= date('" + to_time.strftime("%Y-%m-%d %H:%M:%S") +  "')"             
        pql_param = pql_param + " and protocol == '" + request.QUERY_PARAMS.get('protocol') + "'"
        if len(keyword) > 0:
            pql_param = pql_param + " and (" + keyword + ")"

        query_param = pql.find(pql_param)
             
        json_result['total'] = session.find(query_param).count()        
        limit = 15
        if request.QUERY_PARAMS.has_key('limit'): 
            limit = int(request.QUERY_PARAMS.get('limit').strip())
        offset = 1
        if request.QUERY_PARAMS.has_key('offset'):
            offset = int(request.QUERY_PARAMS.get('offset'))
        if offset < 1:
            offset = 1
        sort_field = 'create_time'
        if request.QUERY_PARAMS.has_key('sort'):
            sort_field = request.QUERY_PARAMS.get('sort')
        sort_order = pymongo.DESCENDING
        if request.QUERY_PARAMS.has_key('order'):
            if request.QUERY_PARAMS.get('order') == 'asc':
                sort_order = pymongo.ASCENDING
        session_results = session.find(query_param).sort(sort_field, sort_order).skip((offset - 1) * limit).limit(limit)
        index = 1
        for session in session_results:
            json_session = json.loads(json.dumps(session, default=json_util.default))
            json_session['sn'] = index + (offset - 1) * limit
            json_session['create_time'] = json_session['create_time']['$date']
            json_session['update_time'] = json_session['update_time']['$date']
            if json_session.has_key('expire_time'):
                json_session['expire_time'] = json_session['expire_time']['$date']
            json_result['rows'].append(json_session)
            index = index + 1
        return Response(json_result)    
    
class SessionProtocolViewSet(viewsets.ViewSet):
    """
    Get Session Protocol data
    """                
    def list(self, request):  
        agg_param = []      
        session = mongodb.sodero.session
        keyword = request.QUERY_PARAMS.get('keyword')        
        from_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
        if request.QUERY_PARAMS.has_key('to'):
            to_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
            agg_param = agg_param + [{'$match': {'$and': [{'create_time': {'$gte': from_time}}, {'create_time': {'$lte': to_time}}]}}]
        else:
            agg_param = agg_param + [{'$match': {'create_time': {'$gte': from_time}}}]
        if len(keyword) > 0:
            agg_param = agg_param + pql.match(keyword)
        agg_param = agg_param + pql.group(_id='protocol', count='sum(1)') 
        #print agg_param
        return Response(session.aggregate(agg_param))

class SessionDistributionViewSet(viewsets.ViewSet):
    """
    Get Session Distribution data
    """                
    def list(self, request):  
        json_result = []
        agg_param = []      
        session = mongodb.sodero.session
        keyword = request.QUERY_PARAMS.get('keyword')        
        from_epoch = int(request.QUERY_PARAMS.get('from')) / 1000.0
        from_time = datetime.fromtimestamp(from_epoch) 
        to_time = datetime.utcnow()
        to_epoch = time.mktime(to_time.timetuple())
        protocol = request.QUERY_PARAMS.get('protocol')
        if request.QUERY_PARAMS.has_key('to'):
            to_epoch = int(request.QUERY_PARAMS.get('to')) / 1000.0
            to_time = datetime.fromtimestamp(to_epoch)
            agg_param = agg_param + [{'$match': {'$and': [{'create_time': {'$gte': from_time}}, {'create_time': {'$lte': to_time}}, {'protocol': protocol}]}}]
        else:                       
            agg_param = agg_param + [{'$match': {'$and': [{'create_time': {'$gte': from_time}}, {'protocol': protocol}]}}]

        time_interval = 60 * 1000
        if (to_time - from_time) > timedelta(minutes = 4 * 60):
            time_interval = 5 * 60 * 1000
        if (to_time - from_time) > timedelta(minutes = 2 * 24 * 60):                
            time_interval = 60 * 60 * 1000
            
        if len(keyword) > 0:
            agg_param = agg_param + pql.match(keyword)
        agg_param = agg_param + pql.project(epoch='create_time - date(0)')            
        agg_param = agg_param + pql.project(time_point='epoch - (epoch % ' + str(time_interval) + ')')            
        agg_param = agg_param + pql.group(_id='time_point', count='sum(1)') 
        #print agg_param
        agg_result = session.aggregate(agg_param)
        agg_result = agg_result['result']
                
        from_epoch = int(from_epoch - (from_epoch % (time_interval / 1000)))
        to_epoch = int(to_epoch - (to_epoch % (time_interval / 1000)))         
        while from_epoch <= to_epoch:
            json_item = {'time': from_epoch * 1000, 'count': 0}
            for agg_item in agg_result:
                if agg_item['_id'] == from_epoch * 1000:
                    json_item['count'] = agg_item['count']
                    break
            json_result.append(json_item)                    
            from_epoch = from_epoch + (time_interval / 1000)
        return Response(json_result)
    
class SessionRankViewSet(viewsets.ViewSet):
    """
    Get Session Rank data
    """                
    def list(self, request): 
        json_result = [] 
        agg_param = []      
        session = mongodb.sodero.session
        protocol = request.QUERY_PARAMS.get('protocol')
        keyword = request.QUERY_PARAMS.get('keyword')        
        from_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('from')) / 1000.0)
        if request.QUERY_PARAMS.has_key('to'):
            to_time = datetime.fromtimestamp(int(request.QUERY_PARAMS.get('to')) / 1000.0)
            agg_param = agg_param + [{'$match': {'$and': [{'create_time': {'$gte': from_time}}, {'create_time': {'$lte': to_time}}, {'protocol': protocol}]}}]
        else:                       
            agg_param = agg_param + [{'$match': {'$and': [{'create_time': {'$gte': from_time}}, {'protocol': protocol}]}}]
        if len(keyword) > 0:
            agg_param = agg_param + pql.match(keyword)
            
        agg_param1 = agg_param + pql.group(_id='src_ip', count='sum(1)')
        agg_param1 = agg_param1 + pql.sort('-count')
        agg_param1 = agg_param1 + pql.limit(5)        
        json_result.append({'type': 'sources', 'rank': session.aggregate(agg_param1)['result']})
        
        agg_param2 = agg_param + pql.group(_id='dst_ip', count='sum(1)')
        agg_param2 = agg_param2 + pql.sort('-count')
        agg_param2 = agg_param2 + pql.limit(5)
        json_result.append({'type': 'targets', 'rank': session.aggregate(agg_param2)['result']})
            
        agg_param3 = agg_param + [{ '$project': { 'flow': { '$concat': [ "$src_ip", " - ", "$dst_ip" ] }}}]            
        agg_param3 = agg_param3 + pql.group(_id='flow', count='sum(1)')
        agg_param3 = agg_param3 + pql.sort('-count')
        agg_param3 = agg_param3 + pql.limit(5)
        json_result.append({'type': 'flows', 'rank': session.aggregate(agg_param3)['result']})        

        return Response(json_result)
