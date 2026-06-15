import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  X, 
  Send, 
  ArrowLeft, 
  Search, 
  User, 
  Clock, 
  Circle,
  MessageCircle,
  Phone,
  Video,
  Paperclip,
  File,
  Bot,
  Download,
  Trash2
} from "lucide-react";
import API, { API_BASE_URL } from "../../api/api";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

// Helper to generate dynamic, harmonious avatar background color based on name string
const getAvatarColor = (name) => {
  const hash = Array.from(name || "").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    "bg-indigo-500", "bg-emerald-500", "bg-sky-500", "bg-amber-500", 
    "bg-rose-500", "bg-violet-500", "bg-teal-500", "bg-cyan-500"
  ];
  return colors[hash % colors.length];
};

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);
    
    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.error("Audio chime error:", err);
  }
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // Selected user/conversation
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(localStorage.getItem("userId"));

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const activeChatRef = useRef(null);
  const fileInputRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  const [attachedFile, setAttachedFile] = useState(null); // { fileUrl, fileName, fileType }
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 📞 WebRTC Calling States
  const [callState, setCallState] = useState(null); // null, "calling", "incoming", "connected"
  const [callType, setCallType] = useState("audio"); // "audio", "video"
  const [callPartner, setCallPartner] = useState(null); // { id: String, name: String }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  const playOutgoingRingRef = useRef(null);
  const playIncomingRingRef = useRef(null);

  // Sync activeChat state to ref
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Sync isOpen state to ref
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Sync userId if it changes in localStorage
  useEffect(() => {
    const checkUserId = () => {
      const id = localStorage.getItem("userId");
      if (id !== currentUserId) {
        setCurrentUserId(id);
      }
    };
    const timer = setInterval(checkUserId, 2000);
    return () => clearInterval(timer);
  }, [currentUserId]);

  // Render streams to HTML video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // Call timer effect
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);

  // Ringtone generator helper functions
  const startOutgoingRing = () => {
    try {
      stopRingtones();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const interval = setInterval(() => {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.frequency.setValueAtTime(400, now);
        osc2.frequency.setValueAtTime(450, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
      }, 3000);
      
      playOutgoingRingRef.current = { ctx, interval };
    } catch (e) {
      console.error("Outgoing ringtone error:", e);
    }
  };

  const startIncomingRing = () => {
    try {
      stopRingtones();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const interval = setInterval(() => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.frequency.setValueAtTime(450, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.setValueAtTime(0.1, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.6);
      }, 1500);
      
      playIncomingRingRef.current = { ctx, interval };
    } catch (e) {
      console.error("Incoming ringtone error:", e);
    }
  };

  const stopRingtones = () => {
    if (playOutgoingRingRef.current) {
      clearInterval(playOutgoingRingRef.current.interval);
      playOutgoingRingRef.current.ctx.close().catch(() => {});
      playOutgoingRingRef.current = null;
    }
    if (playIncomingRingRef.current) {
      clearInterval(playIncomingRingRef.current.interval);
      playIncomingRingRef.current.ctx.close().catch(() => {});
      playIncomingRingRef.current = null;
    }
  };

  const resetCallState = () => {
    stopRingtones();
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallState(null);
    setCallType("audio");
    setCallPartner(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  // WebRTC core logic
  const getLocalMedia = async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === "video" ? { width: 320, height: 240 } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to get local media:", err);
      toast.error("Could not access camera or microphone.");
      throw err;
    }
  };

  const createPeerConnection = (partnerId, stream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log("Remote track detected:", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webRtcSignal", {
          targetId: partnerId,
          senderId: currentUserId,
          signal: { type: "candidate", candidate: event.candidate }
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (type) => {
    if (!activeChat) return;
    const partnerId = activeChat.user._id;
    const partnerName = activeChat.user.name;

    setCallState("calling");
    setCallType(type);
    setCallPartner({ id: partnerId, name: partnerName });

    startOutgoingRing();

    socketRef.current.emit("callUser", {
      callerId: currentUserId,
      calleeId: partnerId,
      callerName: localStorage.getItem("name") || "Teammate",
      type
    });
  };

  const acceptCall = async () => {
    if (!callPartner) return;
    stopRingtones();

    socketRef.current.emit("answerCall", {
      callerId: callPartner.id,
      calleeId: currentUserId,
      accept: true
    });

    try {
      const stream = await getLocalMedia(callType);
      setCallState("connected");
      createPeerConnection(callPartner.id, stream);
    } catch (err) {
      handleHangUp();
    }
  };

  const rejectCall = () => {
    if (!callPartner) return;
    socketRef.current.emit("answerCall", {
      callerId: callPartner.id,
      calleeId: currentUserId,
      accept: false
    });
    resetCallState();
  };

  const handleHangUp = () => {
    if (callPartner && socketRef.current) {
      socketRef.current.emit("endCall", { targetId: callPartner.id });
    }
    resetCallState();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleSignalingData = async ({ signal, senderId }) => {
    let pc = peerConnectionRef.current;

    try {
      if (signal.type === "offer") {
        const stream = localStream || await getLocalMedia(callType);
        if (!pc) {
          pc = createPeerConnection(senderId, stream);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current.emit("webRtcSignal", {
          targetId: senderId,
          senderId: currentUserId,
          signal: { type: "answer", sdp: pc.localDescription }
        });
      } else if (signal.type === "answer") {
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      } else if (signal.type === "candidate") {
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (err) {
      console.error("Signaling error:", err);
    }
  };

  const initiateWebRtcNegotiation = async (partnerId) => {
    try {
      const stream = await getLocalMedia(callType);
      setCallState("connected");

      const pc = createPeerConnection(partnerId, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit("webRtcSignal", {
        targetId: partnerId,
        senderId: currentUserId,
        signal: { type: "offer", sdp: pc.localDescription }
      });
    } catch (err) {
      handleHangUp();
    }
  };

  // Fetch conversations list
  const loadConversations = async (silent = false) => {
    if (!currentUserId) return;
    if (!silent) setLoadingConv(true);
    try {
      const res = await API.get("/messages/conversations");
      setConversations(res.data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  // Fetch message history for selected user
  const loadMessages = async (otherUserId) => {
    if (!currentUserId || !otherUserId) return;
    setLoadingMsgs(true);
    try {
      const res = await API.get(`/messages/${otherUserId}`);
      setMessages(res.data);
      setConversations(prev => 
        prev.map(c => c.user._id === otherUserId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  // Setup Socket.io and initial load
  useEffect(() => {
    if (!currentUserId) return;

    loadConversations();

    const socketUrl = API_BASE_URL.replace("/api", "") || window.location.origin;
    const socket = io(socketUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.emit("join", currentUserId);

    socket.on("newMessage", (msg) => {
      const currentActive = activeChatRef.current;
      const currentIsOpen = isOpenRef.current;
      
      const isChattingWithSender = currentActive && currentActive.user._id === msg.sender;

      if (isChattingWithSender || msg.sender === currentUserId) {
        setMessages(prev => [...prev, msg]);
        if (msg.sender !== currentUserId) {
          API.get(`/messages/${msg.sender}`).catch(e => console.error("Auto-read failed", e));
        }
      }

      if (msg.sender !== currentUserId) {
        playNotificationSound();
      }

      if (msg.sender !== currentUserId && (!isChattingWithSender || !currentIsOpen)) {
        const senderLabel = msg.senderName || "Teammate";
        const msgText = msg.text || (msg.fileUrl ? "sent an attachment" : "sent a message");
        toast(`New message from ${senderLabel}: "${msgText}"`, {
          icon: "💬",
          duration: 4000
        });
      }
      
      loadConversations(true);
    });

    socket.on("messagesRead", ({ readerId }) => {
      const currentActive = activeChatRef.current;
      if (currentActive && currentActive.user._id === readerId) {
        setMessages(prev => prev.map(m => m.sender === currentUserId ? { ...m, read: true } : m));
      }
    });

    socket.on("messageDeleted", ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
      loadConversations(true);
    });

    // 📞 WebRTC Signaling socket events
    socket.on("incomingCall", ({ callerId, callerName, type }) => {
      setCallState("incoming");
      setCallType(type);
      setCallPartner({ id: callerId, name: callerName });
      setIsOpen(true);
      startIncomingRing();
    });

    socket.on("callResponse", ({ calleeId, accept }) => {
      stopRingtones();
      if (accept) {
        initiateWebRtcNegotiation(calleeId);
      } else {
        toast.error("Call declined.");
        resetCallState();
      }
    });

    socket.on("webRtcSignal", ({ signal, senderId }) => {
      handleSignalingData({ signal, senderId });
    });

    socket.on("callEnded", () => {
      toast.error("Call ended.");
      resetCallState();
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/messages/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setAttachedFile(res.data);
      toast.success("File uploaded successfully!");
    } catch (err) {
      console.error("File upload failed:", err);
      toast.error("Failed to upload file.");
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat) return;
    if (!inputText.trim() && !attachedFile) return;

    const recipientId = activeChat.user._id;
    const textToSend = inputText.trim();
    const fileToSend = attachedFile;

    setInputText("");
    setAttachedFile(null);

    try {
      await API.post("/messages", {
        recipient: recipientId,
        text: textToSend,
        fileUrl: fileToSend?.fileUrl || "",
        fileName: fileToSend?.fileName || "",
        fileType: fileToSend?.fileType || ""
      });
    } catch (err) {
      console.error("Message send failed:", err);
      toast.error("Failed to send message.");
    }
  };

  const handleDeleteMessage = async (messageId, type) => {
    try {
      await API.delete(`/messages/${messageId}?type=${type}`);
      setMessages(prev => prev.filter(m => m._id !== messageId));
      loadConversations(true);
      setDeleteTarget(null);
      toast.success("Message deleted successfully");
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message");
    }
  };

  const handleSelectChat = (conv) => {
    setActiveChat(conv);
    loadMessages(conv.user._id);
  };

  const handleBackToList = () => {
    setActiveChat(null);
    setMessages([]);
    loadConversations(true);
  };

  const filteredConversations = conversations.filter((c) =>
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!currentUserId) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            loadConversations();
          }}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:scale-110 active:scale-95 text-white rounded-full shadow-2xl transition-all duration-300 relative group cursor-pointer"
          title="Open Chat"
        >
          <MessageSquare size={24} className="group-hover:rotate-12 transition-transform duration-200" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-black shadow-lg animate-bounce border-2 border-white dark:border-gray-900">
              {totalUnreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="w-[370px] max-w-[calc(100vw-2rem)] h-[520px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden relative transition-all duration-300 transform translate-y-0 scale-100 shadow-blue-500/10">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-gray-900 dark:to-gray-800 text-white flex items-center justify-between border-b border-blue-500/10 shadow-md">
            <div className="flex items-center gap-3">
              {activeChat ? (
                <button 
                  onClick={handleBackToList}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-90"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <MessageCircle size={22} className="text-blue-200" />
              )}
              <div>
                {activeChat ? (
                  <>
                    <h3 className="font-bold text-sm tracking-wide leading-none mb-1 truncate max-w-[190px]">
                      {activeChat.user.name}
                    </h3>
                    <p className="text-[10px] text-blue-200 dark:text-gray-400 capitalize font-medium">
                      {activeChat.user.role}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-sm tracking-wide leading-none">Internal Team Chat</h3>
                    <p className="text-[10px] text-blue-200 dark:text-gray-400 font-medium">Instant messaging</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {activeChat && (
                <>
                  <button 
                    type="button"
                    onClick={() => startCall("audio")}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer text-blue-100 hover:text-white"
                    title="Audio Call"
                  >
                    <Phone size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => startCall("video")}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer text-blue-100 hover:text-white mr-1"
                    title="Video Call"
                  >
                    <Video size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => toast.error("AI Chatbot is currently disabled.")}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer text-blue-100 hover:text-white opacity-40 mr-1"
                    title="AI Chatbot (Disabled)"
                  >
                    <Bot size={16} />
                  </button>
                </>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-90 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
            {!activeChat ? (
              <>
                <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center">
                  <div className="relative w-full flex items-center bg-gray-100 dark:bg-gray-900 rounded-xl px-3 py-2">
                    <Search size={16} className="text-gray-400 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Search teammates..." 
                      className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-white placeholder-gray-400 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {loadingConv ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-blue-500 border-gray-300"></div>
                      <span>Loading teammates...</span>
                    </div>
                  ) : (
                    <>
                      {("ai chatbot").includes(searchQuery.toLowerCase()) && (
                        <div
                          onClick={() => toast.error("AI Chatbot is currently disabled.")}
                          className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-gray-800/40 opacity-65 rounded-2xl cursor-not-allowed border border-dashed border-gray-200 dark:border-gray-700"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gray-400 dark:bg-gray-600 font-bold text-sm shrink-0 shadow-sm">
                            <Bot size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <h4 className="font-bold text-xs text-gray-500 dark:text-gray-400 truncate">
                                AI CRM Assistant
                              </h4>
                              <span className="text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                Disabled
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mb-0.5">
                              SYSTEM BOT
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic truncate">
                              Ask questions about your CRM data (disabled)
                            </p>
                          </div>
                        </div>
                      )}

                      {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                          <div
                            key={conv.user._id}
                            onClick={() => handleSelectChat(conv)}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700/50 group"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm transition-transform group-hover:scale-105 ${getAvatarColor(conv.user.name)}`}>
                              {conv.user.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <h4 className="font-bold text-xs text-gray-800 dark:text-white truncate max-w-[140px]">
                                  {conv.user.name}
                                </h4>
                                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold">
                                  {formatTime(conv.lastMessage?.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mb-0.5">
                                  {conv.user.role}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <span className="bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shrink-0 min-w-4 text-center">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[190px]">
                                {conv.lastMessage ? (
                                  conv.lastMessage.sender === currentUserId 
                                    ? `You: ${conv.lastMessage.text}` 
                                    : conv.lastMessage.text
                                ) : (
                                  <span className="italic text-gray-400 dark:text-gray-600">No messages yet</span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                          <User size={30} className="stroke-1 opacity-50 mb-2" />
                          <span className="text-xs">No teammates found</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col bg-gray-50 dark:bg-gray-900/50">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-blue-500 border-gray-300 mr-2"></div>
                      <span>Loading messages...</span>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg, index) => {
                      const isMe = msg.sender === currentUserId;
                      return (
                        <div 
                          key={msg._id || index} 
                          className={`flex items-center gap-1.5 group/msg max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                        >
                          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} min-w-0`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-xs font-normal leading-relaxed shadow-sm break-words flex flex-col gap-1.5 ${
                              isMe 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none" 
                                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700/50"
                            }`}>
                              {msg.fileUrl && (
                                <div className="mb-0.5">
                                  {msg.fileType?.startsWith("image/") ? (
                                    <div className="relative group/img shadow-sm rounded-xl overflow-hidden">
                                      <img 
                                        src={`${API_BASE_URL.replace("/api", "")}${msg.fileUrl}`} 
                                        alt={msg.fileName} 
                                        className="max-w-full max-h-[160px] object-cover cursor-pointer hover:opacity-90 transition-opacity border border-black/5 dark:border-white/10"
                                        onClick={() => window.open(`${API_BASE_URL.replace("/api", "")}${msg.fileUrl}`, "_blank")}
                                      />
                                      <a 
                                        href={`${API_BASE_URL.replace("/api", "")}${msg.fileUrl}`} 
                                        download={msg.fileName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md flex items-center justify-center cursor-pointer"
                                        title="Download Image"
                                      >
                                        <Download size={13} />
                                      </a>
                                    </div>
                                  ) : (
                                    <a 
                                      href={`${API_BASE_URL.replace("/api", "")}${msg.fileUrl}`} 
                                      download={msg.fileName}
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className={`flex items-center gap-2 p-2 rounded-xl border font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                        isMe 
                                          ? "bg-white/10 border-white/20 text-white hover:bg-white/20" 
                                          : "bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-900/80"
                                      }`}
                                    >
                                      <File size={16} className={isMe ? "text-white" : "text-blue-500"} />
                                      <span className="underline truncate max-w-[140px] text-[11px]">
                                        {msg.fileName}
                                      </span>
                                      <Download size={12} className="shrink-0 opacity-70" />
                                    </a>
                                  )}
                                </div>
                              )}
                              {msg.text && <div>{msg.text}</div>}
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400 dark:text-gray-500 font-semibold px-1">
                              <span>{formatTime(msg.createdAt)}</span>
                              {isMe && (
                                <span className="text-[10px]" title={msg.read ? "Read" : "Delivered"}>
                                  {msg.read ? " • Read" : " • Sent"}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(msg)}
                            className="opacity-0 group-hover/msg:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-red-500 transition-all cursor-pointer shrink-0"
                            title="Delete Message"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center py-10">
                      <MessageSquare size={30} className="stroke-1 opacity-40 mb-2" />
                      <span className="text-xs">Say hello!</span>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">Send a message to start a conversation with {activeChat.user.name}.</p>
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>

                {attachedFile && (
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 shadow-inner">
                    <div className="flex items-center gap-2 min-w-0">
                      <File size={16} className="text-blue-500 shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[240px] font-semibold">
                        {attachedFile.fileName}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAttachedFile(null)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {uploadingFile && (
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-blue-500 border-gray-300 shrink-0"></div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Uploading attachment...</span>
                  </div>
                )}

                <form 
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                    title="Attach File"
                  >
                    <Paperclip size={18} />
                  </button>

                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-xs px-4 py-2.5 rounded-2xl outline-none text-gray-700 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile) || uploadingFile}
                    className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                      (inputText.trim() || attachedFile) && !uploadingFile
                        ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md hover:scale-105 active:scale-95" 
                        : "bg-gray-100 dark:bg-gray-900 text-gray-300 dark:text-gray-700 cursor-not-allowed"
                    }`}
                  >
                    <Send size={14} className={inputText.trim() ? "translate-x-[0.5px]" : ""} />
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteTarget && (
            <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-2xl max-w-[280px] w-full border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Trash2 size={16} className="text-red-500" />
                  Delete message?
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                  Do you want to delete this message?
                </p>
                <div className="flex flex-col gap-2">
                  {deleteTarget.sender === currentUserId && (
                    <button
                      onClick={() => handleDeleteMessage(deleteTarget._id, "everyone")}
                      className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition active:scale-98 cursor-pointer shadow-sm shadow-rose-500/10"
                    >
                      Delete for Everyone
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMessage(deleteTarget._id, "me")}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition active:scale-98 cursor-pointer"
                  >
                    Delete for Me
                  </button>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="w-full py-2 bg-transparent text-gray-500 dark:text-gray-400 font-semibold rounded-xl text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 📞 Real-time Calling Overlay */}
          {callState && (
            <div className="absolute inset-0 bg-gray-950/95 z-[999] flex flex-col justify-between text-white p-6 animate-fade-in">
              <div className="flex flex-col items-center mt-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-3xl shadow-2xl relative mb-4">
                  {callPartner?.name?.charAt(0).toUpperCase() || "U"}
                  {callState === "calling" && (
                    <div className="absolute inset-0 rounded-full border border-blue-500 animate-ping"></div>
                  )}
                </div>
                <h3 className="text-xl font-bold">{callPartner?.name || "Teammate"}</h3>
                <p className="text-xs text-gray-400 mt-2 tracking-widest font-black uppercase">
                  {callState === "calling" && `Calling via ${callType}...`}
                  {callState === "incoming" && `Incoming ${callType} Call...`}
                  {callState === "connected" && `${callType.toUpperCase()} CALL CONNECTED`}
                </p>
                {callState === "connected" && (
                  <p className="text-sm text-green-400 font-bold tracking-widest mt-2">{formatDuration(callDuration)}</p>
                )}
              </div>

              {callState === "connected" && callType === "video" && (
                <div className="flex-1 my-4 relative rounded-2xl overflow-hidden bg-black border border-gray-800">
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="absolute bottom-4 right-4 w-24 h-32 object-cover rounded-xl border border-white/20 shadow-xl"
                  />
                </div>
              )}

              {callState === "connected" && callType === "audio" && (
                <>
                  <audio ref={remoteVideoRef} autoPlay />
                  <div className="flex-1 flex items-center justify-center my-4">
                    <div className="flex items-center gap-1.5 h-16">
                      <div className="w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ height: '30%', animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0.2s' }}></div>
                      <div className="w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ height: '80%', animationDelay: '0.3s' }}></div>
                      <div className="w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '0.4s' }}></div>
                      <div className="w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ height: '70%', animationDelay: '0.5s' }}></div>
                      <div className="w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ height: '90%', animationDelay: '0.6s' }}></div>
                      <div className="w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ height: '50%', animationDelay: '0.7s' }}></div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-center items-center gap-6 mb-8">
                {callState === "incoming" ? (
                  <>
                    <button 
                      onClick={rejectCall}
                      className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                      title="Decline"
                    >
                      <X size={24} />
                    </button>
                    <button 
                      onClick={acceptCall}
                      className="w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer animate-pulse"
                      title="Accept"
                    >
                      <Phone size={24} />
                    </button>
                  </>
                ) : (
                  <>
                    {callState === "connected" && (
                      <button 
                        onClick={toggleMute}
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition active:scale-95 cursor-pointer ${
                          isMuted ? "bg-red-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                      >
                        <Phone size={18} className={isMuted ? "rotate-45" : ""} />
                      </button>
                    )}
                    
                    <button 
                      onClick={handleHangUp}
                      className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                      title="End Call"
                    >
                      <X size={24} />
                    </button>
                    
                    {callState === "connected" && callType === "video" && (
                      <button 
                        onClick={toggleVideo}
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition active:scale-95 cursor-pointer ${
                          isVideoOff ? "bg-red-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                        title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                      >
                        <Video size={18} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
