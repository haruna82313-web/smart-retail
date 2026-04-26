import React, { useState, useEffect } from 'react';

const businessQuotes = [
  "Quality is not an act, it is a habit.",
  "Success in business requires training and discipline.",
  "The customer is the most important visitor.",
  "Your brand is what other people say about you.",
  "Business opportunities are like buses, there's always another one coming.",
  "The secret of business is to know something that nobody else knows.",
  "Every problem is a gift—without problems we would not grow.",
  "A brand for a company is like a reputation for a person.",
  "Your work is going to fill a large part of your life.",
  "Innovation distinguishes between a leader and a follower.",
  "The way to get started is to quit talking and begin doing.",
  "Don't be afraid to give up the good to go for the great.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream bigger. Do bigger.",
  "Success doesn't just find you. You have to go out and get it.",
  "The key to success is to focus on goals, not obstacles.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key to success is to start before you're ready.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for the perfect moment. Take the moment and make it perfect.",
  "The difference between ordinary and extraordinary is that little extra.",
  "You don't need to be perfect to be amazing.",
  "You don't always get what you wish for, you get what you work for.",
  "Great things never come from comfort zones.",
  "Dream it. Believe it. Build it.",
  "Success is not given, it is earned.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there.",
  "The future depends on what you do today.",
  "What seems to us as bitter trials are often blessings in disguise.",
  "The only impossible journey is the one you never begin.",
  "In the middle of difficulty lies opportunity.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Believe in yourself. You are braver than you think, more talented than you know.",
  "What you get by achieving your goals is not as important as what you become.",
  "You are never too old to set another goal or to dream a new dream.",
  "The only limit to our realization of tomorrow will be our doubts of today.",
  "Do what you can, with what you have, where you are.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Your limitation—it's only your imagination.",
  "Great things never come from comfort zones.",
  "Push yourself, because no one else is going to do it for you.",
  "Great minds discuss ideas; average minds discuss events; small minds discuss people.",
  "Success is not how high you have climbed, but how you make a positive difference.",
  "If you really look closely, most overnight successes took a long time.",
  "The secret of success is to do the common thing uncommonly well.",
  "I find that the harder I work, the more luck I seem to have.",
  "The road to success and the road to failure are almost exactly the same.",
  "Success is walking from failure to failure with no loss of enthusiasm.",
  "Your time is limited, don't waste it living someone else's life.",
  "The successful warrior is the average man, with laser-like focus.",
  "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.",
  "Success seems to be connected with action. Successful people keep moving.",
  "In order to succeed, we must first believe that we can.",
  "The only place where success comes before work is in the dictionary.",
  "Too many of us are not living our dreams because we are living our fears.",
  "I have not failed. I've just found 10,000 ways that won't work.",
  "A successful man is one who can lay a firm foundation with the bricks others have thrown at him.",
  "Success is not the key to happiness. Happiness is the key to success.",
  "Don't be afraid to give up the good to go for the great.",
  "The distance between insanity and genius is measured only by success.",
  "If you really want to do something, you'll find a way. If you don't, you'll find an excuse.",
  "Don't raise your voice, improve your argument.",
  "What you do today can improve all your tomorrows.",
  "The successful man will profit from his mistakes and try again in a different way.",
  "You learn more from failure than from success. Don't let it stop you. Failure builds character.",
  "If you want to achieve excellence, you can get there today. As of this second, quit doing less-than-excellent work.",
  "The difference between a successful person and others is not a lack of strength, not a lack of knowledge, but rather a lack of will.",
  "The successful person has the habit of doing the things failures don't like to do.",
  "Success is not measured by what you accomplish, but by the opposition you have encountered.",
  "Success is to be measured not so much by the position that one has reached in life as by the obstacles which he has overcome.",
  "There are no traffic jams on the extra mile.",
  "Success is the progressive realization of predetermined, worthwhile, personal goals.",
  "Character cannot be developed in ease and quiet. Only through experience of trial and suffering can the soul be strengthened."
];

export default function BusinessQuotes() {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentQuote((prev) => (prev + 1) % businessQuotes.length);
        setIsVisible(true);
      }, 300);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="business-quotes-container">
      <div 
        className={`business-quote ${isVisible ? 'quote-visible' : 'quote-hidden'}`}
        style={{
          fontStyle: 'italic',
          color: 'var(--accent-teal)',
          textAlign: 'center',
          padding: '10px 20px',
          fontSize: '14px',
          transition: 'opacity 0.3s ease-in-out',
          opacity: isVisible ? 1 : 0,
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        "{businessQuotes[currentQuote]}"
      </div>
    </div>
  );
}
