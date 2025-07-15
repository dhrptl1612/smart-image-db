import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [error, setError] = useState(null);
  
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#FF0000"); 
  const [brushSize, setBrushSize] = useState(5);

  const loadImages = useCallback(() => {
    setLoading(true);
    
    const fetchImages = async () => {
      try {
        const res = await axios.get("http://localhost:8000/images");
        setImages(res.data);
        setError(null);
      } catch (err) {
        setError("Failed to load images. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        fetchImages();
      });
    } else {
      setTimeout(fetchImages, 1);
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
      };
      img.src = event.target.result;
      imgRef.current = img;
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    try {
      setLoading(true);
      
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      
      const formData = new FormData();
      formData.append("file", blob, "annotated_image.png");
      formData.append("latitude", coords.lat || 0);
      formData.append("longitude", coords.lon || 0);
   
      await axios.post("http://localhost:8000/upload", formData);
      
      setFile(null);
      loadImages();
      setError(null);
    } catch (err) {
      setError("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };
  
  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const checkNetworkStatus = () => {
    if (navigator.connection) {
      const connection = navigator.connection;
      
      setNetworkStatus({
        effectiveType: connection.effectiveType,
        saveData: connection.saveData,
      });
      
      if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g" || connection.saveData) {
        alert("⚠️ You are on a slow network. Images might load slowly.");
      }
    }
  };

  useEffect(() => {
    loadImages();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError("Location access denied. Your images won't have location data.");
        }
      );
    }
 
    checkNetworkStatus();

    if (navigator.connection) {
      navigator.connection.addEventListener('change', checkNetworkStatus);
    }
    
    return () => {
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', checkNetworkStatus);
      }
    };
  }, [loadImages]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.onload = () => img.classList.add('loaded');
          observerRef.current.unobserve(img);
        }
      });
    }, {
      rootMargin: '100px', 
      threshold: 0.1,
    });

    const lazyImages = document.querySelectorAll("img[data-src]");
    lazyImages.forEach((img) => observerRef.current.observe(img));
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [images]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>📸 Smart Image Gallery</h1>
        {networkStatus && (
          <div className="network-info">
            Network: {networkStatus.effectiveType} 
            {networkStatus.saveData && " (Data Saver On)"}
          </div>
        )}
      </header>

      <div className="upload-section">
        <h2>Upload New Image</h2>
        
        <div className="file-input-wrapper">
          <input 
            type="file" 
            onChange={handleFileChange} 
            accept="image/*" 
            id="file-upload" 
          />
          <label htmlFor="file-upload" className="file-upload-label">
            Choose Image
          </label>
          {file && <span className="file-name">{file.name}</span>}
        </div>
        
        {file && (
          <div className="canvas-container">
            <div className="drawing-tools">
              <label>
                Color:
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)} 
                />
              </label>
              <label>
                Size:
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                />
              </label>
            </div>
            <canvas 
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              className="drawing-canvas"
            />
            <p className="canvas-help">Click and drag to annotate the image</p>
          </div>
        )}
        
        {coords.lat ? (
          <div className="location-info">
            📍 Location: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
          </div>
        ) : (
          <div className="location-info">
            ⚠️ Location access denied or unavailable
          </div>
        )}
        
        <button 
          className="upload-button" 
          onClick={handleUpload} 
          disabled={!file || loading}
        >
          {loading ? "Uploading..." : "Upload Image"}
        </button>
        
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="gallery-section">
        <h2>Image Gallery</h2>
        
        {loading && images.length === 0 && <div className="loading">Loading images...</div>}
        
        <div className="image-grid">
          {images.map((img, idx) => (
            <div key={idx} className="image-card">
              <div className="image-container">
                <img 
                  data-src={img.url} 
                  alt="User uploaded" 
                  className="gallery-image" 
                />
                <div className="image-loading">Loading...</div>
              </div>
              <div className="image-info">
                <p className="location">📍 {img.latitude.toFixed(4)}, {img.longitude.toFixed(4)}</p>
              </div>
            </div>
          ))}
        </div>
        
        {images.length === 0 && !loading && (
          <p className="no-images">No images uploaded yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}

export default App;