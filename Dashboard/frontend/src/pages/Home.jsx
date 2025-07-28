import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import Avatar from "@mui/material/Avatar";
import axios from "axios";
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [recordings, setRecords] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [image, setImage] = useState("");
  const [selected, setSelected] = useState(new Date());
  const [user, setUser] = useState(null);
  const [meetingDetails, setMeetingDetails] = useState({
    name: "",
    time: "",
    date: new Date(),
    day: new Date().toLocaleDateString("en-CA", { weekday: "long" }),
  });

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      const combinedDateTime = new Date(
        `${meetingDetails.date.toLocaleDateString("en-CA")}T${meetingDetails.time}`
      );

      const res = await axios.post(
        "http://localhost:3000/meetingSave",
        {
          name: meetingDetails.name,
          day: combinedDateTime,
          time: meetingDetails.time,
        },
        { withCredentials: true }
      );

      alert("Meeting scheduled!");
      setMeetings((prev) => [...prev, res.data]);

      setMeetingDetails({
        name: "",
        time: "",
        date: new Date(),
        day: new Date().toLocaleDateString("en-CA", { weekday: "long" }),
      });
      setSelected(new Date());
    } catch (err) {
      console.error("Error scheduling meeting:", err.response?.data || err);
      alert("Failed to schedule meeting");
    }
  };

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await axios.get("http://localhost:3000/allMeetings", { withCredentials: true });
        setMeetings(res.data);
      } catch (err) {
        console.error("Failed to fetch meetings", err);
      }
    };
    fetchMeetings();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:3000/user", {
          withCredentials: true,
        }).catch((err) => {
          console.log("AXIOS ERROR", err.response?.data || err.message);
        });
        setUser(res.data);
        if (res.data.photos) setImage(res.data.photos);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  const handleJoinLobby = () => {
    navigate('/lobby', { state: { isHost: false ,user} });
  };

  const handleJoinLobbyHost = () => {
    navigate('/lobby', { state: { isHost: true ,user} });
  };

  return (
    <div className="mt-16 min-h-screen w-full p-6 flex flex-col gap-8 items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-gray-900 dark:text-white">
      <Navbar />
      {/* TOP ROW: Profile + Recordings */}
      <div className="w-full max-w-9xl grid grid-cols-1 md:grid-cols-2 gap-6 h-[320px] lg:h-[400px]">
        {/* Profile Card */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 flex flex-col items-center gap-6 justify-center hover:shadow-3xl hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300">
          {user?.photos ? (
            <img
              src={user.photos}
              alt="User"
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-300/50 dark:border-blue-500/50 shadow-2xl ring-4 ring-blue-100/50 dark:ring-blue-900/30"
            />
          ) : (
            <Avatar
              alt={user?.name || user?.username || "User"}
              sx={{
                width: 96,
                height: 96,
                bgcolor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                fontWeight: 600,
                border: "4px solid rgba(83, 8, 223, 0.2)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              }}
            >
              {(user?.name || user?.username || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </Avatar>
          )}

          <div className="text-center">
            <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome back!
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
              {user?.name || user?.username || "User"}
            </p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleJoinLobbyHost} 
              className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white px-6 py-3 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
              Host Meeting
            </button>
            <button
              onClick={handleJoinLobby} 
              className="bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 hover:from-slate-300 hover:via-slate-400 hover:to-slate-500 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 dark:hover:from-slate-700 dark:hover:via-slate-800 dark:hover:to-slate-900 text-slate-800 dark:text-slate-200 px-6 py-3 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
              Join Meeting
            </button>
          </div>
        </div>

        {/* Recordings */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-6 overflow-auto hover:shadow-3xl hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Recent Recordings</h2>
          {recordings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recordings.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-blue-200/50 dark:border-gray-600 hover:shadow-md transition-all duration-200"
                >
                  <p className="font-medium text-gray-800 dark:text-white">Recording {index + 1}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Today, 2:30 PM</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No recordings yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your meeting recordings will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE + BOTTOM ROW using Responsive Grid */}
      <div className="w-full max-w-9xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:h-[480px]">
        {/* Calendar */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-6 flex flex-col justify-center items-center hover:shadow-3xl hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Select Date</h2>
          <div className="calendar-container">
            <DayPicker
              animate
              mode="single"
              navLayout="around"
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  setSelected(date);
                  setMeetingDetails((prev) => ({
                    ...prev,
                    date,
                    day: date.toLocaleDateString("en-CA", { weekday: "long" }),
                  }));
                }
              }}
              disabled={{ before: new Date() }}
              startMonth={new Date()}
              footer={
                selected ? (
                  <div className="text-center mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Selected: {selected.toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-center mt-4 text-gray-500 dark:text-gray-400">Pick a date</p>
                )
              }
            />
          </div>
        </div>

        {/* Schedule Form */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-6 flex flex-col hover:shadow-3xl hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white text-center">Schedule Meeting</h2>
          <form 
            onSubmit={handleSchedule}
            className="flex flex-col gap-4 mb-4 flex-1 justify-center"
          >
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Meeting Name
              </label>
              <input
                type="text"
                id="name"
                value={meetingDetails.name}
                onChange={(e) =>
                  setMeetingDetails((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-slate-200"
                placeholder="Enter meeting name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Date & Day
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={selected.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                  disabled
                  className="flex-1 p-3 rounded-xl border bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-300 font-medium"
                />
                <input
                  type="text"
                  value={selected.toLocaleDateString("en-CA", { weekday: "long" })}
                  disabled
                  className="flex-1 p-3 rounded-xl border bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-300 font-medium"
                />
              </div>
              <small className="text-gray-500 dark:text-gray-400">
                Select date from calendar above
              </small>
            </div>

            <div className="space-y-2">
              <label htmlFor="time" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Time
              </label>
              <input
                type="time"
                id="time"
                value={meetingDetails.time}
                onChange={(e) =>
                  setMeetingDetails((prev) => ({ ...prev, time: e.target.value }))
                }
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="mt-4 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 text-white py-3 px-6 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              Schedule Meeting
            </button>
          </form>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 md:col-span-2 lg:col-span-1 p-6 flex flex-col hover:shadow-3xl hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white text-center">Upcoming Meetings</h2>
          <div className="overflow-auto flex-1">
            {meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings
                  .sort((a, b) => new Date(a.day) - new Date(b.day))
                  .map((meeting, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {meeting.name}
                        </h3>
                        <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm">
                          Start
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <span className="block font-semibold text-slate-600 dark:text-slate-300">Date</span>
                          <span className="text-slate-800 dark:text-slate-200 font-bold text-base">
                            {new Date(meeting.day).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="block font-semibold text-slate-600 dark:text-slate-300">Day</span>
                          <span className="text-slate-800 dark:text-slate-200 font-bold text-base">
                            {new Date(meeting.day).toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="block font-semibold text-slate-600 dark:text-slate-300">Time</span>
                          <span className="text-slate-800 dark:text-slate-200 font-bold text-base">{meeting.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  No meetings scheduled
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Your upcoming meetings will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;