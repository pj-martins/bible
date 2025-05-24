import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css';
import { Compare } from './compare/Compare';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Compare />}>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
