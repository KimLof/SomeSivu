document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.log('Token not found');
        window.location.href = '/login'; // Siirry kirjautumissivulle, jos tokenia ei löydy
        return;
    }

    fetchNotifications(); // Hae ilmoitukset ja päivitä dropdown

    document.querySelector('.close').onclick = function () {
        document.getElementById('messageModal').style.display = 'none';
    }

    // Klikkaa ulkopuolelle modaalisen ikkunan sulkeaksesi sen
    window.onclick = function (event) {
        if (event.target == document.getElementById('messageModal')) {
            document.getElementById('messageModal').style.display = 'none';
        }
    }

    // Lähetä viesti
    document.getElementById('message-form').onsubmit = function (e) {
        e.preventDefault();
        sendMessage(token, document.getElementById('messageModal').getAttribute('data-friend-id'));
    }

    const friendRequestsModalButton = document.getElementById('openFriendRequestModal');
    friendRequestsModalButton.addEventListener('click', function () {
        fetchFriendRequests(token); // Kutsutaan funktiota, kun modal avataan
    });

    fetchFriends(token);

    document.getElementById('openFriendRequestModal').addEventListener('click', function () {
        document.getElementById('frmodal').style.display = 'block';
    });

    document.getElementsByClassName('close-fr-modal')[0].addEventListener('click', function () {
        document.getElementById('frmodal').style.display = 'none';
    });


    //kaveripyyntö modalin sulkeminen
    var frmodal = document.getElementById('frmodal');
    var frcontent = document.querySelector('.frmodal-content');
    frmodal.addEventListener('click', function (event) {
        frmodal.style.display = "none";
    });

    // When the user clicks on the modal content, stop the event propagation
    frcontent.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    const searchInput = document.getElementById('friends-search');
    searchInput.setAttribute('id', 'friends-search');
    searchInput.setAttribute('placeholder', 'Search Friends');

    searchInput.addEventListener('input', function () {
        filterFriends(token, searchInput.value); // Kutsutaan funktiota, kun hakukenttään kirjoitetaan
    });



});






// ===================== FUNKTIOT =====================

function fetchFriendRequests(token) {
    fetch('/api/friendreq', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(requests => {
            const requestsContainer = document.getElementById('friend-requests');
            requestsContainer.innerHTML = ''; // Tyhjennä aiemmat pyynnöt

            requests.forEach(request => {

                //console.log(request);
                // Luo elementti jokaiselle pyynnölle
                const requestElement = document.createElement('div');
                requestElement.textContent = request.senderName; // Oletetaan, että saat käyttäjän nimen vastauksessa
                requestElement.setAttribute('id', 'frid');

                 // Oletetaan, että saat käyttäjän nimen vastauksessa

                // Luo hyväksy-nappi
                const acceptButton = document.createElement('button');
                acceptButton.textContent = 'Accept';
                acceptButton.addEventListener('click', function () {
                    // Tässä kutsuisit API:a hyväksymään pyynnön
                    acceptFriendRequest(token, request.userID);
                });

                // Luo hylkää-nappi
                const rejectButton = document.createElement('button');
                rejectButton.textContent = 'Delete';
                rejectButton.addEventListener('click', function () {
                    // Tässä kutsuisit API:a hylkäämään pyynnön
                    rejectFriendRequest(token, request.userID);
                });

                requestElement.appendChild(acceptButton);
                requestElement.appendChild(rejectButton);

                requestsContainer.appendChild(requestElement);
            });
        })
        .catch(error => console.error('Error fetching friend requests:', error));
};


function acceptFriendRequest(token, senderId) {
    // console.log("Token: " + token)
    // console.log('Accepting friend request from:', senderId);

    fetch(`/api/friendreq/accept`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'

        },
        body: JSON.stringify({ senderId: senderId })
    })
        .then(response => {
            if (response.ok) {
                console.log('Friend request accepted');
                fetchFriendRequests(token); // Päivitä pyynnöt
            } else {
                console.error('Failed to accept friend request');
            }
        });
}

function rejectFriendRequest(token, senderId) {
    // console.log("Token: " + token)
    //  console.log('Rejecting friend request from:', senderId);

    fetch('/api/friendreq/reject', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ senderId: senderId })
    })
        .then(response => {
            if (response.ok) {
                console.log('Friend request rejected');
                fetchFriendRequests(token); // Päivitä pyynnöt
            } else {
                console.error('Failed to reject friend request');
            }
        });
}

function openMessageModal(friendId, token) {
    console.log('Opening message modal for friend with ID:', friendId);
    // Tässä esimerkissä oletetaan, että sinulla on modaalinen elementti viestien näyttämiseksi
    // ja että `fetchMessagesForFriend`-funktio on määritelty hakemaan ja näyttämään viestit.

    fetchMessagesForFriend(token, friendId);

    // Näytä modaalinen ikkuna viesteillä
    document.getElementById('messageModal').setAttribute('data-friend-id', friendId);
    document.getElementById('messageModal').style.display = 'block';
}


function removeFriend(id, name) {
    console.log('Removing friend with ID:', id);
    var confirmBlock = confirm('Are you sure you want to remove this friend? ' + name);
    if (confirmBlock) {
        // console.log('User has been removed from friends.');

        const token = localStorage.getItem('jwtToken');

        fetch('/api/friends/remove', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ friendId: id })
        })
            .then(response => {
                if (response.ok) {
                    fetchFriends(token); // Päivittää ystävät
                } else {
                    console.error('Failed to remove friend');
                }
            });
    }
}

function blockFriend(id, name) {
    // event.preventDefault(); // Prevent the link from being followed

    // Show a confirmation dialog
    var confirmBlock = confirm('Are you sure you want to block this user? ' + name);
    if (confirmBlock) {
        // If the user clicked "OK", block the user
        // Add your logic to block the user here
        console.log('User has been blocked.');
    }
}

function fetchFriends(token, filter = '') {
    fetch('/api/friends', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(allFriends => {
            const filteredFriends = allFriends.filter(friend =>
                friend.name.toLowerCase().includes(filter.toLowerCase())); // Filteröi ystävät

            // Hae filtteröidyt ystävät ja näytä ne
            displayFriends(filteredFriends);
        });
};

function filterFriends(token, filter) {
    fetchFriends(token, filter); // Kutsu funktiota, joka hakee ystävät ja näyttää ne
}


function displayFriends(friends) {
    const friendsList = document.getElementById('friends-list');
    friendsList.innerHTML = ''; // Tyhjennä aiemmat ystävät

    if (friends.length === 0) {
        const noFriendsMessage = document.createElement('h5');
        noFriendsMessage.textContent = 'No friends yet, find users from the search bar at feed page!';
        noFriendsMessage.style.color = 'gray';
        friendsList.appendChild(noFriendsMessage);
    } else {

        friends.forEach(friend => {

            // Nämä pitäisi saada kolmen pisteen alapuolelle
            const removeFriendLink = document.createElement('a');
            removeFriendLink.textContent = 'Remove friend';
            removeFriendLink.className = 'removeFriend';
            removeFriendLink.setAttribute('data-friend-id', friend.id); // Aseta data-attribuutti
            removeFriendLink.setAttribute("data-friend-name", friend.name); // Aseta data-attribuutti (nimi)
            removeFriendLink.href = '#'; // Estä sivun uudelleenlataus klikattaessa
            removeFriendLink.onclick = function () { removeFriend(this.getAttribute('data-friend-id'), this.getAttribute("data-friend-name")); };

            const blockFriendLink = document.createElement('a');
            blockFriendLink.textContent = 'Block';
            blockFriendLink.className = 'blockFriend';
            blockFriendLink.setAttribute('data-friend-id', friend.id); // Aseta data-attribuutti
            blockFriendLink.setAttribute("data-friend-name", friend.name); // Aseta data-attribuutti (nimi)
            blockFriendLink.href = '#'; // Estä sivun uudelleenlataus klikattaessa
            blockFriendLink.onclick = function () { blockFriend(this.getAttribute('data-friend-id'), this.getAttribute("data-friend-name")); };
            // Yläpuolella olevat pitäisi saada toimimaan


            // Luo hallintavalikon konteineri
            const manageDropdown = document.createElement('div');
            manageDropdown.className = 'manage-dropdown';

            // Lisää linkit hallintavalikkoon
            manageDropdown.appendChild(removeFriendLink);
            manageDropdown.appendChild(blockFriendLink);

            // Piilota hallintavalikko oletuksena
            manageDropdown.style.display = 'none';

            // console.log(friend);
            // Luo profiilikortin konteineri
            const profileCard = document.createElement('div');
            profileCard.className = 'profile-card';

            const managedots = document.createElement('div');
            managedots.className = 'manage-dots';

            const profileHeader = document.createElement('div');
            profileHeader.className = 'profile-header';

            const manageButton1 = document.createElement('button');
            manageButton1.id = 'manageDots';

            const buttonimage = document.createElement('img');
            buttonimage.src = 'pictures/pisteet.png';
            buttonimage.className = 'manage-dots';


            //alasvetovalikon tyylittelyt kun painaa kolmesta pisteestä

            buttonimage.onclick = function (event) {
                event.stopPropagation();

                if (manageDropdown.style.display === 'none') {
                    manageDropdown.style.display = 'block';
                    manageDropdown.style.position = 'absolute';
                    manageDropdown.style.zIndex = '1';
                    manageDropdown.style.backgroundColor = 'lightgray';
                    manageDropdown.style.width = '200px';
                    manageDropdown.style.padding = '10px';
                    manageDropdown.style.border = '1px solid black';

                    removeFriendLink.style.display = 'block';
                    removeFriendLink.style.color = 'black';
                    removeFriendLink.style.textDecoration = 'none';

                    blockFriendLink.style.display = 'block';
                    blockFriendLink.style.color = 'black';
                    blockFriendLink.style.textDecoration = 'none';
                } else {
                    manageDropdown.style.display = 'none';
                }
            };

            //sulkee alasvetovalikon kun painetaan muualta
            document.addEventListener('click', function (event) {
                var isClickInside = manageDropdown.contains(event.target);

                if (!isClickInside) {
                    manageDropdown.style.display = 'none';
                }
            });



            //alasvetovalikon tyylittelyt, hover toiminnallisuus tehty javascriptillä

            removeFriendLink.onmouseover = function () {
                this.style.backgroundColor = 'gray'; // Change color on hover
            };
            removeFriendLink.onmouseout = function () {
                this.style.backgroundColor = 'lightgray'; // Change color back when not hovering
            };

            blockFriendLink.onmouseover = function () {
                this.style.backgroundColor = 'red'; // Change color on hover
            };
            blockFriendLink.onmouseout = function () {
                this.style.backgroundColor = 'lightgray'; // Change color back when not hovering
            };

            // profileHeader.appendChild(manageButton);

            manageButton1.appendChild(buttonimage);

            managedots.appendChild(manageButton1);
            profileHeader.appendChild(managedots);
            profileHeader.appendChild(manageDropdown);


            // Lisää nimi
            const name = document.createElement('h2');
            name.textContent = friend.name;
            name.className = 'name';
            name.style.cursor = 'pointer';
            name.onclick = function () {
                window.location.href = '/profile?profileId=' + friend.id;
            };
            profileHeader.appendChild(name);

            // Lisää profiilikuvan
            const profilePic = document.createElement('img');
            profilePic.src = friend.profilePicture || 'pictures/user.png'; // Oletuskuva, jos URL puuttuu
            profilePic.alt = 'Profiilikuva';
            profilePic.className = 'profile-pic';
            profilePic.style.cursor = 'pointer';
            profilePic.onclick = function () {
                window.location.href = '/profile?profileId=' + friend.id;
            };
            profileHeader.appendChild(profilePic);

            // Lisää sijainti
            const location = document.createElement('p');
            location.textContent = `Location: ${friend.location}`;
            location.className = 'location';
            profileHeader.appendChild(location);

            // Lisää liittymispäivä
            const joined = document.createElement('p');
            const joinedDate = new Date(friend.joined); // Convert the joined date to a Date object
            const formattedDate = `${joinedDate.getMonth() + 1}/${joinedDate.getFullYear()}`; // Format the date to show month/year
            joined.textContent = `Joined: ${formattedDate}`; // Use the formatted date
            joined.className = 'joined';
            profileHeader.appendChild(joined);

            // Lisää postausten määrä
            const postsCount = document.createElement('p');
            postsCount.textContent = `Posts: ${friend.postsCount}`;
            postsCount.className = 'postsCount';
            profileHeader.appendChild(postsCount);

            // Lisää bio
            const bio = document.createElement('h5');
            bio.innerHTML = friend.bio.replace(/\n/g, '<br>');
            bio.className = 'bio';
            profileHeader.appendChild(bio);

            profileCard.appendChild(profileHeader);

            // TÄSSÄ ON NE NAPIT ========================================
            // Luo hallintapainikkeet
            const profilebuttons = document.createElement('div');
            profilebuttons.className = 'profile-buttons';

            // Luo viestipainike
            const messageButton = document.createElement('button');
            const token = localStorage.getItem('jwtToken');
            messageButton.textContent = 'Message';
            messageButton.className = 'messageButton';
            messageButton.setAttribute('data-friend-id', friend.id); // Aseta data-attribuutti
            messageButton.onclick = function () { openMessageModal(this.getAttribute('data-friend-id'), token); };

            // Lisää hallintapainikkeet ja viestipainike profiilikorttiin
            //  profilebuttons.appendChild(manageDropdown);

            profilebuttons.appendChild(messageButton);

            profileCard.appendChild(profilebuttons);


            // Lisää profiilikortti
            friendsList.appendChild(profileCard);
        });
    }
}

function fetchMessagesForFriend(token, friendId) {
    fetch(`/api/messages/${friendId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(messages => {

            const messagesDisplay = document.getElementById('messages-display');
            messagesDisplay.innerHTML = ''; // Tyhjennä aiemmat viestit
            messages.forEach(message => {
                const senderNameElement = document.createElement('b');
                senderNameElement.textContent = message.senderName;

                const messageElement = document.createElement('p');
                messageElement.setAttribute('id', 'messagep');
                messageElement.appendChild(senderNameElement);

                const colonText = document.createTextNode(": " + message.message);
                messageElement.appendChild(colonText);
                messagesDisplay.appendChild(messageElement);
            });
            // Näytä modaalinen ikkuna viesteillä
            document.getElementById('messageModal').style.display = 'block';
        });
}

//HTML-encode XSS vastaan, esim '<' muutetaan '&lt;':ksi jne.
function htmlEncode(text) {
    var div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

function sendMessage(token, receiverId) {
    const messageInput = document.getElementById('message-text');
    const messageText = htmlEncode(messageInput.value);

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
document.getElementById("search-input").addEventListener("input", function () {
    const searchInput = document.getElementById("search-input").value;

    if(searchInput.length === 0) {
        document.getElementById("user-search-results").style.display = "none";
        return;
    }

    fetch(`/api/users/search?q=${encodeURIComponent(searchInput)}`)
        .then((response) => response.json())
        .then((users) => {
            const resultsContainer = document.getElementById("user-search-results");
            resultsContainer.innerHTML = ""; // Tyhjennä aiemmat tulokset
            resultsContainer.style.display = users.length ? "block" : "none"; // Näytä tulokset, jos niitä on


            users.forEach((user) => {
                const userElement = document.createElement("div");
                userElement.classList.add("user-search-item"); // Lisätään luokka helpottamaan CSS-stailausta
                
               // console.log(user);

                // Luodaan profiilikuvan elementti ja asetetaan kuva    
                const profileImage = document.createElement("img");
                profileImage.src = user.profilePicture || 'pictures/user.png';
                profileImage.alt = user.username;
                profileImage.classList.add("profile-picture"); // Luokka kuvalle
            
                // Luodaan tekstielementti käyttäjänimelle
                const usernameElement = document.createElement("span");
                usernameElement.textContent = user.username;
                usernameElement.classList.add("username"); // Luokka tekstin stailausta varten
            
                // Asetetaan elementit diviin
                userElement.appendChild(profileImage);
                userElement.appendChild(usernameElement);
            
                userElement.style.cursor = "pointer"; // Muuttaa hiiren osoittimen linkin osoittimeksi
                userElement.onclick = function () {
                    window.location.href = `/profile?profileId=${user.id}`;
                };
                resultsContainer.appendChild(userElement);
            });
            
        });
});

document.getElementById("notification-icon").addEventListener("click", function () {
    const dropdown = document.querySelector('.dropdown-content');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
});

// Sulje ilmoitukset, jos käyttäjä klikkaa muualle kuin ilmoitukset-dropdownia 
window.addEventListener('click', function (event) {
    const dropdown = document.querySelector('.dropdown-content');
    const notificationIcon = document.getElementById('notification-icon');
    const text = document.getElementById('notification-text');
    if (event.target !== notificationIcon && event.target !== text) {
        dropdown.style.display = 'none';
    }
});

    // Funktio, joka hakee ilmoitukset ja päivittää dropdownin
    function fetchNotifications() {
        // Tähän voit lisätä koodin, joka hakee ilmoitukset esim. fetch-API:lla
        fetch('/api/notifications', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            updateNotificationDropdown(data);
        })
        .catch(error => {
            console.error('Error fetching notifications:', error);
        });
    }

     // Päivitä dropdown sisältö
     function updateNotificationDropdown(data) {
        console.log('Updating notification dropdown with data:', data);
        const notificationDropdown = document.querySelector('.dropdown-content');
        notificationDropdown.innerHTML = ''; // Tyhjennä aiemmat ilmoitukset
    

        // Yhdistetään kaikki ilmoitustyypit yhdeksi listaksi
        const allNotifications = [...data.friendRequests, ...data.unseenComments, ...data.unseenMessages];
    
        if (allNotifications.length === 0) {
            notificationDropdown.innerHTML = '<p>No new notifications</p>';
        } else {
            // Käydään läpi kaikki ilmoitukset ja luodaan niille elementit
            allNotifications.forEach(notification => {
                const notificationElement = document.createElement('div');
                notificationElement.classList.add('notification-item');
                //Lisätään linkki ilmoitukseen
                notificationElement.onclick = function() {
                    window.location.href = "/" + notification.type;
                }
                notificationElement.textContent = notification.senderName + ': ' + notification.info;
                notificationDropdown.appendChild(notificationElement);
            });
        }
    }

    //navbarin scrollaus
let prevScrollpos = window.pageYOffset;

window.onscroll = function() {
  let currentScrollPos = window.pageYOffset;
  if (prevScrollpos > currentScrollPos) {
    document.getElementById("top-nav").style.top = "0";
  } else {
    document.getElementById("top-nav").style.top = "-80px"; // Adjust as needed
  }
  prevScrollpos = currentScrollPos;
}
