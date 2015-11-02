FROM node:4-onbuild

# this must have been why my docker instance was diverging (node's cron module on localtime)
# should be /usr/share/zoneinfo/Canada/Eastern not /usr/share/zoneinfo/EST
RUN ln -sf /usr/share/zoneinfo/Canada/Eastern /etc/localtime

# Run as daniel.daniel (1000.1000) to match cantors ids
RUN groupadd -r -g 1000 daniel && useradd -r -g daniel -u 1000 daniel
USER daniel

# replace this with your application's default port
#EXPOSE 8888

# Repeat thi to assign USER properly
CMD [ "npm", "start" ]
