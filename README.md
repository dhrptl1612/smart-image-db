# Smart Image Gallery API

A FastAPI-based backend service for managing images with geolocation data using MongoDB Atlas.

## Features

- Image upload with geolocation data
- Image retrieval with pagination
- Nearby image search based on coordinates
- Image deletion
- Health monitoring
- Static file serving
- CORS support

## Prerequisites

- Python 3.8+
- MongoDB Atlas account
- Virtual environment (recommended)

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/smart-image-gallery.git
cd smart-image-gallery
```

2. Create and activate virtual environment
```bash
python -m venv venv
source venv/bin/activate  # Linux/MacOS
venv\Scripts\activate     # Windows
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Create `.env` file in project root
```
MONGO_USERNAME=your_username
MONGO_PASSWORD=your_password
MONGO_CLUSTER=your_cluster.mongodb.net
FRONTEND_URL=http://localhost:3000
HOST_URL=http://localhost:8000
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
```

## MongoDB Atlas Setup

1. Create a MongoDB Atlas account at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Add your IP address to Network Access
4. Create a database user with readWrite permissions
5. Get your connection string and update `.env` file

## Running the Application

1. Start the server
```bash
uvicorn main:app --reload
```

2. Access the API documentation at [http://localhost:8000/docs](http://localhost:8000/docs)

## API Endpoints

### Image Operations

- `POST /upload` - Upload an image with geolocation
- `GET /images` - Retrieve all images (paginated)
- `GET /images/nearby` - Find images near coordinates
- `DELETE /images/{filename}` - Delete an image

### System Operations

- `GET /health` - Check system health
- `GET /` - API root

## Request Examples

### Upload Image
```bash
curl -X POST "http://localhost:8000/upload" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@image.jpg" \
     -F "latitude=51.507351" \
     -F "longitude=-0.127758"
```

### Get Images
```bash
curl -X GET "http://localhost:8000/images?skip=0&limit=10" \
     -H "accept: application/json"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| MONGO_USERNAME | MongoDB Atlas username | - |
| MONGO_PASSWORD | MongoDB Atlas password | - |
| MONGO_CLUSTER | MongoDB Atlas cluster URL | - |
| FRONTEND_URL | Frontend application URL | http://localhost:3000 |
| HOST_URL | Backend host URL | http://localhost:8000 |
| MAX_FILE_SIZE | Maximum file size in bytes | 5242880 (5MB) |
| UPLOAD_DIR | Directory for uploaded files | ./uploads |

## Project Structure

```
smart-image-gallery/
├── main.py
├── requirements.txt
├── .env
├── uploads/
├── README.md
└── .gitignore
```

## Error Handling

The API implements proper error handling for:
- Invalid file types
- File size limits
- Database connection issues
- Authentication failures
- Missing files
- Invalid coordinates

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgments

- FastAPI documentation
- MongoDB Atlas documentation
- Python community
