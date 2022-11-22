container_name=gui-hui1
image_name=img-gui-hui
gui_path=/root/hkang/GUI
engine_path=/root/hkang/AnalyticalEngine

build:
	docker build --rm=true -t ${image_name} .
run:
	docker run -it  -h ${container_name} --name  ${container_name}  \
			-v ${gui_path}:/root/GUI \
			-v ${engine_path}:/root/AnalyticalEngine \
			-v /root/hkang/GUI/deployment-docker/my.cnf:/etc/mysql/my.cnf \
			-p 9900:9900/tcp -p 9900:9900/udp \
			-p 8000:8000/tcp -p 8000:8000/udp \
			-p 80:80 -p 3306:3306 \
			-p 6379:6379 \
			-p 27017:27017 -p 28017:28017 \
			${image_name} /bin/bash
# 			--net=host \
			-p 9900:9900/tcp -p 9900:9900/udp \
			-p 8000:8000/tcp -p 8000:8000/udp \
			-p 80:80 -p 3306:3306 \
			-p 6379:6379 \
			-p 27017:27017 -p 28017:28017 \

daemon:
	docker run -d -h ${container_name} --name  ${container_name}  \
			-v /root/GUI:/root/GUI \
			-v my.cnf:/etc/mysql/my.cnf \
			-p 8000:8000/tcp -p 8000:8000/udp \
			-p 80:80 -p 3306:3306 \
			-p 6379:6379 \
			-p 27017:27017 -p 28017:28017 \
			sodero/gui
clean:
	docker rm -f ${container_name}
	docker rmi sodero/gui
