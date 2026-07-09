const socket = io('/');
let myPeer;
let myStream;
const peers = {};

const videoGrid = document.getElementById('video-grid');
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let drawing = false;

// ऐप शुरू करें (लॉगिन के बाद)
function startApp() {
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room-id').value;
    if (!username || !roomId) return alert("Fields cannot be empty");

    document.getElementById('auth-box').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    initMedia(roomId, username);
    initWhiteboard();
    initFileSharing();
}

// वीडियो और WebRTC सेटअप
function initMedia(roomId, username) {
    myPeer = new Peer();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        myStream = stream;
        addVideoStream(document.createElement('video'), stream, "You");

        myPeer.on('call', call => {
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream);
            });
        });

        socket.on('user-connected', (userId, uName) => {
            connectToNewUser(userId, stream);
            alert(`${uName} joined the room.`);
        });
    });

    myPeer.on('open', id => {
        socket.emit('join-room', roomId, id, username);
    });

    socket.on('user-disconnected', userId => {
        if (peers[userId]) peers[userId].close();
    });

    // स्क्रीन शेयरिंग लॉजिक
    document.getElementById('screen-share-btn').addEventListener('click', async () => {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        addVideoStream(document.createElement('video'), screenStream, "Your Screen");
    });
}

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => video.remove());
    peers[userId] = call;
}

function addVideoStream(video, stream, label = "") {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}

// व्हाइटबोर्ड लॉजिक
function initWhiteboard() {
    canvas.width = 500; canvas.height = 400;
    
    canvas.addEventListener('mousedown', () => drawing = true);
    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mousemove', draw);

    function draw(e) {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, 4, 4);
        socket.emit('drawing', { x, y });
    }

    socket.on('drawing', (data) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(data.x, data.y, 4, 4);
    });
}

// फाइल शेयरिंग लॉजिक
function initFileSharing() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            socket.emit('file-share', { name: file.name, buffer: reader.result });
            appendFileLink(file.name, reader.result, "You");
        };
        reader.readAsDataURL(file);
    });

    socket.on('file-receive', (data) => {
        appendFileLink(data.name, data.buffer, "Peer");
    });
}

function appendFileLink(name, buffer, sender) {
    const link = document.createElement('a');
    link.href = buffer;
    link.download = name;
    link.innerText = `${sender} shared: ${name}`;
    document.getElementById('file-list').appendChild(link);
    document.getElementById('file-list').appendChild(document.createElement('br'));
}
