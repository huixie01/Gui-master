#!/usr/bin/python

"""load config file and perform stress test for gui urls
"""

import json
import urllib
import urllib2
#from lxml import html
import cookielib
from urllib2 import Request, urlopen, URLError, HTTPError
import random
import time
import ConfigParser
import threading
from datetime import datetime, timedelta
from HTMLParser import HTMLParser

exitapp = False

class TestHTMLParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.recording = False 
        self.csrf = ''
        
    def handle_starttag(self, tag, attrs):
        self.recording = False
        if tag == 'input':
            csrf = ''
            is_csrf = False
            for name, value in attrs:
                if name == 'value':
                    csrf = value                
                if name == 'name' and value == 'csrfmiddlewaretoken':
                    is_csrf = True                    
            if is_csrf:
                self.csrf = csrf                

class TestThread (threading.Thread):
    def __init__(self, test_name, options):
        threading.Thread.__init__(self)
        self.name = test_name
        self.options = options
        
    def run(self):
        while not exitapp:
            duration = 0
            code = 0    
            length = 0    
            msg = ''
            start_time = int(round(time.time() * 1000))                            
            try:
                req = urllib2.Request(self.options['URL'])
                if self.options.has_key('DATA') and len(self.options['DATA']) > 0:
                    req = urllib2.Request(self.options['URL'], urllib.urlencode(json.loads(self.options['DATA'])))
                response = urllib2.urlopen(req)
                code = response.getcode()                                
                length = len(response.read())
            except URLError, e:
                msg = e.reason
                code = e.code
            duration = int(round(time.time() * 1000)) - start_time;
            print '[%s] >> %s << duration: %d, length: %d, code: %d, msg: %s' \
                % (datetime.now().strftime("%Y-%M-%D %H:%m:%s"), self.options['URL'], duration, length, code, msg)
            # sleep a while
            interval = 1000
            if self.options.has_key('INTERVAL'):
                scope = self.options['INTERVAL'].split('-')
                interval = random.randint(int(scope[0]), int(scope[1]))
            time.sleep(interval * 1.00 / 1000.00)
        
class StressTest:    
    def __init__ (self, config_file):
        """construct function"""
        print 'Stress test begin...'
        self.config_file = config_file

    def __del__(self):
        print "Stress test complete!"
            
    def load_config(self):
        """load config into memory"""        
        try:
            self.config = ConfigParser.ConfigParser()
            self.config.read(self.config_file)
        except Exception as msg:
            print "Error: unable to load config from file: %s, error: %s " % (self.config_file, msg.__str__())
            return False
        return True         
    
    def start_test(self):
        """perform stress test"""
        # login into 
        for section in self.config.sections():
            if section.strip().upper() == 'LOGIN':
                try:
                    cj = cookielib.CookieJar()                    
                    opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(cj))
                    login_form = opener.open(self.config.get(section, "URL").strip()).read()
                    
                    
                    parser = TestHTMLParser()
                    parser.feed(login_form)

                    values = json.loads(self.config.get(section, "DATA").strip())
                    values['csrfmiddlewaretoken'] = parser.csrf
                    
                    opener.addheaders = [('User-agent',
                                          ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) '
                                           'AppleWebKit/535.1 (KHTML, like Gecko) '
                                           'Chrome/13.0.782.13 Safari/535.1'))]
    
                    urllib2.install_opener(opener)
                    req = urllib2.Request(self.config.get(section, "URL").strip(), 
                                          urllib.urlencode(values))
    
                    # Make the request and read the response
                    resp = urllib2.urlopen(req)
                    
                    contents = resp.read()    
                                
                except URLError, e:
                    print e.reason
                    raise                
                                
        for section in self.config.sections():
            if section.strip().upper() != 'LOGIN':
                options = {}
                for option in self.config.options(section): 
                    options[option.strip().upper()] = self.config.get(section, option).strip()
                thread = TestThread(section, options)
                thread.daemon = True
                thread.start()
            
        while True:
            time.sleep(1)
                            
if __name__ == '__main__' :
    stressTest = StressTest("stress.cfg")
    if stressTest.load_config():
        stressTest.start_test()
    del(stressTest)
    
