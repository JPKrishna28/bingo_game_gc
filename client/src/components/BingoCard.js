import React from 'react';

const BingoCard = ({ board, markedNumbers, onCellClick }) => {
  if (!board) {
    return <div>Loading board...</div>;
  }

  return (
    <div className="bingo-card">
      {board.map((row, rowIndex) => (
        row.map((number, colIndex) => (
          <div 
            key={`${rowIndex}-${colIndex}`}
            className={`bingo-cell ${markedNumbers[number] ? 'marked' : ''}`}
            onClick={() => onCellClick(number)}
          >
            {number}
          </div>
        ))
      ))}
    </div>
  );
};

export default BingoCard;