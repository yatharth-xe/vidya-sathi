import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.database import engine, Base
from app.api import auth, student, teacher, classroom, assignment, agents

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

import logging
from fastapi.responses import JSONResponse

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logging.getLogger("uvicorn.error").error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# Mount Routers under API v1 prefix
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(student.router, prefix=settings.API_V1_STR)
app.include_router(teacher.router, prefix=settings.API_V1_STR)
app.include_router(classroom.router, prefix=settings.API_V1_STR)
app.include_router(assignment.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": settings.PROJECT_NAME, "docs": "/docs"}

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "database": "connected"
    }
