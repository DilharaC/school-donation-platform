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
import SchoolDonations from "../pages/schoolpages/donations";

import MyRequests from "../pages/schoolpages/myrequests";
import SchoolDocuments from "../pages/schoolpages/documents";
import SchoolSettings from "../pages/schoolpages/settings";

import Donors from "../pages/adminpages/Donors";
import Analytics from "../pages/adminpages/analytics";
import Schools from "../pages/adminpages/schools";
import SchoolLayout from "../schooldashboardcomponents/SchoolLayout";
import DonorOverview from "./DonorOverview";
import DonorLayout from "../donorcomponents/donorLayout";

import MyDonations from "../pages/donorpages/mydonations";
import DonorSettings from "../pages/donorpages/settings";
import DonorSchools from "../pages/donorpages/schools";
import MinistryLayout from "../ministrycomponents/ministryLayout";
import MinistryOverview from "./MinistryOverview";
import MinistrySchools from "../pages/ministrypages/schools";
import MinistryDonors from "../pages/ministrypages/donors";
import MinistryCampaigns from "../pages/ministrypages/campaigns";
import MinistryDonations from "../pages/ministrypages/donations";
import MinistryAnalytics from "../pages/ministrypages/analytics";
import MinistryReports from "../pages/ministrypages/reports";
import AdminAuditTrail from "../pages/adminpages/audit";
import Notifications from "../pages/adminpages/notifications";
import DonorNotifications from "../pages/donorpages/donornotifications";
import SchoolNotifications from "../pages/schoolpages/schoolnotifications";
// import MinistryNotifications from "../pages/ministrypages/notifications";

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
         
          <Route path="notifications" element={<Notifications />} />
          
          <Route path="audit" element={<AdminAuditTrail />} />


         

 
          {/* Add other admin pages here */}
        </Route>

         {/* ================= SCHOOL ================= */}
  <Route path="/school" element={<SchoolLayout />}>
    <Route index element={<Navigate to="schooloverview" />} />
    <Route path="schooloverview" element={<SchoolOverview />} />
    <Route path="myschool" element={<MySchool />} />
    <Route path="myrequests" element={<MyRequests />} />
    <Route path="donations" element={<SchoolDonations />} />
    <Route path="documents" element={<SchoolDocuments />} />
    <Route path="notifications" element={<SchoolNotifications />} />
    <Route path="settings" element={<SchoolSettings />} />
  </Route>


  <Route path="/donor" element={<DonorLayout />}>
  <Route index element={<DonorOverview />} />
  <Route path="overview" element={<DonorOverview />} />
  <Route path="mydonations" element={<MyDonations />} />
  <Route path="schools" element={<DonorSchools/>} />
  <Route path="settings" element={<DonorSettings />} />
  <Route path="donornotifications" element={<DonorNotifications />} />

  {/* other routes */}
</Route>

   

<Route path="/ministry" element={<MinistryLayout />}>
 <Route index element={<MinistryOverview />} />
  <Route path="overview" element={<MinistryOverview />} />
  <Route path="schools" element={<MinistrySchools />} />
  <Route path="donors" element={<MinistryDonors />} />
  <Route path="campaigns" element={<MinistryCampaigns />} />
  <Route path="donations" element={<MinistryDonations />} />
  <Route path="analytics" element={<MinistryAnalytics />} />
  <Route path="reports" element={<MinistryReports />} />
  {/* <Route path="notifications" element={<MinistryNotifications />} />
  <Route path="settings" element={<MinistrySettings />} /> */}
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
