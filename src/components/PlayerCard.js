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
    return `${diffDay}天前`;
  }
}

// 辅助函数：计算 KDA 值
const calculateKDA = (kills, deaths, assists) => {
    // 避免除以零，如果死亡数为0，则视为1，防止KDA无限大
    return (kills + assists) / Math.max(1, deaths);
};

function PlayerCard({ playerData, playerName, heroesMap }) {
  if (!playerData || !playerData.profile) {
    return null;
  }

  const { profile, wins, totalGames, winRate, recentMatches, allMatchesOverview, mostPlayedHeroes } = playerData;
  const losses = totalGames - wins;

  // 根据最近100场天梯比赛 (allMatchesOverview) 统计常用英雄
  const heroStatsInRecentMatches = {};
  if (allMatchesOverview && allMatchesOverview.length > 0) {
    allMatchesOverview.forEach(match => {
      const heroId = match.hero_id;
      const isRadiantPlayer = match.player_slot < 128;
      const didWin = (isRadiantPlayer && match.radiant_win) || (!isRadiantPlayer && !match.radiant_win);

      if (!heroStatsInRecentMatches[heroId]) {
        heroStatsInRecentMatches[heroId] = {
          hero_id: heroId,
          games: 0,
          win: 0,
          loss: 0
        };
      }
      heroStatsInRecentMatches[heroId].games++;
      if (didWin) {
        heroStatsInRecentMatches[heroId].win++;
      } else {
        heroStatsInRecentMatches[heroId].loss++;
      }
    });
  }

  // 过滤出前3个常用英雄 (确保 heroesMap 已经加载)
  // 现在使用 heroStatsInRecentMatches 而不是 mostPlayedHeroes
  const top3RecentHeroes = Object.values(heroStatsInRecentMatches)
    .filter(heroStats => heroesMap[heroStats.hero_id]) // 确保英雄数据在 map 中存在
    .sort((a, b) => b.games - a.games) // 按游戏场次降序
    .slice(0, 3); // 取前3个

  // 计算最强和最弱 KDA
  let bestKDA = { kda: -1, match: null };
  let worstKDA = { kda: Infinity, match: null }; // 初始化为正无穷大

  if (allMatchesOverview && allMatchesOverview.length > 0) {
    allMatchesOverview.forEach(match => {
        const currentKDA = calculateKDA(match.kills || 0, match.deaths || 0, match.assists || 0);

        if (currentKDA > bestKDA.kda) {
            bestKDA = { kda: currentKDA, match: match };
        }

        // 查找最弱KDA，排除KDA为0的情况，或者处理死亡数过多
        if (match.deaths !== null && match.deaths !== undefined) { // 确保有死亡数据
             if (currentKDA < worstKDA.kda) {
                worstKDA = { kda: currentKDA, match: match };
            }
        }
    });
  }

  return (
    <div className="player-card">
      <img src={profile.avatarfull} alt="Avatar" className="player-avatar" />
      <h3>{profile.personaname}</h3>
      <p>总场次 (单排): <strong>{totalGames}</strong></p>
      <p>胜场: <strong>{wins}</strong></p>
      <p>负场: <strong>{losses}</strong></p>
      <p>胜率: <strong>{winRate}%</strong></p>

      {/* 常用英雄展示 - 现在使用 top3RecentHeroes */}
      {top3RecentHeroes.length > 0 && (
        <div className="player-overview-section">
          <h4>常用英雄 (近100场天梯)</h4> {/* 修改标题以明确数据来源 */}
          <div className="top-heroes-list">
            {top3RecentHeroes.map(heroData => {
              const hero = heroesMap[heroData.hero_id];
              const heroWinRate = heroData.games > 0 ? ((heroData.win / heroData.games) * 100).toFixed(2) : '0.00';
              return (
                <div key={heroData.hero_id} className="top-hero-item">
                  {hero && hero.imgPath ? (
                    <img src={`https://cdn.dota2.com${hero.imgPath}`} alt={hero.chinese_name || hero.localized_name} className="top-hero-icon" />
                  ) : (
                    <div className="top-hero-icon-placeholder">?</div>
                  )}
                  <div className="top-hero-details">
                    <span className="top-hero-name">{hero ? hero.chinese_name || hero.localized_name : '未知英雄'}</span>
                    <span className="top-hero-winrate">胜率: {heroWinRate}%</span>
                    <span className="top-hero-games">场次: {heroData.games}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 最强和最弱 KDA 表现 */}
      {(bestKDA.match || worstKDA.match) && (
        <div className="player-overview-section">
          <h4>KDA 表现 (近100场天梯)</h4> {/* 修改标题以明确数据来源 */}
          <div className="kda-performance-list">
            {bestKDA.match && (
              <div className="performance-item best-kda">
                <span className="performance-label">最佳 KDA:</span>
                <span className="performance-value">
                  {bestKDA.match.kills}/{bestKDA.match.deaths}/{bestKDA.match.assists}
                </span>
                <span className="performance-hero">
                  ({heroesMap[bestKDA.match.hero_id] ? heroesMap[bestKDA.match.hero_id].chinese_name || heroesMap[bestKDA.match.hero_id].localized_name : '未知'})
                </span>
              </div>
            )}
            {worstKDA.match && (
              <div className="performance-item worst-kda">
                <span className="performance-label">最差 KDA:</span>
                <span className="performance-value">
                  {worstKDA.match.kills}/{worstKDA.match.deaths}/{worstKDA.match.assists}
                </span>
                <span className="performance-hero">
                  ({heroesMap[worstKDA.match.hero_id] ? heroesMap[worstKDA.match.hero_id].chinese_name || heroesMap[worstKDA.match.hero_id].localized_name : '未知'})
                </span>
              </div>
            )}
          </div>
        </div>
      )}


      <h4>最近10场比赛</h4>
      <div className="recent-matches-table-container">
        <div className="recent-matches-table-header">
          <div className="match-col result-col">结果</div>
          <div className="match-col hero-col">英雄</div>
          <div className="match-col kda-col">KDA</div>
          <div className="match-col lh-denies-col">正反补</div>
          <div className="match-col level-col">等级</div>
        </div>
        <ul className="recent-matches-table-body">
          {recentMatches.slice(0, 10).map((match) => {
            const hero = heroesMap[match.hero_id];
            const didWin = (match.player_slot < 128 && match.radiant_win) || (match.player_slot >= 128 && !match.radiant_win);
            const kda = `${match.kills || 0}/${match.deaths || 0}/${match.assists || 0}`;
            const lhDenies = `${match.last_hits || 0}/${match.denies || 0}`;

            return (
              <li key={match.match_id} className={`match-row ${didWin ? 'win-row' : 'loss-row'}`}>
                <div className="match-col result-col">
                  <span className={`match-result ${didWin ? 'win' : 'loss'}`}>{didWin ? '胜利' : '失败'}</span>
                </div>

                <div className="match-col hero-col">
                  {hero && hero.imgPath ? (
                    <img
                      src={`https://cdn.dota2.com${hero.imgPath}`}
                      alt={hero.chinese_name || hero.localized_name}
                      className="hero-icon"
                    />
                  ) : (
                    <div className="hero-icon-placeholder">?</div>
                  )}
                  <div className="hero-details">
                    <span className="hero-name">{hero ? hero.chinese_name || hero.localized_name : '未知英雄'}</span>
                    <span className="match-time-ago">{formatTimeAgo(match.start_time)}</span>
                  </div>
                </div>

                <div className="match-col kda-col">
                  <span className="kda-score">{kda}</span>
                </div>

                <div className="match-col lh-denies-col">
                  <span className="lh-denies-score">{lhDenies}</span>
                </div>

                <div className="match-col level-col">
                  <span className="level-score">{match.level || '-'}</span>
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
