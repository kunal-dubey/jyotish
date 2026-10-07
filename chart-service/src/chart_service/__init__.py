def main() -> None:
    import uvicorn

    uvicorn.run("chart_service.api:app", host="127.0.0.1", port=8765)
