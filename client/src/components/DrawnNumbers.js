import React from 'react';

const DrawnNumbers = ({ drawnNumbers, latestNumber }) => {
  return (
    <div className="drawn-numbers">
      <h3>Drawn Numbers</h3>
      <div className="number-list">
        {drawnNumbers.map((number) => (
          <div 
            key={number}
            className={`drawn-number ${number === latestNumber ? 'latest-number' : ''}`}
          >
            {number}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DrawnNumbers;