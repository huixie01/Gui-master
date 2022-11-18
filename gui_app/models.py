from django.db import models

# *********************************************************************************
# System Admin Models
# *********************************************************************************

class Flow(models.Model):
    id = models.CharField(primary_key=True, max_length=60)    
    src_ip_address = models.IPAddressField()
    dst_ip_address = models.IPAddressField()
    dst_port = models.IntegerField()
    type = models.CharField(max_length=10)
    correlations = models.IntegerField()
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()
    expire_time = models.DateTimeField(db_index=True, null=True)    
    class Meta:
        db_table = "t_flow"
        unique_together = (("src_ip_address", "dst_ip_address", "dst_port", "type"),)            

# Dimension
class Dimension(models.Model):
    id = models.CharField(max_length=45, primary_key=True)
    name = models.CharField(max_length=45, null=True)
    class Meta:
        db_table = "t_dimension"

# Metric
class Metric(models.Model):
    id = models.CharField(max_length=45, primary_key=True)
    name = models.CharField(max_length=45, null=True)
    type = models.SmallIntegerField()
    unit = models.CharField(max_length=45)
    corr = models.BooleanField()
    dimensions = models.ManyToManyField(Dimension, through='MetricDimensions')    
    class Meta:
        db_table = "t_metric"    
                
# Metric Dimension relationships
class MetricDimensions(models.Model):
    metric = models.ForeignKey(Metric)
    dimension = models.ForeignKey(Dimension)
    class Meta:
        db_table = "t_metric_dimensions"
        
# Node
class Node(models.Model):
    id = models.CharField(primary_key=True, max_length=45)
    ip_address = models.IPAddressField(null=True, blank=True);
    vlan = models.SmallIntegerField(null=True, blank=True)
    mac_address = models.CharField(max_length=20)
    name = models.CharField(max_length=45)
    type = models.SmallIntegerField();
    vender = models.CharField(max_length=255, null=True, blank=True)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()
    expire_time = models.DateTimeField(null=True, blank=True)
    def __unicode__(self):
        return u'%s' % (self.name)        
    class Meta:
        db_table = "t_node"    
        
# Group
class Group(models.Model):
    name = models.CharField(max_length=45)
    description = models.CharField(max_length=255, null=True, blank=True)
    nodes = models.ManyToManyField(Node, through='GroupNodes', related_name='groups')
    order = models.IntegerField(null=True, blank=True)
    def __unicode__(self):
        return u'%s' % (self.name)        
    class Meta:
        db_table = "t_group"    
        
# Group Nodes 
class GroupNodes(models.Model):
    group = models.ForeignKey(Group);
    node = models.ForeignKey(Node); 
    order = models.IntegerField(null=True)
    class Meta:
        db_table = "t_group_nodes"    
        
# Group Filters 
class GroupFilters(models.Model):
    group = models.ForeignKey(Group);
    filter_type = models.SmallIntegerField()
    filter_value = models.CharField(max_length=255) 
    class Meta:
        db_table = "t_group_filters"    
        
# Application
class Application(models.Model):
    name = models.CharField(max_length=45)
    description = models.CharField(max_length=255, null=True, blank=True)
    flow_types = models.CharField(max_length=255, null=True, blank=True)
    nodes = models.ManyToManyField(Node, through='ApplicationNodes')
    groups = models.ManyToManyField(Group, through='ApplicationGroups')
    def __unicode__(self):
        return u'%s' % (self.name)        
    class Meta:        
        db_table = "t_application"    
        
# Application Nodes 
class ApplicationNodes(models.Model):
    application = models.ForeignKey(Application);
    node = models.ForeignKey(Node); 
    class Meta:
        db_table = "t_application_nodes"    
        
# Application Groups 
class ApplicationGroups(models.Model):
    application = models.ForeignKey(Application);
    group = models.ForeignKey(Group); 
    class Meta:
        db_table = "t_application_groups"    
        
# Base Model
class BaseModel(models.Model):
    node = models.ForeignKey(Node, null=True, blank=True)
    application = models.ForeignKey(Application, null=True, blank=True)
    flow = models.ForeignKey(Flow, null=True, blank=True)
    metric_id = models.CharField(db_index=True, max_length=45, null=True, blank=True)
    dimension_id = models.CharField(db_index=True, max_length=45, null=True, blank=True)
    dimension_key = models.CharField(db_index=True, max_length=255, null=True, blank=True)
    class Meta:
        abstract = True
        
# Alert
class Alert(BaseModel):
    name = models.CharField(max_length=45)
    severity = models.SmallIntegerField()
    priority = models.SmallIntegerField() 
    trigger_type = models.SmallIntegerField()
    operator = models.SmallIntegerField()
    operand = models.IntegerField()
    duration = models.IntegerField()
    event_groups = models.CharField(max_length=255, null=True, blank=True)
    email_addresses = models.CharField(max_length=255, null=True, blank=True)
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()        
    class Meta:
        db_table = "t_alert"    

class Plugin(models.Model):
    name = models.CharField(max_length=45)
    description = models.CharField(max_length=255, null=True, blank=True)    
    is_valid = models.BooleanField()
    is_debug = models.BooleanField()
    triggers = models.CharField(max_length=255)
    script = models.TextField()
    class Meta:
        db_table = "t_plugin"    

class PolicyPack(models.Model):
    name = models.CharField(max_length=45)
    description = models.CharField(max_length=255, null=True, blank=True)
    script = models.TextField()
    class Meta:
        db_table = "t_policy_pack"    
        
# *********************************************************************************
# GUI Models
# *********************************************************************************

# Event
class Event(BaseModel):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, null=True, blank=True)
    severity = models.SmallIntegerField()
    priority = models.SmallIntegerField()    
    count = models.IntegerField()
    source = models.SmallIntegerField()
    status = models.SmallIntegerField()
    alert = models.ForeignKey(Alert, null=True, blank=True)
    create_time = models.DateTimeField(db_index=True)
    update_time = models.DateTimeField(db_index=True)
    expire_time = models.DateTimeField(blank=True, null=True)
    class Meta:
        db_table = "t_event"    

# Dashboard            
class Dashboard(models.Model):
    name = models.CharField(max_length=45)
    class Meta:
        db_table = "t_dashboard"    

# Dashboard Widgets            
class DashboardWidgets(models.Model):
    dashboard = models.ForeignKey(Dashboard)
    col = models.IntegerField()
    row = models.IntegerField()
    sizex = models.IntegerField()
    sizey = models.IntegerField()
    type = models.SmallIntegerField()    
    script = models.TextField()       
    class Meta:
        db_table = "t_dashboard_widgets"    

# Report Category
class ReportCategory(models.Model):
    name = models.CharField(max_length=45)
    order = models.SmallIntegerField()
    def __unicode__(self):
        return u'%s' % (self.name)    
    class Meta:
        db_table = "t_report_category"
        
class Report(models.Model):
    report_category = models.ForeignKey(ReportCategory)
    order = models.SmallIntegerField()    
    name = models.CharField(max_length=45)
    is_default = models.BooleanField()
    def __unicode__(self):
        return u'%s' % (self.name)        
    class Meta:
        db_table = "t_report"    
        
class ReportPlots(models.Model):
    report = models.ForeignKey(Report)
    col = models.IntegerField()
    row = models.IntegerField()
    size_x = models.IntegerField()
    size_y = models.IntegerField()
    script = models.TextField()       
    class Meta:
        db_table = "t_report_plots"  
        
class Flowmap(models.Model):
    order = models.SmallIntegerField()    
    name = models.CharField(max_length=45)
    groups = models.ManyToManyField(Group, through='FlowmapGroups', related_name='flowmaps')       
    is_default = models.BooleanField()    
    description = models.CharField(max_length=255, null=True, blank=True)     
    def __unicode__(self):
        return u'%s' % (self.name)        
    class Meta:
        db_table = "t_flowmap"    
        
class FlowmapGroups(models.Model):
    flowmap = models.ForeignKey(Flowmap)
    group = models.ForeignKey(Group)  
    order = models.IntegerField(null=True)     
    class Meta:
        db_table = "t_flowmap_groups"                     
        
# *********************************************************************************
# Analysis and Data Models
# *********************************************************************************        
class MetricData(BaseModel):
    scope = models.SmallIntegerField(db_index=True)
    data_time = models.DateTimeField(db_index=True)
    count = models.BigIntegerField()
    min = models.BigIntegerField(null=True)
    max = models.BigIntegerField(null=True)
    sum = models.BigIntegerField(null=True)
    avg = models.BigIntegerField(null=True)
    class Meta:
        abstract = True

class MetricDataSec(MetricData):
    class Meta:
        db_table = "t_metric_data_sec"
        
class MetricDataMin(MetricData):
    class Meta:
        db_table = "t_metric_data_min"    

class MetricDataHour(MetricData):
    class Meta:
        db_table = "t_metric_data_hour"                

class BaselineData(BaseModel):
    data_offset = models.IntegerField()
    mean = models.FloatField()
    variance = models.FloatField()
    class Meta:
        db_table = "t_baseline_data"    

class Correlation(models.Model):    
    id = models.CharField(primary_key=True, max_length=80)    
    src = models.CharField(max_length=45)
    src_metric = models.CharField(max_length=45)
    dst = models.CharField(max_length=45)
    dst_metric = models.CharField(max_length=45)    
    fitness_score = models.FloatField()
    create_time = models.DateTimeField()
    update_time = models.DateTimeField()
    expire_time = models.DateTimeField(db_index=True, null=True)        
    class Meta:
        db_table = "t_correlation"
        unique_together = (("src", "src_metric", "dst", "dst_metric"),)            
        
            
class OUI(models.Model):
    oui = models.CharField(max_length=8, primary_key=True)
    name = models.CharField(max_length=45)
    description = models.CharField(max_length=255, null=True, blank=True)
    class Meta:
        db_table = "t_oui"    
        
# Alert
class SessionField(models.Model):
    name = models.CharField(max_length=45)   
    alias = models.CharField(max_length=45, null=True, blank=True)
    protocol = models.CharField(max_length=45)
    data_type = models.SmallIntegerField()
    display_type = models.SmallIntegerField()
    order = models.IntegerField()
    unit = models.CharField(max_length=45, null=True, blank=True)
    sortable = models.BooleanField();
    is_index = models.BooleanField();
    is_search_key = models.BooleanField();    
    class Meta:
        db_table = "t_session_field"    
        
        
        
