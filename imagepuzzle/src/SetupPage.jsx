import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SetupPage.css";

const UNSPLASH_ACCESS_KEY = "0BUM2zM3CwrLrFXafa5m1lIodgytl2HavDAn9KEijCs";

const API_CATEGORIES = [
  "Nature",
  "Animals",
  "Cities",
  "Art",
  "Flowers",
  "Fruits",
  "Mountains",
  "Technology",
  "Culture",
  "Food",
  "People",
  "cartoons",
  "Avengers",
  "Study",
  "Sports",
  "Space",
  "Ocean"
];

export default function SetupPage({ gameSettings, setGameSettings }) {
  const navigate = useNavigate();

  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("Nature");

  useEffect(() => {
    fetchImages(category);
  }, [category]);

  const fetchImages = async (cat) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${cat}&per_page=15&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`
      );
      const data = await res.json();
      setImages(data.results.map(i => i.urls.regular));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDifficultySelect = (rows, cols) => {
    setSelectedDifficulty({ rows, cols });
  };

  const startGame = () => {
    setGameSettings({
      category,
      imageUrl: selectedImage,
      rows: selectedDifficulty.rows,
      cols: selectedDifficulty.cols
    });
    navigate("/play");
  };

  return (
    <div className="setup-root">

      {/* CATEGORY BAR */}
      <div className="category-bar">
        {API_CATEGORIES.map(c => (
          <button
            key={c}
            className={c === category ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* IMAGE GRID */}
      {!selectedImage && (
        <div className="image-grid">
          {loading && <p>Loading...</p>}
          {images.map((img, i) => (
            <div
              key={i}
              className="image-card"
              onClick={() => setSelectedImage(img)}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
        </div>
      )}

      {/* FULL IMAGE VIEW */}
      {selectedImage && (
        <div className="image-modal">

          <button
            className="back-arrow"
            onClick={() => {
              setSelectedImage(null);
              setSelectedDifficulty(null);
            }}
          >
            ←
          </button>

          <img src={selectedImage} alt="Selected" className="full-image" />

          <div className="image-controls">
            <div className="difficulty-buttons">
              <button
                className={`diff-btn ${selectedDifficulty?.rows === 3 ? "active easy" : ""}`}
                onClick={() => handleDifficultySelect(3, 4)}
                title="Easy"
              >
                Easy
              </button>

              <button
                className={`diff-btn ${selectedDifficulty?.rows === 4 ? "active medium" : ""}`}
                onClick={() => handleDifficultySelect(4, 6)}
                title="Medium"
              >
                Medium
              </button>

              <button
                className={`diff-btn ${selectedDifficulty?.rows === 6 ? "active hard" : ""}`}
                onClick={() => handleDifficultySelect(6, 8)}
                title="Hard"
              >
                Hard
              </button>
            </div>

            {selectedDifficulty && (
              <button className="play-icon" onClick={startGame} title="Play">
                ▶
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
