const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

const messages = new Map();

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('set nickname', (nickname) => {
        socket.nickname = nickname;
        io.emit('user joined', `${nickname} joined the chat`);
    });

    socket.on('chat message', (msg) => {
        const id = uuidv4();
        messages.set(id, { id, nickname: socket.nickname, text: msg.text });
        io.emit('chat message', { id, nickname: socket.nickname, text: msg.text });
    });

    socket.on('image message', (imageUrl) => {
        const id = uuidv4();
        messages.set(id, { id, nickname: socket.nickname, imageUrl });
        io.emit('image message', { id, nickname: socket.nickname, imageUrl });
    });

    socket.on('edit message', (msg) => {
        if (messages.has(msg.id)) {
            const message = messages.get(msg.id);
            message.text = msg.text;
            io.emit('chat message', message);
        }
    });

    socket.on('delete message', (msg) => {
        if (messages.has(msg.id)) {
            messages.delete(msg.id);
            io.emit('message deleted', { id: msg.id });
        }
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
