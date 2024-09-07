#!/bin/bash

# Configura ngrok
echo "authtoken: $NGROK_AUTHTOKEN" > /root/.ngrok2/ngrok.yml

# Inicia ngrok en segundo plano
ngrok http 5001 &

# Espera a que ngrok esté listo
sleep 5

# Obtiene la URL pública de ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "Ngrok URL: $NGROK_URL"

# Inicia la aplicación Flask
python app.py