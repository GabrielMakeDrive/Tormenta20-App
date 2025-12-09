import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components';
import { 
  Home, 
  CharacterList, 
  CharacterCreate, 
  CharacterDetail, 
  DiceRoller, 
  Inventory, 
  Settings 
} from './pages';
import './styles/global.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/characters" element={<CharacterList />} />
          <Route path="/characters/new" element={<CharacterCreate />} />
          <Route path="/characters/:id" element={<CharacterDetail />} />
          <Route path="/characters/:id/inventory" element={<Inventory />} />
          <Route path="/dice" element={<DiceRoller />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
