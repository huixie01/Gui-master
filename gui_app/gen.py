#!/usr/bin/python

"""generate simulative metric data
"""

import MySQLdb
import random
import time
from datetime import datetime, timedelta

METRIC_RANGE = {'l2.bytes': [200, 40], 
               'l2.frames': [500, 100],
               'l3.bytes': [150, 50],
               'l3.pkts': [300, 60]}

DIMENSION_RANGE = {'l2.type': {'arp': 0.1, 'IPv4': 0.5, 'IPv6': 0.1, 'mpls': 0.05, 'others': 0.25}, 
                   'l3.type': {'TCP': 0.7, 'UDP': 0.2, 'others': 0.1}}

METRIC_VALUE = {'sec_count': 0, 'min_count': 0, 'hour_count': 0}

class MetricDataGen:    
    def __init__ (self, host, user, password, database):
        """construct function"""
        print 'Process begin...'
        self.db = MySQLdb.connect(host, user, password, database)   
        self.cursor = self.db.cursor()   
        
        # initialize catch data
        self.groups = []
        self.nodes  = []
        self.apps   = []
        self.metrics = []
        self.dimensions = []

    def __del__(self):
        print "Process complete!"
        if self.db.open:
            self.db.close()
            
    def initialize(self):
        """load init data from database"""
        print 'Initialize begin...'        
        try:
            # query node data
            self.cursor.execute("SELECT id, name FROM t_node")
            results = self.cursor.fetchall()
            for row in results:
                self.nodes.append({'id': row[0], 'name': row[1]})
                
            # query app data
            self.cursor.execute("SELECT id, name FROM t_application")
            results = self.cursor.fetchall()
            for row in results:
                self.apps.append({'id': row[0], 'name': row[1]})
                
            # create metric data
            self.cursor.execute("SELECT id, type, unit FROM t_metric")
            results = self.cursor.fetchall()
            for row in results:
                self.metrics.append({'id': row[0], 'type': row[1], 'unit': row[2], 'dimensions': [], \
                                     'nodes_data': {}, 'apps_data': {}, 'all_data': {'reserve': METRIC_VALUE.copy()}})
                for node in self.nodes:
                    self.metrics[-1]['nodes_data'][node['id']] = {'reserve': METRIC_VALUE.copy()}
                for app in self.apps:
                    self.metrics[-1]['apps_data'][app['id']] = {'reserve': METRIC_VALUE.copy()}
            
            # create metric dimension data
            for metric in self.metrics:
                self.cursor.execute("SELECT dimension_id FROM t_metric_dimensions \
                                     WHERE metric_id = '%s'" % (metric['id']))
                results = self.cursor.fetchall()
                for row in results:
                    metric['dimensions'].append(row[0])
                    for node in self.nodes:
                        for key in DIMENSION_RANGE[row[0]].keys():
                            metric['nodes_data'][node['id']][row[0] + ':' + key] = METRIC_VALUE.copy()
                    for app in self.apps:
                        for key in DIMENSION_RANGE[row[0]].keys():
                            metric['apps_data'][app['id']][row[0] + ':' + key] = METRIC_VALUE.copy()
                    for key in DIMENSION_RANGE[row[0]]:
                        metric['all_data'][row[0] + ':' + key] = METRIC_VALUE.copy()
                                    
        except Exception as msg:
            print "Error: unable to initialize data: %s" % (msg.__str__())
            self.db.rollback()
            raise  
        
        print 'Initialize end'    
        return True         
    
    def start_generate(self):
        """generate data to database"""
        print 'Data generate begin...'
        # generate 
        try:
            last_sec_tick = datetime.utcnow() - timedelta(days=1)
            last_min_tick = last_sec_tick
            last_hour_tick = last_sec_tick
            while True:
                is_min = False
                is_hour = False
                now = datetime.utcnow().replace(microsecond=0)
                if (now.second == 0 or now.second == 30) and (now - timedelta(seconds=29) > last_sec_tick):
                    last_sec_tick = now                    
                    if (now.minute % 5 == 0) and (now - timedelta(minutes=4) > last_min_tick):
                        is_min = True
                        last_min_tick = now
                    if (now.minute == 0) and (now - timedelta(minutes=59) > last_hour_tick):
                        is_hour = True
                        last_hour_tick = now
                    self.generate_data(now, is_min, is_hour)
                time.sleep(1) 
        except Exception as msg:
            print "Error: unable to process data: %s" % (msg.__str__())
            self.db.rollback()
            raise  
        
        print 'Data generate end'
        return True
    
    def generate_data(self, time_tick, is_min, is_hour):
        """generate second data"""        
        
        for metric in self.metrics:
            total_value = 0
            # generate node data
            for node in self.nodes:
                if metric['type'] == 0: # count data
                    sum_value = metric['nodes_data'][node['id']]['reserve']['sec_count'] = METRIC_RANGE[metric['id']][0] \
                        + random.randint(0 - METRIC_RANGE[metric['id']][1], METRIC_RANGE[metric['id']][1])
                    metric['nodes_data'][node['id']]['reserve']['min_count'] += sum_value
                    metric['nodes_data'][node['id']]['reserve']['hour_count'] += sum_value
                    total_value += sum_value
                    for dimension in metric['dimensions']:
                        for key, value in DIMENSION_RANGE[dimension].items():
                            metric['nodes_data'][node['id']][dimension + ':' + key]['sec_count'] = sum_value * value
                            metric['nodes_data'][node['id']][dimension + ':' + key]['min_count'] += sum_value * value
                            metric['nodes_data'][node['id']][dimension + ':' + key]['hour_count'] += sum_value * value
                else:   # duration data
                    pass
                # generate all data
                if metric['type'] == 0: # count data
                    metric['all_data']['reserve']['sec_count'] = total_value
                    metric['all_data']['reserve']['min_count'] += total_value
                    metric['all_data']['reserve']['hour_count'] += total_value
                    for dimension in metric['dimensions']:
                        for key, value in DIMENSION_RANGE[dimension].items():
                            metric['all_data'][dimension + ':' + key]['sec_count'] = total_value * value  
                            metric['all_data'][dimension + ':' + key]['min_count'] += total_value * value
                            metric['all_data'][dimension + ':' + key]['hour_count'] += total_value * value
                else:
                    pass                  
            # generate application data
            for app in self.apps:
                if metric['type'] == 0: # count data
                    sum_value = metric['apps_data'][app['id']]['reserve']['sec_count'] = METRIC_RANGE[metric['id']][0] \
                        + random.randint(0 - METRIC_RANGE[metric['id']][1], METRIC_RANGE[metric['id']][1])
                    metric['apps_data'][app['id']]['reserve']['min_count'] += sum_value
                    metric['apps_data'][app['id']]['reserve']['hour_count'] += sum_value
                    for dimension in metric['dimensions']:
                        for key, value in DIMENSION_RANGE[dimension].items():
                            metric['apps_data'][app['id']][dimension + ':' + key]['sec_count'] = sum_value * value
                            metric['apps_data'][app['id']][dimension + ':' + key]['min_count'] += sum_value * value
                            metric['apps_data'][app['id']][dimension + ':' + key]['hour_count'] += sum_value * value
                else:   # duration data
                    pass

        # store second data into database
        sec_sql_count = 0    
        for metric in self.metrics:
            # insert all data
            if metric['type'] == 0:
                # reserve(all)
                self.cursor.execute("INSERT INTO `t_metric_data_sec`(`metric_id`, `scope`, `data_time`, `count`) \
                                VALUES ('%s', %d, '%s', %d)" % \
                                (metric['id'], 0, time_tick, int(metric['all_data']['reserve']['sec_count'])))
                sec_sql_count += 1
                # dimensions(all)
                for dimension in metric['dimensions']:
                    for key, value in DIMENSION_RANGE[dimension].items():
                        self.cursor.execute("INSERT INTO `t_metric_data_sec`(`metric_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                        VALUES ('%s', '%s', '%s', %d, '%s', %d)" % \
                                        (metric['id'], dimension, key, 0, time_tick, int(metric['all_data'][dimension + ':' + key]['sec_count'])))
                        sec_sql_count += 1   
                # insert node data                                                     
                for node in self.nodes:
                    # reserve(node)
                    self.cursor.execute("INSERT INTO `t_metric_data_sec`(`metric_id`, `node_id`, `scope`, `data_time`, `count`) \
                                    VALUES ('%s', %d,  %d, '%s', %d)" % \
                                    (metric['id'], node['id'], 1, time_tick, int(metric['nodes_data'][node['id']]['reserve']['sec_count'])))
                    sec_sql_count += 1
                    # dimensions(node)
                    for dimension in metric['dimensions']:
                        for key, value in DIMENSION_RANGE[dimension].items():
                            self.cursor.execute("INSERT INTO `t_metric_data_sec`(`metric_id`, `node_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                            VALUES ('%s', %d, '%s', '%s', %d, '%s', %d)" % \
                                            (metric['id'], node['id'], dimension, key, 1, time_tick, int(metric['nodes_data'][node['id']][dimension + ':' + key]['sec_count'])))
                            sec_sql_count += 1
                # insert app data
                for app in self.apps:
                    # reserve(app)
                    self.cursor.execute("INSERT INTO `t_metric_data_sec`(`metric_id`, `application_id`, `scope`, `data_time`, `count`) \
                                    VALUES ('%s', %d, %d, '%s', %d)" % \
                                    (metric['id'], app['id'], 2, time_tick, int(metric['apps_data'][app['id']]['reserve']['sec_count'])))
                    sec_sql_count += 1
                    # dimensions(app)
                    for dimension in metric['dimensions']:
                        for key, value in DIMENSION_RANGE[dimension].items():
                            self.cursor.execute("INSERT INTO `t_metric_data_sec`(`metric_id`, `application_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                            VALUES ('%s', %d, '%s', '%s', %d, '%s', %d)" % \
                                            (metric['id'], app['id'], dimension, key, 2, time_tick, int(metric['apps_data'][app['id']][dimension + ':' + key]['sec_count'])))
                            sec_sql_count += 1                
            else:
                pass                                

        # store minute data into database
        min_sql_count = 0    
        if is_min:
            for metric in self.metrics:
                # insert all data
                if metric['type'] == 0:
                    # reserve(all)
                    self.cursor.execute("INSERT INTO `t_metric_data_min`(`metric_id`, `scope`, `data_time`, `count`) \
                                    VALUES ('%s', %d, '%s', %d)" % \
                                    (metric['id'], 0, time_tick, int(metric['all_data']['reserve']['min_count'])))
                    metric['all_data']['reserve']['min_count'] = 0
                    min_sql_count += 1
                    # dimensions(all)
                    for dimension in metric['dimensions']:
                        for key, value in DIMENSION_RANGE[dimension].items():
                            self.cursor.execute("INSERT INTO `t_metric_data_min`(`metric_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                            VALUES ('%s', '%s', '%s', %d, '%s', %d)" % \
                                            (metric['id'], dimension, key, 0, time_tick, int(metric['all_data'][dimension + ':' + key]['min_count'])))
                            metric['all_data'][dimension + ':' + key]['min_count'] = 0
                            min_sql_count += 1   
                    # insert node data                                                     
                    for node in self.nodes:
                        # reserve(node)
                        self.cursor.execute("INSERT INTO `t_metric_data_min`(`metric_id`, `node_id`, `scope`, `data_time`, `count`) \
                                        VALUES ('%s', %d,  %d, '%s', %d)" % \
                                        (metric['id'], node['id'], 1, time_tick, int(metric['nodes_data'][node['id']]['reserve']['min_count'])))
                        metric['nodes_data'][node['id']]['reserve']['min_count'] = 0
                        min_sql_count += 1
                        # dimensions(node)
                        for dimension in metric['dimensions']:
                            for key, value in DIMENSION_RANGE[dimension].items():
                                self.cursor.execute("INSERT INTO `t_metric_data_min`(`metric_id`, `node_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                                VALUES ('%s', %d, '%s', '%s', %d, '%s', %d)" % \
                                                (metric['id'], node['id'], dimension, key, 1, time_tick, int(metric['nodes_data'][node['id']][dimension + ':' + key]['min_count'])))
                                metric['nodes_data'][node['id']][dimension + ':' + key]['min_count'] = 0
                                min_sql_count += 1
                    # insert app data
                    for app in self.apps:
                        # reserve(app)
                        self.cursor.execute("INSERT INTO `t_metric_data_min`(`metric_id`, `application_id`, `scope`, `data_time`, `count`) \
                                        VALUES ('%s', %d, %d, '%s', %d)" % \
                                        (metric['id'], app['id'], 2, time_tick, int(metric['apps_data'][app['id']]['reserve']['min_count'])))
                        metric['apps_data'][app['id']]['reserve']['min_count'] = 0
                        min_sql_count += 1
                        # dimensions(app)
                        for dimension in metric['dimensions']:
                            for key, value in DIMENSION_RANGE[dimension].items():
                                self.cursor.execute("INSERT INTO `t_metric_data_min`(`metric_id`, `application_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                                VALUES ('%s', %d, '%s', '%s', %d, '%s', %d)" % \
                                                (metric['id'], app['id'], dimension, key, 2, time_tick, int(metric['apps_data'][app['id']][dimension + ':' + key]['min_count'])))
                                metric['apps_data'][app['id']][dimension + ':' + key]['min_count'] = 0
                                min_sql_count += 1                
                else:
                    pass                                

        # store hour data into database
        hour_sql_count = 0    
        if is_hour:
            for metric in self.metrics:
                # insert all data
                if metric['type'] == 0:
                    # reserve(all)
                    self.cursor.execute("INSERT INTO `t_metric_data_hour`(`metric_id`, `scope`, `data_time`, `count`) \
                                    VALUES ('%s', %d, '%s', %d)" % \
                                    (metric['id'], 0, time_tick, int(metric['all_data']['reserve']['hour_count'])))
                    metric['all_data']['reserve']['hour_count'] = 0
                    hour_sql_count += 1
                    # dimensions(all)
                    for dimension in metric['dimensions']:
                        for key, value in DIMENSION_RANGE[dimension].items():
                            self.cursor.execute("INSERT INTO `t_metric_data_hour`(`metric_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                            VALUES ('%s', '%s', '%s', %d, '%s', %d)" % \
                                            (metric['id'], dimension, key, 0, time_tick, int(metric['all_data'][dimension + ':' + key]['hour_count'])))
                            metric['all_data'][dimension + ':' + key]['hour_count'] = 0
                            hour_sql_count += 1   
                    # insert node data                                                     
                    for node in self.nodes:
                        # reserve(node)
                        self.cursor.execute("INSERT INTO `t_metric_data_hour`(`metric_id`, `node_id`, `scope`, `data_time`, `count`) \
                                        VALUES ('%s', %d,  %d, '%s', %d)" % \
                                        (metric['id'], node['id'], 1, time_tick, int(metric['nodes_data'][node['id']]['reserve']['hour_count'])))
                        metric['nodes_data'][node['id']]['reserve']['hour_count'] = 0
                        hour_sql_count += 1
                        # dimensions(node)
                        for dimension in metric['dimensions']:
                            for key, value in DIMENSION_RANGE[dimension].items():
                                self.cursor.execute("INSERT INTO `t_metric_data_hour`(`metric_id`, `node_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                                VALUES ('%s', %d, '%s', '%s', %d, '%s', %d)" % \
                                                (metric['id'], node['id'], dimension, key, 1, time_tick, int(metric['nodes_data'][node['id']][dimension + ':' + key]['hour_count'])))
                                metric['nodes_data'][node['id']][dimension + ':' + key]['hour_count'] = 0
                                hour_sql_count += 1
                    # insert app data
                    for app in self.apps:
                        # reserve(app)
                        self.cursor.execute("INSERT INTO `t_metric_data_hour`(`metric_id`, `application_id`, `scope`, `data_time`, `count`) \
                                        VALUES ('%s', %d, %d, '%s', %d)" % \
                                        (metric['id'], app['id'], 2, time_tick, int(metric['apps_data'][app['id']]['reserve']['hour_count'])))
                        metric['apps_data'][app['id']]['reserve']['hour_count'] = 0
                        hour_sql_count += 1
                        # dimensions(app)
                        for dimension in metric['dimensions']:
                            for key, value in DIMENSION_RANGE[dimension].items():
                                self.cursor.execute("INSERT INTO `t_metric_data_hour`(`metric_id`, `application_id`, `dimension_id`, `dimension_key`, `scope`, `data_time`, `count`) \
                                                VALUES ('%s', %d, '%s', '%s', %d, '%s', %d)" % \
                                                (metric['id'], app['id'], dimension, key, 2, time_tick, int(metric['apps_data'][app['id']][dimension + ':' + key]['hour_count'])))
                                metric['apps_data'][app['id']][dimension + ':' + key]['hour_count'] = 0
                                hour_sql_count += 1                
                else:
                    pass                                
             
        # Commit to database
        self.db.commit()
        
        print "[%s] = %d = Second, = %d = Minute, = %d = Hour records inserted" % (time_tick, sec_sql_count, min_sql_count, hour_sql_count)            
            
                        
if __name__ == '__main__' :
    metricDataGen = MetricDataGen("localhost", 'root', '123456', 'sodero')
    metricDataGen.initialize()
    metricDataGen.start_generate()        
    del(metricDataGen)
    
