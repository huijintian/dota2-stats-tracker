// src/components/PlayerCard.js
import React from 'react';
import './PlayerCard.css';

function formatTimeAgo(timestamp) {
  const now = new Date();
  const date = new Date(timestamp * 1000); // OpenDota API 的时间戳是秒，需要转换为毫秒
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
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
    // 超过一周显示具体日期，但这里简化只显示天数
    return `${diffDay}天前`;
  }
}

function PlayerCard({ playerData, playerName, heroesMap }) {
  if (!playerData || !playerData.profile) {
    return null; // 或者显示一个加载/占位符
  }

  const { profile, wins, totalGames, winRate, recentMatches } = playerData;
  const losses = totalGames - wins;

  return (
    <div className="player-card">
      <img src={profile.avatarfull} alt="Avatar" className="player-avatar" />
      <h3>{profile.personaname}</h3>
      <p>总场次 (单排): <strong>{totalGames}</strong></p>
      <p>胜场: <strong>{wins}</strong></p>
      <p>负场: <strong>{losses}</strong></p>
      <p>胜率: <strong>{winRate}%</strong></p>

      <h4>最近10场比赛</h4>
      <div className="recent-matches-table-container">
        <div className="recent-matches-table-header">
          <div className="match-col result-col">结果</div>
          <div className="match-col hero-col">英雄</div>
          <div className="match-col kda-col">KDA</div>
          <div className="match-col lh-denies-col">正反补</div> {/* 新增表头 */}
          <div className="match-col level-col">等级</div> {/* 新增表头 */}
        </div>
        <ul className="recent-matches-table-body">
          {recentMatches.slice(0, 10).map((match) => {
            const hero = heroesMap[match.hero_id];
            const didWin = (match.player_slot < 128 && match.radiant_win) || (match.player_slot >= 128 && !match.radiant_win);
            const kda = `${match.kills || 0}/${match.deaths || 0}/${match.assists || 0}`; // Add || 0 for safety
            const lhDenies = `${match.last_hits || 0}/${match.denies || 0}`; // Use || 0 for safety for new fields

            return (
              <li key={match.match_id} className={`match-row ${didWin ? 'win-row' : 'loss-row'}`}>
                {/* 结果列 */}
                <div className="match-col result-col">
                  <span className={`match-result ${didWin ? 'win' : 'loss'}`}>{didWin ? '胜利' : '失败'}</span>
                </div>

                {/* 英雄列 */}
                <div className="match-col hero-col">
                  {hero && hero.imgPath ? (
                    <img
                      src={`https://cdn.dota2.com${hero.imgPath}`}
                      alt={hero.localized_name || 'Hero'}
                      className="hero-icon"
                    />
                  ) : (
                    <div className="hero-icon-placeholder">?</div>
                  )}
                  <div className="hero-details">
                    {hero && <span className="hero-name">{hero.localized_name || '未知英雄'}</span>}
                    <span className="match-time-ago">{formatTimeAgo(match.start_time)}</span>
                  </div>
                </div>

                {/* KDA 列 */}
                <div className="match-col kda-col">
                  <span className="kda-score">{kda}</span>
                </div>

                {/* 正反补列 - 新增 */}
                <div className="match-col lh-denies-col">
                  <span className="lh-denies-score">{lhDenies}</span>
                </div>

                {/* 等级列 - 新增 */}
                <div className="match-col level-col">
                  <span className="level-score">{match.level || '-'}</span> {/* 显示等级，如果为空则显示'-' */}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default PlayerCard;