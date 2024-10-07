import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:8000"); // Backend Socket.io server URL

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    socket.on("receive", (data) => {
      setMessages((prev) => [
        ...prev,
        { name: data.name, message: data.message },
      ]);
    });

    socket.on("user-list", (users) => {
      setUserList(Object.values(users));
    });

    socket.on("user-joined", (name) => {
      setMessages((prev) => [
        ...prev,
        `{ name: "System", message: ${name} has joined the chat }`,
      ]);
    });

    return () => {
      socket.off("receive");
      socket.off("user-list");
      socket.off("user-joined");
    };
  }, []);

  const registerUser = async (e) => {
    e.preventDefault();
    const response = await fetch("http://localhost:8000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    console.log(data);
  };

  const loginUser = async (e) => {
    e.preventDefault();
    const response = await fetch("http://localhost:8000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.token) {
      setIsLoggedIn(true);
    }
    console.log(data);
  };

  const joinChat = () => {
    if (name) {
      socket.emit("new-user-joined", name);
      setJoined(true);
    }
  };

  const sendMessage = () => {
    if (message) {
      if (selectedUser) {
        // Send a private message to the selected user
        socket.emit("private-message", { to: selectedUser.socketId, message });
      } else {
        // Send a group message
        socket.emit("group-message", message);
      }
      setMessages((prev) => [...prev, { name: "You", message }]);
      setMessage("");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      {!isLoggedIn ? (
        <div className="bg-white p-8 rounded shadow-md">
          <h2 className="text-2xl font-bold mb-4">Login/Register</h2>
          <form onSubmit={registerUser}>
            <input
              type="text"
              placeholder="Enter your name"
              className="border p-2 mb-2 w-full rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Enter your email"
              className="border p-2 mb-2 w-full rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Enter your password"
              className="border p-2 mb-2 w-full rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="bg-blue-500 text-white py-2 px-4 rounded"
              type="submit">
              Register
            </button>
          </form>
          <button
            onClick={loginUser}
            className="mt-4 bg-green-500 text-white py-2 px-4 rounded">
            Login
          </button>
        </div>
      ) : (
        <div className="bg-white p-8 rounded shadow-md w-96">
          {!joined ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Join the Chat</h2>
              <input
                type="text"
                placeholder="Enter your name"
                className="border p-2 mb-4 w-full rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                className="bg-blue-500 text-white py-2 px-4 rounded"
                onClick={joinChat}>
                Join
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2">Users</h2>
                <input
                  type="text"
                  placeholder="Search user..."
                  className="border p-2 mb-4 w-full rounded"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="h-32 overflow-y-auto border p-2 rounded bg-gray-50">
                  {userList
                    .filter((user) =>
                      user.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((user, index) => (
                      <div
                        key={index}
                        className={`mb-2 p-2 rounded cursor-pointer ${
                          selectedUser?.name === user.name
                            ? "bg-blue-200"
                            : "bg-gray-200"
                        }`}
                        onClick={() => setSelectedUser(user)}>
                        {user.name}
                      </div>
                    ))}
                </div>
              </div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2">Chat</h2>
                <div className="h-64 overflow-y-auto border p-2 rounded bg-gray-50">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`mb-2 p-2 rounded ${
                        msg.name === "You"
                          ? "bg-blue-200 text-right"
                          : "bg-gray-200 text-left"
                      }`}>
                      <strong>{msg.name}: </strong>
                      {msg.message}
                    </div>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Type your message..."
                className="border p-2 mb-2 w-full rounded"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                className="bg-blue-500 text-white py-2 px-4 rounded w-full"
                onClick={sendMessage}>
                Send
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
