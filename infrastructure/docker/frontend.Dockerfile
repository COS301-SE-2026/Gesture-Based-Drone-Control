FROM node:20

WORKDIR /app

COPY ./apps/frontend/package*.json ./

RUN npm install

COPY ./apps/frontend .

CMD ["npm", "run", "dev", "--", "--host"]