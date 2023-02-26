FROM node:14-alpine
WORKDIR /usr/src/app
COPY src .
RUN npm i

RUN apk add  --no-cache ffmpeg

ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

RUN pip3 install --no-cache replicate

CMD [ "npm", "start" ]
