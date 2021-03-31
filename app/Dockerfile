FROM node:alpine

WORKDIR /app
COPY ./package.json .
RUN apk update
RUN npm install -g nodemon
RUN npm install
COPY . .

CMD ["npm", "run", "start"]