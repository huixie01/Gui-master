FROM ubuntu:14.04 

RUN apt-get update -y

# for analytic engine
RUN apt-get install -y autoconf \
		   gcc \
		   make \
		   automake \
		   libtool \
		   libhiredis-dev \
		   libmysqlclient-dev \
		   libgsl0ldbl libgsl0-dev \
		   git \
		   wget \
		   google-mock libgtest-dev \
		   mysql-client \
		   g++




RUN wget http://sourceforge.net/projects/boost/files/boost/1.56.0/boost_1_56_0.tar.gz
RUN tar xvzf /boost_1_56_0.tar.gz
RUN mv /boost_1_56_0 /usr/local/

ADD AnalyticalEngine.cfg /root/AnalyticalEngine.cfg

# for GUI
RUN apt-get install -y git \
		   wget \
		   emacs \
		   python-django \
		   python-pip \
		   python-mysqldb

RUN pip install djangorestframework pymongo pql

RUN apt-get install -y apache2

EXPOSE 8000 80

RUN pip install redis \
    		django-rest-framework-nested-resource \
		drf-nested-routers

RUN apt-get install -y screen
RUN apt-get install -y mysql-server

# Install mongodb
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
RUN echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
RUN apt-get update -y
RUN apt-get install -y mongodb-org
RUN rm -rf /var/lib/apt/lists/*
VOLUME ["/data/db"]

EXPOSE 27017
EXPOSE 28017

# Install redis server
RUN wget http://download.redis.io/releases/redis-2.8.19.tar.gz
RUN tar xvzf redis-2.8.19.tar.gz 
RUN make -C /redis-2.8.19 \
    && make -C /redis-2.8.19 install


EXPOSE 6379
EXPOSE 3306

ADD start-service.sh /start-service.sh
ADD my.cnf	     /etc/mysql/my.cnf

CMD ["/start-service.sh"]

# Install mongodb c++ driver
# RUN wget http://downloads.mongodb.org/cxx-driver/mongodb-linux-x86_64-2.4.12.tgz
RUN git clone https://github.com/mongodb/mongo-cxx-driver.git

RUN apt-get update -y
RUN apt-get install -y scons \
		   libboost-thread-dev \
		   libboost-filesystem-dev \
		   libboost-system-dev \
		   libboost-all-dev \
		   libpcre++-dev

# RUN tar xvf /mongodb-linux-x86_64-2.4.12.tgz
# WORKDIR /mongo-cxx-driver-v2.4
# RUN scons
# RUN cp -ra src/mongo /usr/local/include/
# RUN cp libmongoclient.a  /usr/lib/

# use the git clone version of mongodb c++ driver
WORKDIR /mongo-cxx-driver
RUN git checkout legacy

RUN scons CXXFLAGS="-std=c++0x" install
RUN cp -ra build/install/include/mongo /usr/local/include/
RUN cp build/install/lib/libmongoclient.a /usr/local/lib/
# cd /boost
# ./bootstrap.sh
# ./b2 install
# 

# scons --prefix /usr/local --full install
WORKDIR /root

RUN apt-get install -y openssh-server
RUN mkdir /var/run/sshd

RUN echo 'root:root' |chpasswd

RUN sed -ri 's/^PermitRootLogin\s+.*/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -ri 's/UsePAM yes/#UsePAM yes/g' /etc/ssh/sshd_config

EXPOSE 22
