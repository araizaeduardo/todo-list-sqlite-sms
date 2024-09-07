# Usa una imagen base de Python
FROM python:3.9-slim

# Instala ngrok
RUN apt-get update && apt-get install -y wget unzip \
    && wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    && tar xvzf ngrok-v3-stable-linux-amd64.tgz -C /usr/local/bin \
    && rm ngrok-v3-stable-linux-amd64.tgz

# Establece el directorio de trabajo en el contenedor
WORKDIR /app

# Copia los archivos de requisitos primero para aprovechar la caché de Docker
COPY requirements.txt .

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código de la aplicación
COPY . .

# Copia el archivo .env
COPY .env .

# Expone el puerto en el que se ejecutará la aplicación
EXPOSE 5001

# Copia el script de inicio
COPY start.sh .
RUN chmod +x start.sh

# Comando para ejecutar el script de inicio
CMD ["./start.sh"]
