FROM ngrok/ngrok:latest AS ngrok
FROM python:3.9-slim

# Copiar ngrok desde la imagen de ngrok
COPY --from=ngrok /bin/ngrok /bin/ngrok

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY .env.example .env

EXPOSE 5001

CMD ["sh", "-c", "python app.py & ngrok http 5001"]
