FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

#basic dependencies
#expect this to take >500 seconds
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    cmake \
    curl \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

#airsim dependencies 
RUN pip install numpy \
    tornado==4.5.3 \
    msgpack-rpc-python \
    backports.ssl-match-hostname


#airsim is special
#also >500 seconds
RUN pip install airsim --no-build-isolation

COPY . /app