import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./Home";
import Projects from "./Projects";
import Login from "./Login";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  return (
    <Routes>
      {/* Standalone login page */}
      <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />

      {/* All other pages wrapped with Layout */}
      <Route path="/" element={<Layout currentUser={currentUser} />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        {/* Add more pages here */}
      </Route>
    </Routes>
  );
};

export default App;
