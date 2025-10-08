import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Import the 3 separate apps
import CustomerApp from "./apps/customer/CustomerApp";
import PharmacyApp from "./apps/pharmacy/PharmacyApp";
import DriverApp from "./apps/driver/DriverApp";
import MainLanding from "./pages/MainLanding";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLanding />} />
        <Route path="/customer/*" element={<CustomerApp />} />
        <Route path="/pharmacy/*" element={<PharmacyApp />} />
        <Route path="/driver/*" element={<DriverApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
