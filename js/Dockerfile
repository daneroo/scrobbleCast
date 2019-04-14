FROM node:11

# this must have been why my docker instance was diverging (node's cron module on localtime)
# should be /usr/share/zoneinfo/Canada/Eastern not /usr/share/zoneinfo/EST
RUN ln -sf /usr/share/zoneinfo/Canada/Eastern /etc/localtime

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock*.json /usr/src/app/
RUN npm ci
COPY . /usr/src/app

# TODO:daneroo run as non root user

# Default port
EXPOSE 8000

# Repeat this to assign USER properly
CMD [ "npm", "start" ]
