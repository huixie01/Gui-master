from rest_framework import serializers
from gui_app.models import *
from rest_framework.pagination import PaginationSerializer

####### Config #######
class NodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node        

class ReportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportCategory
        #fields = ('id', 'name', 'rack', 'ip_address', 'mac_address', 'status')

class SessionFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionField
        
class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report        

class FlowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flow   
        
class PaginatedFlowSerializer(PaginationSerializer):
    """
    Serializes page objects of flow querysets.
    """
    class Meta:
        object_serializer_class = FlowSerializer                 
        
class ReportPlotsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportPlots        
        
class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        
class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event                   
        
class PaginatedEventSerializer(PaginationSerializer):
    """
    Serializes page objects of event querysets.
    """
    class Meta:
        object_serializer_class = EventSerializer    
        
class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert   

class NodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node   

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group   

class GroupNodesSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupNodes
        
class FlowmapSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flowmap   

class FlowmapGroupsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlowmapGroups   
           
                                 