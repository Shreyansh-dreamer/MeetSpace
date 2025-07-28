import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

function Navbar({ theme, changeTheme, onContactClick, onLoginClick, onSignupClick }) {
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    changeTheme(newTheme);
  };

  const getThemeIcon = () => {
    return theme === 'light'
      ? <LightModeIcon className="text-yellow-500" />:
      <DarkModeIcon className="text-blue-400" />; 
  };

  return (
    <div className="w-full h-[4.5rem] bg-white dark:bg-black text-black dark:text-white border-b-2 border-gray-200 dark:border-gray-700 fixed top-0 z-10 duration-300">
      <div className="flex justify-between md:justify-around items-center h-full">
        {/* Brand */}
        <div className="flex items-center group transition-transform hover:scale-105">
        <div className="relative cursor-pointer">
          <img 
            src="logo-removebg-preview.png" 
            alt="Meet Space Logo" 
            className="w-[7rem] h-[8rem] mt-4 object-contain transition-transform group-hover:rotate-12" 
          />
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
        <div className="ml-3">
          <h1 className="font-semibold text-black dark:text-white tracking-wide">
            <span className="text-xl cursor-pointer">MeetSpace</span>
          </h1>
          <div className="h-0.5 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>
      </div>
        {/* Links and Theme Toggle */}
        <div className="flex items-center gap-[0.8rem] md:gap-[1.5rem]">
          <button
            onClick={onContactClick}
            className="font-semibold cursor-pointer text-gray-600 dark:text-white hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
            style={{ background: 'none', border: 'none', boxShadow: 'none' }}
          >
            Contact
          </button>

          <a onClick={onSignupClick} className="font-semibold cursor-pointer text-gray-500 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Signup
          </a>
          <a onClick={onLoginClick} className="font-semibold cursor-pointer text-gray-500 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Login
          </a>
          <button
            onClick={toggleTheme}
            className="flex items-center text-black dark:text-white transition-colors"
            style={{ background: 'none', border: 'none', boxShadow: 'none' }}
            title="Toggle Theme"
          >
            {getThemeIcon()}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navbar;