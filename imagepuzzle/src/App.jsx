import {  Routes, Route } from "react-router-dom";
import Welcomepage from "./Welcomepage";
import SetupPage from "./SetupPage";
import Jigsaw from "./Jigsaw";
import { useState } from "react";

export default function App() {
  const [gameSettings, setGameSettings] = useState({
    category: "Nature",
    rows: 4,
    cols: 6,
    imageUrl: ""
  });

  return (
    
      <Routes>
        <Route path="/" element={<Welcomepage />} />

        <Route
          path="/setupPage"
          element={
            <SetupPage
              gameSettings={gameSettings}
              setGameSettings={setGameSettings}
            />
          }
        />

        <Route
          path="/play"
          element={<Jigsaw config={gameSettings} />}
        />
      </Routes>
    
  );
}
