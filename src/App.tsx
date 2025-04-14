import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PDFView from './pages/PDFView';
import SharedPDF from './pages/SharedPDF';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pdf/:id" element={<PDFView />} />
          </Route>
          <Route path="/shared/:id" element={<SharedPDF />} />
        </Routes>
      </Router>
      <Toaster position="top-center" />
    </>
  );
}

export default App;