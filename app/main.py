"""
Matching College Web Application Server.
Senior Full-Stack Architecture - FastAPI & Stitch UI/UX Integration.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.core.config import settings, STATIC_DIR
from app.api.students_router import router as students_router
from app.api.colleges_router import router as colleges_router
from app.api.matching_router import router as matching_router

app = FastAPI(
    title="Matching College Web Service",
    description="5D Holistic Admissions & Financial Aid Engine with Stitch UI/UX",
    version=settings.APP_VERSION,
)

# Mount static directory
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include API Routers
app.include_router(students_router)
app.include_router(colleges_router)
app.include_router(matching_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/")
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    return FileResponse(str(index_file))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
