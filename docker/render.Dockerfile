# Image every workflow job runs in: the official Playwright image (Chromium
# and its system libraries) plus ffmpeg, git and Python from Ubuntu's own
# packages, so runners never wait on apt mirrors.
# Keep the tag equal to the playwright version in package.json; image.yml
# rebuilds this when either changes.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg git python3 python3-venv python3-pip curl ca-certificates unzip \
 && rm -rf /var/lib/apt/lists/*

LABEL org.opencontainers.image.source="https://github.com/al-writer/lyric-motion-studio"
LABEL org.opencontainers.image.description="Lyric Motion Studio render image: Playwright + ffmpeg + Python"
