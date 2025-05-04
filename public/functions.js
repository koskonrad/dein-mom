async function login(username, password) {
    await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password
        })
    })
}

async function register(username, password) {
    await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password
        })
    })
}

function increaseCount(route) {
    fetch('/'+route, { method: 'POST' })
}

function openWebSocket(onCount) {
    const socket = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://") +
        location.host
    );

    socket.onopen = () => console.log("WebSocket verbunden");

    socket.onmessage = ({ data }) => {
        onCount(JSON.parse(data))
    };
}