from django.conf.urls import patterns, include, url 
from gui_app.views import *
from rest_framework_nested import routers

# Create a router and register our viewsets with it.
#router = DefaultRouter(trailing_slash=False)
router = routers.SimpleRouter(trailing_slash=False)
#router = SimpleRouter(trailing_slash=False)
####### Config #######
router.register(r'scopes', ScopeViewSet, 'scope-list')
router.register(r'report_categorys', ReportCategoryViewSet)
router.register(r'reports', ReportViewSet, 'report-list')
router.register(r'report_plots', ReportPlotsViewSet, 'reportplots-list')
router.register(r'metrics', MetricViewSet)
router.register(r'metric_data', MetricDataViewSet, 'metricdata-list')
router.register(r'wrapupflows', WrapupFlowViewSet, 'wrapflow-list')
router.register(r'flow_data', FlowDataViewSet, 'flowdata-list')
router.register(r'events', EventViewSet, 'event-list')
router.register(r'session_fields', SessionFieldViewSet, 'sessionfield-list')
router.register(r'alerts', AlertViewSet)
router.register(r'nodes', NodeViewSet)
router.register(r'flowmap', FlowmapViewSet)
router.register(r'wrapup_flowmaps', WrapupFlowmapViewSet, 'wrapupflowmap')
router.register(r'wrapup_flowmaps', WrapupFlowmapViewSet, 'wrapupflowmap')
router.register(r'ranks', RankViewSet, 'rank')
router.register(r'flow_traffic_history', FlowTrafficHistoryViewSet, 'flow-traffic-history')
router.register(r'topology', TopologyViewSet, 'topology')
router.register(r'sessions', SessionViewSet, 'session-list')
router.register(r'session_protocols', SessionProtocolViewSet, 'sessionprotocol')
router.register(r'session_distribution', SessionDistributionViewSet, 'sessiondistribution')
router.register(r'session_ranks', SessionRankViewSet, 'sessionrank')

router.register(r'groups', GroupViewSet)
groups_router = routers.NestedSimpleRouter(router, r'groups', lookup='group', trailing_slash=False)
groups_router.register(r'nodes', NestedNodeViewSet)

router.register(r'flowmaps', FlowmapViewSet)
flowmaps_router = routers.NestedSimpleRouter(router, r'flowmaps', lookup='flowmap', trailing_slash=False)
flowmaps_router.register(r'groups', NestedGroupViewSet)


# The API URLs are now determined automatically by the router.
# Additionally, we include the login URLs for the browseable API.
urlpatterns = patterns('',
    url(r'^', include(router.urls)),
    url(r'^', include(groups_router.urls)),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework'))
)
