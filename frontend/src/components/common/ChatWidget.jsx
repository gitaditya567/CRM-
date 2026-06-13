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
  Bot
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

  // Sync activeChat state to ref so socket event handler always gets the latest active user
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Sync isOpen state to ref
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Sync userId if it changes in localStorage (e.g. login/logout)
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

  // Fetch list of conversations
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
      // After loading, mark as read by updating our conversation list counts
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

    // Join personal room for messages
    socket.emit("join", currentUserId);

    socket.on("newMessage", (msg) => {
      const currentActive = activeChatRef.current;
      const currentIsOpen = isOpenRef.current;
      
      const isChattingWithSender = currentActive && currentActive.user._id === msg.sender;

      // If we are currently chatting with the sender or we sent the message
      if (
        isChattingWithSender || 
        msg.sender === currentUserId
      ) {
        setMessages(prev => [...prev, msg]);
        
        // If received, mark as read in database
        if (msg.sender !== currentUserId) {
          API.get(`/messages/${msg.sender}`).catch(e => console.error("Auto-read failed", e));
        }
      }

      // Play alert sound if received from another user
      if (msg.sender !== currentUserId) {
        playNotificationSound();
      }

      // If received a message and NOT currently chatting with the sender OR the chat panel is closed
      if (msg.sender !== currentUserId && (!isChattingWithSender || !currentIsOpen)) {
        const senderLabel = msg.senderName || "Teammate";
        const msgText = msg.text || (msg.fileUrl ? "sent an attachment" : "sent a message");
        toast(`New message from ${senderLabel}: "${msgText}"`, {
          icon: "💬",
          duration: 4000
        });
      }
      
      // Always refresh conversations list in background to update previews/unread counts
      loadConversations(true);
    });

    socket.on("messagesRead", ({ readerId }) => {
      const currentActive = activeChatRef.current;
      if (currentActive && currentActive.user._id === readerId) {
        setMessages(prev => prev.map(m => m.sender === currentUserId ? { ...m, read: true } : m));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Total unread count for floating badge
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
      setAttachedFile(res.data); // { fileUrl, fileName, fileType }
      toast.success("File uploaded successfully!");
    } catch (err) {
      console.error("File upload failed:", err);
      toast.error("Failed to upload file.");
    } finally {
      setUploadingFile(false);
      // Reset input value to allow selecting same file again
      if (e.target) e.target.value = "";
    }
  };

  // Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat) return;
    if (!inputText.trim() && !attachedFile) return;

    const recipientId = activeChat.user._id;
    const textToSend = inputText.trim();
    const fileToSend = attachedFile;

    setInputText(""); // Instant UI clear
    setAttachedFile(null); // Clear attached file preview

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

  // Open a specific user chat
  const handleSelectChat = (conv) => {
    setActiveChat(conv);
    loadMessages(conv.user._id);
  };

  // Go back to conversation list
  const handleBackToList = () => {
    setActiveChat(null);
    setMessages([]);
    loadConversations(true);
  };

  // Filter user list based on search query
  const filteredConversations = conversations.filter((c) =>
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format message time (e.g. "10:35 AM" or "Yesterday")
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    // Return date format
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (!currentUserId) return null; // Do not show for logged out/guest users

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button (FAB) */}
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

      {/* Main Chat Panel */}
      {isOpen && (
        <div className="w-[370px] max-w-[calc(100vw-2rem)] h-[520px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300 transform translate-y-0 scale-100 shadow-blue-500/10">
          
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
                    onClick={() => toast(`Calling ${activeChat.user.name}... Audio call feature coming soon!`, { icon: "📞" })}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer text-blue-100 hover:text-white"
                    title="Audio Call"
                  >
                    <Phone size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => toast(`Starting video call with ${activeChat.user.name}... Video call feature coming soon!`, { icon: "📹" })}
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
              /* --- User List View --- */
              <>
                {/* Search Bar */}
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

                {/* Users list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {loadingConv ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-blue-500 border-gray-300"></div>
                      <span>Loading teammates...</span>
                    </div>
                  ) : (
                    <>
                      {/* AI Chatbot Prepend (Disabled) */}
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
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm transition-transform group-hover:scale-105 ${getAvatarColor(conv.user.name)}`}>
                              {conv.user.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Content */}
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
              /* --- Conversation View --- */
              <>
                {/* Messages scroll pane */}
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
                          className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                        >
                          <div className={`px-4 py-2.5 rounded-2xl text-xs font-normal leading-relaxed shadow-sm break-words flex flex-col gap-1.5 ${
                            isMe 
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none" 
                              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700/50"
                          }`}>
                            {msg.fileUrl && (
                              <div className="mb-0.5">
                                {msg.fileType?.startsWith("image/") ? (
                                  <img 
                                    src={`${API_BASE_URL.replace("/api", "")}${msg.fileUrl}`} 
                                    alt={msg.fileName} 
                                    className="max-w-full max-h-[160px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity border border-black/5 dark:border-white/10 shadow-sm"
                                    onClick={() => window.open(`${API_BASE_URL.replace("/api", "")}${msg.fileUrl}`, "_blank")}
                                  />
                                ) : (
                                  <a 
                                    href={`${API_BASE_URL.replace("/api", "")}${msg.fileUrl}`} 
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

                {/* Composer */}
                {/* Upload Preview & Progress */}
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

                {/* Composer */}
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
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
