from django.conf.urls import patterns, include, url
from django.views.generic import ListView
from django.contrib import admin
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.views import login,logout 

admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/', include('gui_app.urls')),    
    url(r'^login/$', login,  {'template_name': 'login.html'}),
    url(r'^logout/$', logout, {'template_name': 'login.html'}),
    url(r'^dashboard/$',
        login_required(ListView.as_view(queryset=[], template_name='dashboard.html'))),
    url(r'^reports/$',
        login_required(ListView.as_view(queryset=[], template_name='reports.html'))),
    url(r'^events/$',
        login_required(ListView.as_view(queryset=[], template_name='events.html'))),
    url(r'^analysis/$',
        login_required(ListView.as_view(queryset=[], template_name='analysis.html'))),
    url(r'^flowmap/$',
        login_required(ListView.as_view(queryset=[], template_name='flowmap.html'))),                       
    url(r'^alerts/$',
        login_required(ListView.as_view(queryset=[], template_name='alerts.html'))),
    url(r'^search/$',
        login_required(ListView.as_view(queryset=[], template_name='search.html'))),                                                                                                                                                                 
    url(r'^plugins/$',
        login_required(ListView.as_view(queryset=[], template_name='plugins.html'))),                                                                     
    url(r'^policypacks/$',
        login_required(ListView.as_view(queryset=[], template_name='policypacks.html'))),                                                                                                                                                                                        
)
