import React from "react";
import { useTheme } from "../context/ThemeContext";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-gray-900 dark:to-gray-800 text-white shadow-lg transition-colors duration-300">
      <Link to="/dashboard" className="flex items-center gap-2 group">
        <img src="/logo.png" alt="TeamInspire Logo" className="h-12 w-auto object-contain transition-transform group-hover:scale-105" />
      </Link>

      <div className="flex items-center space-x-6">
        <Link to="/dashboard" className="hover:text-blue-200 dark:hover:text-blue-400 transition-colors duration-200">Dashboard</Link>
        <Link to="/search" className="hover:text-blue-200 dark:hover:text-blue-400 transition-colors duration-200">Search</Link>
        <Link to="/leads" className="hover:text-blue-200 dark:hover:text-blue-400 transition-colors duration-200">TeamInspire</Link>
        <Link to="/add-product" className="hover:text-blue-200 dark:hover:text-blue-400 transition-colors duration-200">Add Product</Link>
        {role === "admin" && (
          <>
            <Link to="/product-history" className="hover:text-blue-200 dark:hover:text-blue-400 transition-colors duration-200">History</Link>
            <Link to="/upload" className="hover:text-blue-200 dark:hover:text-blue-400 transition-colors duration-200">Upload</Link>
          </>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200 flex items-center gap-2"
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="text-xs uppercase font-bold bg-white/20 px-2 py-1 rounded">
            {theme}
          </span>
        </button>


        <div className="flex items-center space-x-4">
          {localStorage.getItem("name") && (
            <span className="font-medium text-blue-100 dark:text-gray-300">
              Hello, {localStorage.getItem("name")}
            </span>
          )}
        </div>

        <button
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-transform transform hover:scale-105 active:scale-95 duration-200"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;
