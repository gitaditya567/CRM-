import React, { useState } from "react";
import Skeleton from '../components/common/Skeleton';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Package, Database, BarChart3, ClipboardList, Zap, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MouseFollower = () => {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      <motion.div
        animate={{ x: mousePos.x - 250, y: mousePos.y - 250 }}
        transition={{ type: "spring", damping: 30, stiffness: 50, mass: 0.5 }}
        className="absolute w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen"
      />
    </>
  );
};

const FloatingIcon = ({ Icon, x, y, delay }) => (
  <motion.div
    initial={{ x, y, opacity: 0 }}
    animate={{ 
      y: [y, y - 40, y],
      opacity: [0, 0.15, 0],
      rotate: [0, 10, -10, 0]
    }}
    transition={{ 
      duration: 8, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut" 
    }}
    className="absolute text-blue-400 pointer-events-none"
  >
    <Icon size={48} strokeWidth={1} />
  </motion.div>
);

const AlertModal = ({ isOpen, onClose, message }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 0 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            mass: 1
          }}
          className="relative bg-[#0f172a] border border-red-500/30 rounded-[32px] p-8 max-w-sm w-full shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center relative group">
              <div className="absolute inset-0 rounded-3xl bg-red-500/20 blur-xl group-hover:blur-2xl transition-all" />
              <AlertCircle size={40} className="text-red-500 relative z-10" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">Invalid Password</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">
                {message || "The security key you entered is incorrect. Please double-check and try again."}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Try Again</span>
              <X size={18} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Email and password required");
      setShowAlert(true);
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/login", { email, password, accessCode });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);
      localStorage.setItem("permissions", JSON.stringify(res.data.permissions || []));
      localStorage.setItem("rolePermissions", JSON.stringify(res.data.rolePermissions || {}));
      localStorage.setItem("uiSettings", JSON.stringify(res.data.uiSettings || null));

      const role = (res.data.role || "").toLowerCase();
      if (role === 'sales' || role === 'services') {
        navigate("/sales-dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      const msg = err.response?.data?.message || "Invalid credentials";
      setError(msg);
      setShowAlert(true);
      setPassword(""); // Clear password on error
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] overflow-hidden relative font-sans">
      
      {/* Professional Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 opacity-40 bg-cover bg-center mix-blend-luminosity"
        style={{ backgroundImage: `url('/tech_inventory_bg_1777447007129.png')` }}
      />

      {/* Interactive Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
        
        {/* Floating Icons */}
        <FloatingIcon Icon={Package} x="10%" y="20%" delay={0} />
        <FloatingIcon Icon={Database} x="85%" y="15%" delay={2} />
        <FloatingIcon Icon={BarChart3} x="75%" y="80%" delay={4} />
        <FloatingIcon Icon={ClipboardList} x="15%" y="75%" delay={1} />
        <FloatingIcon Icon={Zap} x="50%" y="10%" delay={3} />

        {/* Animated Perspective Grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(30, 58, 138, 0.2) 1px, transparent 1px), 
                              linear-gradient(to bottom, rgba(30, 58, 138, 0.2) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
            transform: 'perspective(1000px) rotateX(65deg) translateY(-100px) scale(2.5)',
            animation: 'grid-scroll 15s linear infinite'
          }}
        />

        {/* Dynamic Mouse-Following Blobs */}
        <MouseFollower />
      </div>

      {/* Main Login Card */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[420px] p-1"
      >
        <div className="bg-white/[0.03] backdrop-blur-2xl p-10 rounded-[32px] shadow-2xl border border-white/10 relative overflow-hidden group">
          
          {/* Subtle reflection effect */}
          <div className="absolute -inset-x-full top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:inset-x-full transition-all duration-1000 ease-in-out" />

          {/* Logo & Header */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-10">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="bg-white p-4 rounded-2xl shadow-xl mb-6"
            >
              <img src="/logo.png" alt="TeamInspire Logo" className="h-10 w-auto object-contain" />
            </motion.div>
            <h2 className="text-3xl font-black text-white text-center tracking-tight">Access Control</h2>
            <p className="text-gray-400 text-sm mt-2 font-medium">Log in to manage your inventory assets</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Identity</label>
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/[0.05] transition-all duration-300 font-medium"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Secret Key</label>
                <button type="button" className="text-[10px] font-black text-blue-500 uppercase hover:text-blue-400 transition-colors tracking-tight">Forgot Key?</button>
              </div>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/[0.05] transition-all duration-300 font-medium"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Access Code (If required)</label>
              <div className="relative group/input">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/[0.05] transition-all duration-300 font-medium"
                  placeholder="Enter Access Code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-2 px-1 pt-1">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="remember" className="text-xs text-gray-400 font-bold cursor-pointer">Trust this device</label>
            </motion.div>

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl text-white font-black shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group ${loading
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
                }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <span>Initialize Portal</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <motion.div 
            variants={itemVariants}
            className="mt-10 flex flex-col items-center gap-4 border-t border-white/5 pt-6"
          >
            <div className="flex items-center gap-2 text-gray-500">
              <ShieldCheck size={14} className="text-green-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Cloud Environment</span>
            </div>
            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.2em]">
              Developed by Aditya Sharma © 2026
            </p>
          </motion.div>
        </div>
        
        {/* Footer info decoration */}
        <div className="mt-6 flex justify-center gap-6">
           <div className="h-1 w-12 bg-white/10 rounded-full" />
           <div className="h-1 w-4 bg-blue-500 rounded-full" />
           <div className="h-1 w-12 bg-white/10 rounded-full" />
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        @keyframes grid-scroll {
          from { background-position: 0 0; }
          to { background-position: 0 60px; }
        }
      `}} />

      <AlertModal 
        isOpen={showAlert} 
        onClose={() => setShowAlert(false)} 
        message={error}
      />
    </div>
  );
};

export default Login;
