from cmath import cos
from math import radians
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from typing import List, Optional
import os
import shutil
from datetime import datetime
import imghdr
from dotenv import load_dotenv
import uuid
from pymongo.server_api import ServerApi

load_dotenv()

MONGO_URI ="mongodb+srv://pdhruvi873:aGAlM6wWNTKpA3WG@cluster0.uett0ky.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set. Please set it in your .env file.")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
HOST_URL = os.getenv("HOST_URL", "http://localhost:8000")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 5 * 1024 * 1024))  
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_database():
    """Get MongoDB database connection."""
    try:
        client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
        client.admin.command('ping')
        db = client["smart_image_db"]
        return db
    except ConnectionFailure as e:
        print(f"MongoDB connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

app = FastAPI(title="Smart Image Gallery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def is_valid_image(file_content):
    """Check if the file is a valid image."""
    image_type = imghdr.what(None, file_content)
    return image_type is not None

@app.get("/")
async def root():
    """API root endpoint."""
    return {"message": "Smart Image Gallery API is running"}

@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...), 
    latitude: float = Form(...), 
    longitude: float = Form(...),
    description: Optional[str] = Form(None),
    db = Depends(get_database)
):
    """Upload an image with geo-location data."""
    try:
        contents = await file.read()

        if not is_valid_image(contents):
            raise HTTPException(status_code=400, detail="File is not a valid image")

        if len(contents) > MAX_FILE_SIZE:
            max_size_mb = MAX_FILE_SIZE / (1024 * 1024)
            raise HTTPException(status_code=400, detail=f"File size exceeds the limit ({max_size_mb}MB)")

        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{file_extension}"
        filepath = os.path.join(UPLOAD_DIR, unique_filename)

        with open(filepath, "wb") as f:
            f.write(contents)

        url = f"{HOST_URL}/static/{unique_filename}"

        image_data = {
            "filename": unique_filename,
            "original_filename": file.filename,
            "url": url,
            "latitude": latitude,
            "longitude": longitude,
            "description": description,
            "uploaded_at": datetime.now(),
            "file_size": len(contents),
            "content_type": file.content_type
        }
        
        result = db.images.insert_one(image_data)
        
        return JSONResponse({
            "status": "success",
            "message": "Image uploaded successfully",
            "url": url,
            "id": str(result.inserted_id)
        })
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/images", response_model=List[dict])
async def get_images(skip: int = 0, limit: int = 100, db = Depends(get_database)):
    """Get all images with pagination."""
    try:
        cursor = db.images.find({}, {"_id": 0}).sort("uploaded_at", -1).skip(skip).limit(limit)
        images = list(cursor)
        return images
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve images: {str(e)}")

@app.get("/images/nearby")
async def get_nearby_images(
    latitude: float, 
    longitude: float, 
    max_distance: float = 10.0,
    db = Depends(get_database)
):
    """Get images near a specific location."""
    try:
        max_lat_diff = max_distance / 111.0
        max_lon_diff = max_distance / (111.0 * abs(cos(radians(latitude))))

        query = {
            "latitude": {"$gte": latitude - max_lat_diff, "$lte": latitude + max_lat_diff},
            "longitude": {"$gte": longitude - max_lon_diff, "$lte": longitude + max_lon_diff}
        }
        
        images = list(db.images.find(query, {"_id": 0}))
        return images
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve nearby images: {str(e)}")

@app.delete("/images/{filename}")
async def delete_image(filename: str, db = Depends(get_database)):
    """Delete an image by filename."""
    try:
        result = db.images.delete_one({"filename": filename})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Image not found")

        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {"status": "success", "message": "Image deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")

@app.get("/health")
async def health_check():
    """Check if the API is healthy."""
    try:
        db = get_database()
        db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)