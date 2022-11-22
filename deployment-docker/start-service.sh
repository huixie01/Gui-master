#! /bin/bash
set -eu

status () {
    echo "----> ${@}" >&2
}

# start mysql server

if [ ! -e /var/lib/mysql/bootstrapped ]; then
    status "Bootstrapping MySQL"
    service mysql start
    sleep 2
    mysqladmin -u root password "123456"
    echo "create database sodero" | mysql -u root -p123456
    mysql -u root -p123456 sodero < /root/GUI/db.sql
    
    GRANT="GRANT ALL ON *.* TO 'root'@'%' IDENTIFIED BY '123456';"
    echo "$GRANT" | mysql -uroot -p123456 mysql

    sleep 1
    touch /var/lib/mysql/bootstrapped

    status "MySQL started"
else
    service mysql start
    status "starting mysql from already boostrapped MySQL"
fi


# start mongo db
echo "----> start mongo db"
mongod --smallfiles &

# start redis server
echo "----> start redis server"
redis-server &

sleep 1

# start GUI
echo "----> start analygic engine GUI"
cd /root/GUI; python manage.py runserver gui1:8000
