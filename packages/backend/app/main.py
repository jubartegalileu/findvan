"""
FindVan Backend - FastAPI application entry point
Module 2: Database & Leads Management
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="FindVan API",
    description="OSINT + SDR Backend for School Transportation Lead Generation",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1"]
)


# ============================================================
# Health Check Endpoint
# ============================================================
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "findvan-backend",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": "FindVan API",
        "version": "1.0.0",
        "description": "OSINT + SDR Backend",
        "documentation": "/docs",
        "health": "/health"
    }


# ============================================================
# API Routes (Placeholder)
# ============================================================
# TODO: Import and include routers when implemented

# from .api import leads, scrapers, conversations, auth
# app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
# app.include_router(scrapers.router, prefix="/api/scraper", tags=["scraper"])
# app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


# ============================================================
# Startup & Shutdown Events
# ============================================================
@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("🚀 FindVan Backend starting...")
    # TODO: Initialize database connection
    # TODO: Initialize Redis connection
    # TODO: Initialize Celery worker
    logger.info("✅ Backend ready")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("⛔ FindVan Backend shutting down...")
    # TODO: Close database connection
    # TODO: Close Redis connection
    logger.info("✅ Shutdown complete")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
