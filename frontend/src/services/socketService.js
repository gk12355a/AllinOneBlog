import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  const token = localStorage.getItem('token');

  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      randomizationFactor: 0.5,
      auth: {
        token: token || ''
      }
    });

    socket.on('connect', () => {
      // Khi kết nối lại, đảm bảo auth token được cập nhật
      const curToken = localStorage.getItem('token');
      if (curToken && socket.auth) {
        socket.auth.token = curToken;
      }
    });
  } else if (socket.auth && token && socket.auth.token !== token) {
    // Nếu token thay đổi (ví dụ login user khác), cập nhật và kết nối lại
    socket.auth.token = token;
    socket.disconnect().connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
