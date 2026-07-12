FROM python:3.12-slim

WORKDIR /app

# ffmpeg necesario para que yt-dlp procese vídeo/audio correctamente
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot.py downloader.py ./

CMD ["python", "bot.py"]
