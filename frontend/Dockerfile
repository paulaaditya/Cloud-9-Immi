FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json ./

RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
