# Xyzen AI Agent Instructions

This document provides guidance for AI coding agents to effectively contribute to the Xyzen codebase.

## Architecture Overview

Xyzen is a full-stack AI laboratory server with a decoupled backend service and a React-based frontend.

- **Backend (`/service`)**: A FastAPI application that handles core logic, including WebSocket-based chat, integration with Large Language Models (LLMs) through various providers, and data persistence using PostgreSQL. It leverages LangChain/LangGraph for building conversational agents.
- **Frontend (`/web`)**: A React application providing the user interface for interacting with the AI chat functionalities. It's designed as a modern, extensible chat component.
- **Containerization (`/docker`)**: The project is fully containerized using Docker, which is the recommended way for setting up a development environment. The Docker setup includes the backend, frontend, a PostgreSQL database, Mosquitto (an MQTT broker), and Casdoor for authentication.

Key directories to be aware of:

- `service/app/main.py`: The main entry point for the FastAPI backend.
- `service/core/chat`: Contains the core chat logic, including LangChain/LangGraph integrations.
- `service/models`: Defines the SQLModel data models for database entities like sessions, topics, and messages.
- `service/repo`: The repository layer that abstracts database interactions.
- `web/src/main.tsx`: The main entry point for the React frontend.

## Development Workflow

The recommended development setup is using the containerized environment, which can be managed through shell scripts or a Makefile.

### Getting Started

To start the development environment, use the following commands in the project root:

- **On Unix/Linux/macOS**: `./launch/dev.sh`
- **On Windows (PowerShell)**: `.\launch\dev.ps1`
- **Using Makefile**: `make dev`

These commands will set up all the necessary services, including the database and other infrastructure components.

### Running Tests

The backend has a comprehensive test suite. To run the tests, navigate to the `service` directory and use the following commands:

- **Run all tests**: `uv run pytest`
- **Run tests with coverage**: `uv run pytest --cov=src --cov=examples --cov-report=html`

### Code Quality

The project uses `pre-commit` for code formatting, linting, and type-checking. Before submitting any changes, ensure that the code quality checks pass by running the following command in the `service` directory:

`uv run pre-commit run --all-files`

## Project-Specific Conventions

- **Backend**: The backend follows a standard FastAPI project structure. Business logic is separated into different modules under the `core` directory, and database interactions are handled by the `repo` layer.
- **Frontend**: The frontend is built with React and uses `zustand` for state management. The main component is `Xyzen`, which can be controlled through the `useXyzen` hook.
- **Database Migrations**: Database migrations are managed with Alembic. When you make changes to the SQLModel definitions in `service/models`, you will need to generate a new migration script.

## Integration Points

- **LLM Providers**: The backend can be configured to use different LLM providers like Azure OpenAI, OpenAI, Anthropic, and Google. The configuration is managed in `service/internal/configs/llm.py`.
- **Authentication**: Authentication is handled by Casdoor, which is set up as part of the containerized environment.
- **Real-time Communication**: WebSocket is used for real-time chat functionalities, and Mosquitto (MQTT broker) is available for other real-time messaging needs.
