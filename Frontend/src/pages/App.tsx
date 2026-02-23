import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import AdminLayout from "../admincomponents/adminLayout";
import Donations from "../pages/adminpages/donations";
import Home from "./Home";
import Projects from "./Projects";
import Login from "./Login";
import DonationForm from "./DonationForm";
import DonationSuccess from "./DonationSuccess";
import DonationFailed from "./DonationFailed";
import AdminDashboard from "../pages/AdminDashboard";
import SchoolOverview from "../pages/SchoolOverview";

import Campaign from "../pages/adminpages/Campaign";
import Reports from "../pages/adminpages/reports";
import MySchool from "../pages/schoolpages/myschool";

import MyRequests from "../pages/schoolpages/myrequests";

import Donors from "../pages/adminpages/Donors";
import Analytics from "../pages/adminpages/analytics";
import Schools from "../pages/adminpages/schools";
import SchoolLayout from "../schooldashboardcomponents/SchoolLayout";



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
       {/* Admin Dashboard */}
    <Route path="/admin" element={<AdminDashboard />} />
    

      {/* Login page */}
      <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
   {/* Admin Pages */}
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/overview" />} />
          <Route path="overview" element={<AdminDashboard />} />
          <Route path="donations" element={<Donations/>} />
         
          <Route path="reports" element={<Reports/>} />
          
            <Route path="schools" element={<Schools/>} />
          <Route path="analytics" element={<Analytics/>} />
          <Route path="Campaign" element={<Campaign />} />
          <Route path="Donors" element={<Donors />} />


         

 
          {/* Add other admin pages here */}
        </Route>

         {/* ================= SCHOOL ================= */}
  <Route path="/school" element={<SchoolLayout />}>
    <Route index element={<Navigate to="schooloverview" />} />
    <Route path="schooloverview" element={<SchoolOverview />} />
    <Route path="myschool" element={<MySchool />} />
    <Route path="myrequests" element={<MyRequests />} />
    {/* <Route path="donations" element={<SchoolDonations />} />
    <Route path="documents" element={<SchoolDocuments />} />
    <Route path="notifications" element={<SchoolNotifications />} />
    <Route path="settings" element={<SchoolSettings />} /> */}
  </Route>

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
