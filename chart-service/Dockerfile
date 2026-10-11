FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt uvicorn[standard]

COPY src ./src
COPY main.py .

ENV PYTHONPATH=/app/src
EXPOSE 8765

CMD ["uvicorn", "chart_service.api:app", "--host", "0.0.0.0", "--port", "8765"]
