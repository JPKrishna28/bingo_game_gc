import React from 'react';

const Leaderboard = ({ leaderboard }) => {
  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
            <th>Bingos</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player, index) => (
            <tr key={player.id}>
              <td>{index + 1}</td>
              <td>{player.username}</td>
              <td>{player.score}</td>
              <td>{player.bingos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;