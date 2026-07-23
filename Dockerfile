# Dockerfile untuk aplikasi Penilaian Lomba Lovebird (Express + Socket.io)
FROM node:20-alpine

WORKDIR /app

# Copy file dependency dulu supaya cache Docker lebih efisien
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy sisa source code aplikasi
COPY . .

# Port yang dipakai server.js (via process.env.PORT, fallback 3000)
EXPOSE 3000

CMD ["node", "server.js"]
