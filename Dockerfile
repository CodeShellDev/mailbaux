FROM node:latest

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8070

COPY . .

RUN npm install

EXPOSE 8070

CMD ["npm", "start", "-s"]
