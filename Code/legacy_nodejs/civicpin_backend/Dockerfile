FROM node:18.18.1

WORKDIR /app

COPY package.json /app/package.json

RUN npm install

COPY . /app

EXPOSE 5030

CMD ["npm", "start"]



