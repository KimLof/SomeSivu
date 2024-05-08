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
