import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  const token = localStorage.getItem('token');

  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      upgrade: true,
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
  } else {
    // Nếu socket đã tạo nhưng auth token chưa khớp hoặc vừa đăng nhập mới
    const currentAuthToken = socket.auth?.token || '';
    const storedToken = token || '';
    if (currentAuthToken !== storedToken) {
      if (!socket.auth) socket.auth = {};
      socket.auth.token = storedToken;
      socket.disconnect().connect();
    }
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
