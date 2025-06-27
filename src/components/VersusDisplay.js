// src/components/VersusDisplay.js
import React from 'react';
import './VersusDisplay.css';

function VersusDisplay({ player1Data, player2Data }) {
  if (!player1Data || !player2Data) {
    return null; // 或者返回一个加载/占位符
  }

  const player1WinRate = parseFloat(player1Data.winRate);
  const player2WinRate = parseFloat(player2Data.winRate);

  let comparisonText = '';
  let comparisonClass = '';

  if (player1WinRate > player2WinRate) {
    comparisonText = `${player1Data.profile.personaname} 胜率更高！🎉`;
    comparisonClass = 'player1-wins';
  } else if (player2WinRate > player1WinRate) {
    comparisonText = `${player2Data.profile.personaname} 胜率更高！🎉`;
    comparisonClass = 'player2-wins';
  } else {
    comparisonText = '双方胜率相同！🤝';
    comparisonClass = 'draw';
  }

  return (
    <div className="versus-display">
      <h4>胜率对比</h4>
      {/* 移除 win-rate-bars，只显示最终结果 */}
      <p className={`comparison-result ${comparisonClass}`}>{comparisonText}</p>
    </div>
  );
}

export default VersusDisplay;