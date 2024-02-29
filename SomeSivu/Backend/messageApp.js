document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('jwtToken'); 
    if (!token) {
        console.log('Token not found');
        window.location.href = '/login'; // Siirry kirjautumissivulle, jos tokenia ei löydy
        return;
    }

    fetchFriends(token);
});

document.getElementById('search-button').addEventListener('click', function() {
    const searchInput = document.getElementById('search-input').value;

    fetch(`/api/users/search?q=${encodeURIComponent(searchInput)}`)
    .then(response => response.json())
    .then(users => {
        const resultsContainer = document.getElementById('user-search-results');
        resultsContainer.innerHTML = ''; // Tyhjennä aiemmat tulokset

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.textContent = user.username;
            userElement.style.cursor = "pointer"; // Muuttaa hiiren osoittimen linkin osoittimeksi
            userElement.onclick = function() {
                window.location.href = `/profile?profileId=${user.id}`;
            };
            resultsContainer.appendChild(userElement);
        });
    });
});


function fetchFriends(token) {
    fetch('/api/friends', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(friends => {
        const friendsList = document.getElementById('friends-list');
        friendsList.innerHTML = '';
        friends.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.textContent = friend.name;
            friendElement.onclick = function() {
                fetchMessagesForFriend(token, friend.id);
            };
            friendsList.appendChild(friendElement);
        });
    });
}

function fetchMessagesForFriend(token, friendId) {
    fetch(`/api/messages/${friendId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(messages => {
        const messageContainer = document.getElementById('message-container');
        messageContainer.innerHTML = ''; // Tyhjennä aikaisemmat viestit

        // Näytä viestit
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.textContent = `${message.senderName}: ${message.message}`; // Oletetaan, että viestissä on 'senderName' ja 'message'
            messageContainer.appendChild(messageElement);
        });

        // Luo kirjoituskenttä ja lähetysnappi
        const inputContainer = document.createElement('div');
        inputContainer.id = 'message-input-container';
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.id = 'message-input';
        inputField.placeholder = 'Write a message...';
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.onclick = () => sendMessage(token, friendId);

        // Lisää kenttä ja nappi DOMiin
        inputContainer.appendChild(inputField);
        inputContainer.appendChild(sendButton);
        messageContainer.appendChild(inputContainer); // Lisää kirjoituskenttä ja nappi viestilistauksen alapuolelle

        // Aseta fokus kirjoituskenttään
        inputField.focus();
    });
}


function sendMessage(token, receiverId) {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value;

    if (!messageText.trim()) {
        alert('Message cannot be empty');
        return;
    }

    // Oletetaan, että backend odottaa 'receiverId' ja 'message' kenttiä
    fetch('/api/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: receiverId, message: messageText })
    })
    .then(response => {
        if (response.ok) {
            messageInput.value = ''; // Tyhjennä kirjoituskenttä onnistuneen lähetuksen jälkeen
            fetchMessagesForFriend(token, receiverId); // Päivitä viestilistaus uudella viestillä
        } else {
            alert('Failed to send message');
        }
    });
}

