let prevScrollpos = window.pageYOffset;

window.onscroll = function () {
    let currentScrollPos = window.pageYOffset;
    if (prevScrollpos > currentScrollPos) {
        document.getElementById("top-nav").style.top = "0";
    } else {
        document.getElementById("top-nav").style.top = "-80px"; // Adjust as needed
    }
    prevScrollpos = currentScrollPos;
}


// kun notificationia ppainetaan aukeaa ilmoitukset


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


fetchUser(); // Hae käyttäjän tiedot ja aseta ne kenttiin
fetchNotifications(); // Hae ilmoitukset ja päivitä dropdown

document.getElementById("search-input").addEventListener("input", function () {
    const searchInput = document.getElementById("search-input").value;

    if (searchInput.length === 0) {
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

//Funktio joka asettaa käyttäjänimen ja sähköpostin kenttiin
function fetchUser() {
    fetch('/api/user', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('username').value = data.username;
            document.getElementById('email').value = data.email;
        })
        .catch(error => {
            console.error('Error fetching user:', error);
        }
        );
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
            notificationElement.onclick = function () {
                window.location.href = "/" + notification.type;
            }
            notificationElement.textContent = notification.senderName + ': ' + notification.info;
            notificationDropdown.appendChild(notificationElement);
        });
    }
}

// delete-account napin toiminnallisuus
document.getElementById("delete-account").addEventListener("click", function () {
    if (confirm("Are you sure you want to delete your account?")) {
        fetch('/api/user', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        })
            .then(response => {
                if (response.status === 200) {
                    alert('Account deleted successfully');
                    window.location.href = '/login';
                } else {
                    console.error('Error deleting account:', response.status);
                    alert('Error deleting account');
                }
            })
            .catch(error => {
                console.error('Error deleting account:', error);
                alert('Error deleting account');
            });
    }
});

// painetaan userSettings submit tulee alert 

document.getElementById("userSettings").addEventListener("submit", function (event) {
    event.preventDefault();

    // Tarkistaa onko salasana oikein
    if (document.getElementById('currentPassword').value === '') {
        alert('Please enter your current password');
        return;
    } else {
        hashPassword(document.getElementById('currentPassword').value)
            .then(hashedPassword => {
                fetch('/api/user/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                    },
                    body: JSON.stringify({
                        password: hashedPassword
                    })
                })
                    .then(response => {
                        if (response.status === 200) {
                            // Jos  newPassword ja confirmPassword ovat tyhjiö ei päivitetä salasanaa
                            if (document.getElementById('newPassword').value !== document.getElementById('confirmPassword').value) {
                                alert('Passwords do not match');
                                return;
                            }

                            // Jos newPassword ja confirmPassword ovat tyhjiö ei päivitetä salasanaa
                            if (document.getElementById('newPassword').value === '' && document.getElementById('confirmPassword').value === '') {
                                fetch('/api/user/settings', {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                                    },
                                    body: JSON.stringify({
                                        username: document.getElementById('username').value,
                                        email: document.getElementById('email').value
                                    })
                                })
                                    .then(response => {
                                        if (response.status === 200) {
                                            alert('User updated successfully');
                                        } else {
                                            console.error('Error updating user:', response.status);
                                            alert('Error updating user');
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Error updating user:', error);
                                        alert('Error updating user');
                                    });
                            } else {
                                hashPassword(document.getElementById('newPassword').value)
                                    .then(hashedPassword => {
                                        fetch('/api/user/settings', {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                                            },
                                            body: JSON.stringify({
                                                username: document.getElementById('username').value,
                                                email: document.getElementById('email').value,
                                                password: hashedPassword
                                            })
                                        })
                                            .then(response => {
                                                if (response.status === 200) {
                                                    alert('User updated successfully');
                                                } else {
                                                    console.error('Error updating user:', response.status);
                                                    alert('Error updating user');
                                                }
                                            })
                                            .catch(error => {
                                                console.error('Error updating user:', error);
                                                alert('Error updating user');
                                            });
                                    });
                            }
                        }
                        else {
                            alert('Incorrect password');
                            return;
                        }
                    })
                    .catch(error => {
                        if (error.status === 401) {
                            alert('Incorrect password');
                            return;
                        }else {
                        console.error('Error verifying password:', error);
                        alert('Error verifying password');
                        }
                    });
            });
    }
        // Poistaa salaasanat kentistä tekstit
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

});

function hashPassword(password) {
    //Käytetään Web Cryptography API:a salasanan hashaukseen
    return new Promise((resolve, reject) => {
        // Luodaan uusi Uint8Array, joka sisältää salasanan merkit
        // ja kutsutaan window.crypto.subtle.digest()-metodia
        window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
            .then(hash => {
                const hashedPassword = Array.from(new Uint8Array(hash))
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('');
                resolve(hashedPassword);
                //palautetaan hashattu salasana
            })
            .catch(error => {
                console.error('Hashing error:', error);
                reject(error);
            });
    });

}

// Hae nykyinen sivun URL
var currentUrl = window.location.href;

