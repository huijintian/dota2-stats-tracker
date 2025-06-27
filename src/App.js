// src/App.js
import React, { useState, useEffect } from 'react';
import PlayerCard from './components/PlayerCard';
import PlayerInput from './components/PlayerInput';
import VersusDisplay from './components/VersusDisplay';
import './App.css'; // 确保引入CSS

// 预设玩家列表
const PRESET_PLAYERS = [
  { nickname: '鄂仔', id: '1602465869' },
  { nickname: 'wossy', id: '1604682115' },
  { nickname: '量仔', id: '118065835' },
  { nickname: '77', id: '1605227471' },
  { nickname: '科科', id: '1238935695' },
  { nickname: 'huijin_', id: '113723088' },
];

// 辅助函数：格式化时间戳为“N天前”
const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const matchDate = new Date(timestamp * 1000); // OpenDota API 返回的是秒级时间戳
  const diffTime = Math.abs(now.getTime() - matchDate.getTime());
  const diffSec = Math.round(diffTime / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (diffSec < 60) {
    return '刚刚';
  } else if (diffMin < 60) {
    return `${diffMin}分钟前`;
  } else if (diffHr < 24) {
    return `${diffHr}小时前`;
  } else if (diffDay < 7) {
    return `${diffDay}天前`;
  } else {
    return `${diffDay}天前`; // 超过一周仍然显示天数，简化处理
  }
};

// 辅助函数：获取游戏模式名称
const getGameModeName = (modeId) => {
  const gameModes = {
    0: '未知',
    1: '全阵营选择',
    2: '队长模式',
    3: '随机征召',
    4: '单一征召',
    5: '全随机',
    6: '死亡竞赛',
    7: '中路 solo', // 注意：lobby_type 7 通常是 Ranked Matchmaking，而不是 game_mode 7
    12: '加速模式', // All Pick Turbo
    22: '天梯匹配', // Ranked All Pick (most common)
    23: '天梯队长模式', // Ranked Captains Mode
    16: '队长征召', // Captains Draft
    18: '能力征召', // Ability Draft
    // 你可能需要根据实际 API 返回的 game_mode ID 进一步补充这个映射
  };
  return gameModes[modeId] || '未知模式';
};

// 辅助函数：获取段位名称
const getRankTierName = (rankTier) => {
  if (rankTier === null || rankTier === undefined) return '未定级';

  const tier = Math.floor(rankTier / 10); // 阶位 (如 0-7, 7是冠绝)
  const stars = rankTier % 10; // 星级 (1-5)

  const rankNames = ['先锋', '卫士', '中军', '统帅', '传奇', '万古流芳', '超凡入圣', '冠绝一世'];

  if (tier >= 0 && tier < rankNames.length) {
    if (tier === 7) { // 冠绝一世没有星级，只显示段位
      return rankNames[tier];
    }
    return `${rankNames[tier]}${stars > 0 ? ` ${stars}星` : ''}`;
  }
  return '未定级';
};


function App() {
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [player1Data, setPlayer1Data] = useState(null);
  const [player2Data, setPlayer2Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [heroes, setHeroes] = useState({});
  // 新增状态来控制是否显示详细战绩（正反补, 等级）
  const [showDetailedStats, setShowDetailedStats] = useState(false); // 默认关闭

  // 状态来控制玩家 A 和玩家 B 是否为手动输入模式
  const [isPlayer1ManualInput, setIsPlayer1ManualInput] = useState(false);
  const [isPlayer2ManualInput, setIsPlayer2ManualInput] = useState(false);


  // 在组件挂载时加载所有英雄数据
  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const response = await fetch('https://api.opendota.com/api/heroes');
        if (!response.ok) throw new Error('Failed to fetch heroes data.');
        const heroesData = await response.json();

        const heroesMap = {};
        heroesData.forEach(hero => {
          const heroNameForImg = hero.name.replace('npc_dota_hero_', '');
          heroesMap[hero.id] = {
            ...hero,
            imgPath: `/apps/dota2/images/heroes/${heroNameForImg}_sb.png`
          };
        });
        setHeroes(heroesMap);
      } catch (err) {
        console.error("Error loading heroes:", err);
        setError("英雄数据加载失败，请检查网络或API。");
      }
    };

    fetchHeroes();
  }, []);

  const fetchPlayerData = async (playerId, setPlayerData) => {
    if (!playerId) {
      setPlayerData(null); // Clear data if ID is empty
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const playerRes = await fetch(`https://api.opendota.com/api/players/${playerId}`);
      if (!playerRes.ok) {
        throw new Error('Player not found or OpenDota API error. Please check the Steam ID.');
      }
      const playerData = await playerRes.json();

      const matchesOverviewRes = await fetch(`https://api.opendota.com/api/players/${playerId}/matches?limit=100&lobby_type=7`);
      if (!matchesOverviewRes.ok) {
        throw new Error('Failed to fetch matches overview. OpenDota API might be rate-limiting or player has no recent ranked games.');
      }
      const matchesOverviewData = await matchesOverviewRes.json();

      let wins = 0;
      let totalGames = 0;

      matchesOverviewData.forEach(match => {
        const isRadiantPlayer = match.player_slot < 128;
        const didWin = (isRadiantPlayer && match.radiant_win) || (!isRadiantPlayer && !match.radiant_win);

        totalGames++;
        if (didWin) {
          wins++;
        }
      });

      const recentMatchesBasic = matchesOverviewData.slice(0, 10);
      let detailedRecentMatches = [];

      // 仅当 showDetailedStats 为 true 时，才发起详细数据请求
      if (showDetailedStats) {
        const detailedMatchesPromises = recentMatchesBasic.map(async (match) => {
          try {
            const matchDetailRes = await fetch(`https://api.opendota.com/api/matches/${match.match_id}`);
            if (!matchDetailRes.ok) {
              console.warn(`Failed to fetch details for match ${match.match_id}. Status: ${matchDetailRes.status}`);
              return { ...match, last_hits: null, denies: null, level: null };
            }
            const matchDetail = await matchDetailRes.json();

            const playerStatsInDetail = matchDetail.players.find(
              (p) => p.player_slot === match.player_slot
            );

            if (playerStatsInDetail) {
              return {
                ...match,
                last_hits: playerStatsInDetail.last_hits,
                denies: playerStatsInDetail.denies,
                level: playerStatsInDetail.level,
              };
            } else {
              console.warn(`Player ${playerId} (slot ${match.player_slot}) not found in detailed match ${match.match_id} players array.`);
              return { ...match, last_hits: null, denies: null, level: null };
            }
          } catch (detailErr) {
            console.error(`Error fetching detail for match ${match.match_id}:`, detailErr);
            return { ...match, last_hits: null, denies: null, level: null };
          }
        });
        detailedRecentMatches = (await Promise.all(detailedMatchesPromises)).filter(Boolean);
      } else {
        // 如果不显示详细数据，则直接使用基本匹配数据，并将详细字段设置为 null
        detailedRecentMatches = recentMatchesBasic.map(match => ({
          ...match,
          last_hits: null,
          denies: null,
          level: null,
        }));
      }

      setPlayerData({
        profile: playerData.profile,
        wins,
        totalGames,
        winRate: totalGames > 0 ? (wins / totalGames * 100).toFixed(2) : '0.00',
        recentMatches: detailedRecentMatches
      });

    } catch (err) {
      setError(`Error fetching data for ID ${playerId}: ${err.message}`);
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAllPlayers = async () => {
    // 确保英雄数据已加载
    if (Object.keys(heroes).length === 0) {
      setError("英雄数据正在加载中，请稍后再试！");
      return;
    }
    // 只有在 ID 有效时才发起查询
    if (!player1Id && !isPlayer1ManualInput) { // If it's a dropdown and nothing is selected
        setError("请为玩家 A 选择一个 ID 或手动输入。");
        return;
    }
    if (!player2Id && !isPlayer2ManualInput) { // If it's a dropdown and nothing is selected
        setError("请为玩家 B 选择一个 ID 或手动输入。");
        return;
    }
    if ((!player1Id && isPlayer1ManualInput) || (!player2Id && isPlayer2ManualInput)) {
        setError("手动输入模式下，玩家 ID 不能为空。");
        return;
    }

    await Promise.all([
      fetchPlayerData(player1Id, setPlayer1Data),
      fetchPlayerData(player2Id, setPlayer2Data)
    ]);
  };

  return (
    <div className="App">
      <header>
        <h1>Dota2 单排战绩追踪器</h1>
        <p>输入你的朋友的 Steam 32位 ID (如 SteamID3 [U:1:XXXXXX] 中的 XXXXXX)，查看他们的单排胜率！</p>
      </header>

      {error && <p className="error-message">{error}</p>}

      <div className="top-versus-container">
        {player1Data && player2Data ? (
          <VersusDisplay player1Data={player1Data} player2Data={player2Data} />
        ) : (
          <div className="versus-placeholder-top">
            <p>查询玩家数据后，将在此处显示胜率对比。</p>
          </div>
        )}
      </div>

      <div className="main-grid-container">
        {/* 第一行：标签 */}
        <div className="grid-cell label-cell">玩家 A</div>
        <div className="grid-cell label-cell">玩家 B</div>
        <div className="grid-cell label-cell">查询战绩</div>

        {/* 第二行：输入框和按钮 */}
        <div className="grid-cell input-cell">
          {isPlayer1ManualInput ? (
            <PlayerInput value={player1Id} onChange={setPlayer1Id} id="playerAId" />
          ) : (
            <select
              id="playerAIdSelect"
              className="player-select-input"
              value={player1Id}
              onChange={(e) => {
                const selectedValue = e.target.value;
                if (selectedValue === 'manual') {
                  setIsPlayer1ManualInput(true);
                  setPlayer1Id(''); // 清空 ID，等待手动输入
                } else {
                  setIsPlayer1ManualInput(false);
                  setPlayer1Id(selectedValue);
                }
                setPlayer1Data(null); // 清空数据，等待新查询
              }}
            >
              <option value="">请选择玩家 A</option>
              {PRESET_PLAYERS.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.nickname} - {player.id}
                </option>
              ))}
              <option value="manual">手动输入 ID</option>
            </select>
          )}
        </div>
        <div className="grid-cell input-cell">
          {isPlayer2ManualInput ? (
            <PlayerInput value={player2Id} onChange={setPlayer2Id} id="playerBId" />
          ) : (
            <select
              id="playerBIdSelect"
              className="player-select-input"
              value={player2Id}
              onChange={(e) => {
                const selectedValue = e.target.value;
                if (selectedValue === 'manual') {
                  setIsPlayer2ManualInput(true);
                  setPlayer2Id(''); // 清空 ID，等待手动输入
                } else {
                  setIsPlayer2ManualInput(false);
                  setPlayer2Id(selectedValue);
                }
                setPlayer2Data(null); // 清空数据，等待新查询
              }}
            >
              <option value="">请选择玩家 B</option>
              {PRESET_PLAYERS.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.nickname} - {player.id}
                </option>
              ))}
              <option value="manual">手动输入 ID</option>
            </select>
          )}
        </div>
        <div className="grid-cell button-cell">
          <button onClick={handleFetchAllPlayers} disabled={loading || Object.keys(heroes).length === 0}>
            {loading ? '加载中...' : Object.keys(heroes).length === 0 ? '加载英雄数据...' : '查询战绩'}
          </button>
          {/* 新增：详细战绩查询开关 */}
          <div className="toggle-switch-container">
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="toggleDetailedStats"
                  className="toggle-input"
                  checked={showDetailedStats}
                  onChange={(e) => setShowDetailedStats(e.target.checked)}
                />
                <label htmlFor="toggleDetailedStats" className="toggle-label"></label>
                <span className="toggle-text">显示正反补, 等级</span>
              </div>
          </div>
        </div>

        {/* 第三行：玩家数据 PlayerCard */}
        <div className="grid-cell data-cell">
          {player1Data ? (
            <PlayerCard playerData={player1Data} playerName="玩家 A" heroesMap={heroes} />
          ) : (
            <div className="player-card placeholder-card">
              <p>等待玩家A数据...</p>
            </div>
          )}
        </div>
        <div className="grid-cell data-cell">
          {player2Data ? (
            <PlayerCard playerData={player2Data} playerName="玩家 B" heroesMap={heroes} />
          ) : (
            <div className="player-card placeholder-card">
              <p>等待玩家B数据...</p>
            </div>
          )}
        </div>
        <div className="grid-cell data-cell empty-cell">
            <p>查询结果将显示在左侧。</p>
        </div>
      </div>

      <footer>
        <p>数据来源于 OpenDota API。</p>
      </footer>
    </div>
  );
}

export default App;
