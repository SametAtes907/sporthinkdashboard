# 1. Resmi Python tabanını alıyoruz (Python hazır geliyor)
FROM python:3.11-slim

# 2. Sunucuya Node.js kuruyoruz
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# 3. Ana çalışma klasörümüzü belirliyoruz
WORKDIR /app

# 4. Projedeki her şeyi sunucuya kopyalıyoruz
COPY . .

# 5. İnatçı Python kütüphanelerini ZORLA kuruyoruz
RUN pip install pandas openpyxl numpy

# 6. Frontend'in içine girip React projesini paketliyoruz
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# 7. Backend'e geçip Node modüllerini kuruyoruz
WORKDIR /app/backend
RUN npm install

# 8. Uygulamayı ateşliyoruz
EXPOSE 8080
CMD ["npm", "start"]