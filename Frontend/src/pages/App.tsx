import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./Home";
import Projects from "./Projects";
import Login from "./Login";
import DonationForm from "./DonationForm";
import DonationSuccess from "./DonationSuccess";
import DonationFailed from "./DonationFailed";

interface User {
  userType: "donor" | "school";
  donorName?: string;
  schoolName?: string;
  name?: string; // unified for Layout
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("currentUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Sync localStorage whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  return (
    <Routes>
      {/* Login page */}
      <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />

      {/* All other pages wrapped in Layout */}
      <Route
        path="/"
        element={<Layout currentUser={currentUser} setCurrentUser={setCurrentUser} />}
      >
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="donate/:requestId" element={<DonationForm currentUser={currentUser} />} />
        <Route path="donation/success" element={<DonationSuccess />} />
        <Route path="donation/failed" element={<DonationFailed />} />
      </Route>
    </Routes>
  );
};

export default App;
