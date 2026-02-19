import { useNavigate } from "react-router-dom";
import "./Welcomepage.css";
export default function Welcomepage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-bg">
      <h1 className="game-title">🧩 IMAGE PUZZLE GAME</h1>

      <p className="subtitle">
        Welcome! Test your brain and solve the puzzle fast.
      </p>

      <div className="rules-glass">
        <h2>📜 Game Rules</h2>
        <ul>
          <li>⭐ Drag and place the puzzle pieces</li>
          <li>⭐ Complete the picture as fast as you can</li>
          <li>⭐ Pick your challenge:🟢Easy 🟡Medium 🔴Hard</li>
          <li>⭐ Moves and time will be counted</li>
          <li>⭐ Finish with the fewest moves!</li>
        </ul>
      </div>

      <button className="start-game-btn" onClick={() => navigate("/setupPage")}>
        Start Game
      </button>
    </div>
  );
}
