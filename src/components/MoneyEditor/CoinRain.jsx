/*
 * CoinRain - Componente para animação de moedas caindo
 */
import React, { useEffect, useState, useRef } from 'react';
import './CoinRain.css';

function CoinRain({ onComplete }) {
  const [coins, setCoins] = useState([]);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    console.log('CoinRain started - showing coin animation');
    const numCoins = 1; // Uma moeda por clique
    const newCoins = Array.from({ length: numCoins }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: 0,
      duration: 2,
    }));
    setCoins(newCoins);

    const timer = setTimeout(() => {
      console.log('CoinRain completed');
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 2000); // Duração menor

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="coin-rain">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="coin"
          style={{
            left: `${coin.left}%`,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
          }}
        >
          🪙
        </div>
      ))}
    </div>
  );
}

export default CoinRain;