FROM node:0.10-onbuild
#FROM iojs:onbuild

# this must have been why my docker instance was diverging (node's cron module on localtime)
RUN ln -sf /usr/share/zoneinfo/EST /etc/localtime

# replace this with your application's default port
#EXPOSE 8888
