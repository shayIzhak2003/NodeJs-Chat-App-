const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/upload', upload.single('image'), (req, res) => {
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('set nickname', (nickname) => {
        socket.nickname = nickname;
        io.emit('user joined', `${nickname} joined the chat`);
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', { nickname: socket.nickname, message: msg });
    });

    socket.on('image message', (imageUrl) => {
        io.emit('image message', { nickname: socket.nickname, imageUrl });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        io.emit('user left', `${socket.nickname} left the chat`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
