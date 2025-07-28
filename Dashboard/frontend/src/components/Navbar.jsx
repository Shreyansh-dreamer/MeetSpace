import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useTheme } from '../ThemeContext';
import { NavLink } from "react-router-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const res = await axios.post("http://localhost:3000/logout", {}, {
        withCredentials: true,
      });
      if (res.status === 200) {
        window.location.href = "http://localhost:5173"; // or use navigate('/')
      }
    } catch (err) {
      console.error("Logout failed:", err.response?.data || err.message);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-gradient-to-r from-[#3359f8] via-[#4c6fff] to-[#5a7cff] dark:from-[#1a2b6d] dark:via-[#1f348e] dark:to-[#243fa5] border-b border-white/20 dark:border-blue-400/20 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          
          {/* Left - Logo + Brand */}
          <NavLink to="/" className="flex items-center group transition-transform hover:scale-105">
            <div className="flex items-center">
              <div className="relative">
                <img 
                  src="/logo-removebg-preview.png" 
                  alt="Meet Space Logo" 
                  className="w-[7rem] h-[8rem] mt-4 object-contain transition-transform group-hover:rotate-12" 
                />
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-white tracking-wide">
                  MeetSpace
                </h1>
                <div className="h-0.5 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </div>
            </div>
          </NavLink>

          {/* Right - Controls */}
          <div className="flex items-center space-x-2">
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="relative p-2.5 rounded-full hover:bg-white/10 dark:hover:bg-blue-400/10 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-white/30 dark:focus:ring-blue-400/30"
              aria-label="Toggle theme"
            >
              <div className="relative">
                {isDark ? (
                  <DarkModeIcon className="text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                ) : (
                  <LightModeIcon className="text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                )}
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-red-500/15 dark:hover:bg-red-400/15 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-white/30 dark:focus:ring-red-400/30"
              aria-label="Logout"
            >
              <ExitToAppIcon className="text-white group-hover:text-red-200 transition-colors" />
              <span className="font-medium text-white group-hover:text-red-200 transition-colors hidden sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-blue-400/40"></div>
    </nav>
  );
};

export default Navbar;