import { useState, useEffect, useRef } from "react";
import { X, Sun, Moon, Send } from "lucide-react";
import { socket } from "../socket";

const ChatSection = ({ roomId, userName, messages, setMessages,showChat, setShowChat }) => {
    const [input, setInput] = useState("");
    const [darkMode, setDarkMode] = useState(() => {
        localStorage.getItem("chat-dark-mode") === "true"
        return true;
    });
    const messagesEndRef = useRef();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        localStorage.setItem("chat-dark-mode", darkMode);
    }, [darkMode]);

    const sendMessage = () => {
        if (!input.trim()) return;
        const message = { user: userName || "Anonymous", text: input };
        socket.emit("send-message", { roomId, message });
        setInput("");
    };

    const handleClose = () => {
        if (showChat) {
            setShowChat(false);
        }
    };

    const containerClasses = darkMode
        ? "bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 text-slate-50"
        : "bg-gradient-to-b from-white to-gray-50 border-gray-200 text-gray-900";
    
    const myMsgClasses = darkMode
        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
        : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md";
    
    const otherMsgClasses = darkMode
        ? "bg-gradient-to-r from-slate-700 to-slate-600 text-slate-100 shadow-lg"
        : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 shadow-md";

    return (
        <div
            className={`fixed right-0 top-0 h-full w-full shadow-2xl border-l z-50 flex flex-col transition-all duration-300 ${containerClasses}`}
            style={{
                width:"420px",
                minWidth: 360,
                maxWidth: 480,
                boxShadow: "0 8px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.1)",
            }}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b backdrop-blur-sm ${
                darkMode 
                    ? "border-slate-700 bg-slate-800/80" 
                    : "border-gray-200 bg-white/80"
            }`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">💬</span>
                    </div>
                    <span className="text-lg font-bold tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Meeting Chat
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Dark/Light mode toggle */}
                    <button
                        onClick={() => setDarkMode(d => !d)}
                        className={`p-2 rounded-full transition-all duration-200 ${
                            darkMode 
                                ? "bg-slate-700 hover:bg-slate-600 text-yellow-400" 
                                : "bg-gray-100 hover:bg-gray-200 text-orange-500"
                        }`}
                        title="Toggle theme"
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className={`p-2 rounded-full transition-all duration-200 hover:rotate-90 ${
                            darkMode 
                                ? "bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white" 
                                : "bg-gray-100 hover:bg-red-500 text-gray-600 hover:text-white"
                        }`}
                        title="Close chat"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div
                className={`flex-1 p-4 overflow-y-auto flex flex-col gap-3 ${
                    darkMode ? "bg-slate-900/50" : "bg-gray-50/50"
                }`}
                style={{ 
                    scrollbarWidth: "thin",
                    scrollbarColor: darkMode ? "#64748b #334155" : "#cbd5e1 #f1f5f9"
                }}
            >
                {messages.length === 0 ? (
                    <div className={`text-center py-8 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                        <div className="text-4xl mb-2">💬</div>
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, i) =>
                        msg.user === userName ? (
                            <div key={i} className="flex justify-end">
                                <div
                                    className={`${myMsgClasses} py-3 px-4 rounded-2xl rounded-br-md max-w-[80%] transform hover:scale-[1.02] transition-transform duration-150`}
                                    style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" ,maxWidth:"80%"}}
                                >
                                    <div className="text-xs opacity-80 mb-1 font-medium">You</div>
                                    <div className="leading-relaxed">{msg.text}</div>
                                </div>
                            </div>
                        ) : (
                            <div key={i} className="flex justify-start">
                                <div
                                    className={`${otherMsgClasses} py-3 px-4 rounded-2xl rounded-bl-md max-w-[80%] transform hover:scale-[1.02] transition-transform duration-150`}
                                    style={{ wordBreak: "break-word", whiteSpace: "pre-wrap",maxWidth:"80%" }}
                                >
                                    <div className={`text-xs mb-1 font-medium ${
                                        darkMode ? "opacity-80" : "opacity-70"
                                    }`}>
                                        {msg.user}
                                    </div>
                                    <div className="leading-relaxed">{msg.text}</div>
                                </div>
                            </div>
                        )
                    )
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`border-t px-4 py-4 backdrop-blur-sm ${
                darkMode 
                    ? "bg-slate-800/80 border-slate-700" 
                    : "bg-white/80 border-gray-200"
            }`}>
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            rows={1}
                            className={`w-full px-4 py-3 rounded-2xl outline-none border-2 resize-none transition-all duration-200 ${
                                darkMode
                                    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500 focus:bg-slate-600"
                                    : "bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:bg-blue-50"
                            }`}
                            style={{
                                minHeight: "44px",
                                maxHeight: "120px",
                                lineHeight: "1.5"
                            }}
                            onInput={e => {
                                e.target.style.height = "44px";
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                            }}
                        />
                    </div>
                    <button
                        onClick={sendMessage}
                        className={`p-3 rounded-2xl transition-all duration-200 flex items-center justify-center min-w-[44px] h-[44px] ${
                            input.trim()
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        disabled={!input.trim()}
                        title="Send message"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className={`text-xs mt-2 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                    Press Enter to send • Shift+Enter for new line
                </div>
            </div>
        </div>
    );
};

export default ChatSection;