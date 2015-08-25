FROM node:0.10-onbuild
#FROM iojs:onbuild

# this must have been why my docker instance was diverging (node's cron module on localtime)
# should be /usr/share/zoneinfo/Canada/Eastern not /usr/share/zoneinfo/EST
RUN ln -sf /usr/share/zoneinfo/Canada/Eastern /etc/localtime

# replace this with your application's default port
#EXPOSE 8888
