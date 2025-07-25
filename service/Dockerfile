# Use the official Python image as a base
FROM registry.scienceol.tech/library/python:3.13.5-alpine

RUN apk add --no-cache ca-certificates

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV TZ=Asia/Shanghai
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

ADD . /app

# Install dependencies
RUN uv sync --locked

EXPOSE 48200

CMD ["uv", "run", "python", "-m", "cmd.main"]
