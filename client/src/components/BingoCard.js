import React from 'react';

const BingoCard = ({ board, markedNumbers, sharedMarkedNumbers = {}, onCellClick }) => {
  if (!board) {
    return <div>Loading board...</div>;
  }

  return (
    <div className="bingo-card">
      {board.map((row, rowIndex) => (
        row.map((number, colIndex) => {
          // Check if the number is marked locally or by other players
          const isMarkedLocally = markedNumbers[number];
          const isMarkedByOthers = sharedMarkedNumbers[number];
          
          return (
            <div 
              key={`${rowIndex}-${colIndex}`}
              className={`bingo-cell ${isMarkedLocally ? 'marked' : ''} ${isMarkedByOthers && !isMarkedLocally ? 'marked-by-others' : ''}`}
              onClick={() => onCellClick(number)}
            >
              {number}
            </div>
          );
        })
      ))}
    </div>
  );
};

export default BingoCard;