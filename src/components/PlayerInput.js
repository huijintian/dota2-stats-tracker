// src/components/PlayerInput.js
import React from 'react';
import './PlayerInput.css';

function PlayerInput({ value, onChange, id }) { // 移除 label prop
  return (
    <div className="player-input-group">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入 Steam ID"
        id={id}
      />
    </div>
  );
}

export default PlayerInput;