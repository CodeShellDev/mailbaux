FROM node:alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8070

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

USER node

EXPOSE 8070

CMD ["node", "./src/app.js"]