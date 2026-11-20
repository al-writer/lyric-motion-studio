# The studio as an image: every workflow job runs in it, so a project
# repository pins one version (ghcr.io/al-writer/lyric-motion-studio/render:vX.Y.Z)
# and gets that engine, those tools and their dependencies, with nothing to install.
#
#   /studio      the studio (engine, tools, schema) with node_modules
#   /opt/venv    Python with tools/prepare.py's requirements (on PATH)
#
# Base: the official Playwright image (Chromium and its libraries). Keep its
# tag equal to the playwright version in package.json (image builds check it).
FROM mcr.microsoft.com/playwright:v1.63.0-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg git python3 python3-venv python3-pip curl ca-certificates unzip \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /studio/requirements.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /studio/requirements.txt pytest
ENV PATH=/opt/venv/bin:$PATH

WORKDIR /studio
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force
COPY . .
RUN node -e "require('playwright'); require('vite')" && ffmpeg -hide_banner -encoders | grep -q libx265

ENV LMS_STUDIO=/studio
LABEL org.opencontainers.image.source="https://github.com/al-writer/lyric-motion-studio"
LABEL org.opencontainers.image.description="Lyric Motion Studio: engine, tools, Playwright, ffmpeg, Python"
