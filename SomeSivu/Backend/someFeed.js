document.addEventListener("DOMContentLoaded", function () {
    const logoutLink = document.getElementById('logout-link');

    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();

        // Poista token LocalStoragesta
        localStorage.removeItem('jwtToken');

        // Ohjaa käyttäjä kirjautumissivulle
        window.location.href = '/login';
    });
});



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

document.addEventListener("DOMContentLoaded", function () {
    if (!localStorage.getItem("jwtToken")) {
        // Jos tokenia ei ole, ohjataan käyttäjä kirjautumissivulle
        window.location.href = "/login";
    } else {
        let userId = ""; // Tähän tulee kirjautuneen käyttäjän id

        fetchNotifications(); // Hae ilmoitukset ja päivitä dropdown

        

        // Kun postauksen kuva painetaan, avaa kuvan isompana modaalissa
        $(document).on("click", "#post-picture", function () {
            // console.log("clicked");
            const imageUrl = $(this).attr("src");
            const modal = document.getElementById("image-modal");
            const modalImage = document.getElementById("modal-image");
            modal.style.display = "block";

            
            document.getElementById('modal-image').innerHTML = `
            <img src="${imageUrl || 'pictures/user.png'}" alt="Profiilikuva" id="modaaliPic">
            `;
        });

            // Sulje modaalissa oleva kuva kun käyttäjä painaa modalin ulkopuolelta
            window.onclick = function (event) {
                const modal = document.getElementById("image-modal");
               // console.log(event.target );
                // console.log("modaali: " + modal.innerHTML);
                if (event.target == modal ) {
                    document.getElementById('image-modal').style.display = "none";
                    document.getElementById('modal-image').innerHTML = "";
                }
            };

        // Sulje modaalissa oleva kuva kun käyttäjä painaa X-nappia
        document.getElementById("close-modal").addEventListener("click", function () {
            document.getElementById('image-modal').style.display = "none";
            document.getElementById('modal-image').innerHTML = "";
        });


        const token = localStorage.getItem("jwtToken"); // Hakee tokenin selaimen Local Storagesta
        // Hae kirjautuneen käyttäjän tiedot
        fetch("/api/user", {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    console.log("Token not valid");
                    window.location.href = "/login"; // Siirry kirjautumissivulle, jos token on väärä tai vanhentunut
                }
                return response.json();
            })
            .then((userProfile) => {
                userId = userProfile.id; // Aseta userId-muuttujaan kirjautuneen käyttäjän id
                document.querySelector("#user-username").textContent =
                    userProfile.username;
            })
            .catch((error) => {
                console.error("Error:", error);
                window.location.href = "/login"; // Siirry kirjautumissivulle, jos token on väärä tai vanhentunut
            });


        // Hae kaikki postaukset
        fetch("/api/posts", {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch posts"); // Heitä virhe, jos vastaus ei ole ok
                }
                return response.json();
            })
            .then((postsWithUserInfo) => {
                const postsContainer = document.getElementById("postsContainer");
                postsWithUserInfo.forEach((post) => {
                    const postElement = document.createElement("div");

                    const userHasLiked = post.likes.includes(userId);
                    const likeButtonText = userHasLiked ? "Unlike" : "Like";

                    let postId = post._id;
                    let likesCount = post.likes ? post.likes.length : 0;
                    let commentsCount = post.comments ? post.comments.length : 0;
                    let ownComment = false;

                    let commentsHtml = post.comments
                        .map((comment) => {
                            const ownComment = comment.userId === userId;
                            return `
                        <div class="comment" data-post-id="${postId}">
                            <img class="profile-pic" onclick="window.location.href='/profile?profileId=${comment.userId
                            }'" src="${comment.profilePicture ||
                                "picture/user.png"
                                }" alt="Profiilikuva">
                            <div class="comment-content">
                                <div class="comment-header">
                                    <h4 class="comment-username" onclick="window.location.href='/profile?profileId=${comment.userId
                                    }'">${comment.username || "Anonyymi"
                                }</h4>
                                    <span class="comment-datetime">${formatTimestamp(
                                    comment.timestamp
                                )}</span>
                                ${ownComment ? `
                                <img src="pictures/pisteet.png" alt="Options" class="dropbtn" id="dropdown-button">
                                <div class="dropdown-content-comment">
                                    <p onClick="deleteComment('${comment._id}', '${postId}')">Delete</p>
                                    <p onClick="editComment('${comment._id}')">Edit</p>
                                </div>
                                ` : ''}
                                </div>
                                <p data-comment-id="${comment._id}">${comment.comment}</p>

                            </div>
                        </div>`;
                        })
                        .join("");

                        if( post.profilePicture === "") {
                            post.profilePicture = "pictures/user.png";
                        };

                    //kommentoinnin rivivaihdot ei renderöidy oikein, täytyy koittaa korjata!!
                    postElement.innerHTML = `
                <section class="post">
                <div class="post-header">
                    <img src="${post.profilePicture}"
                    alt="Profiilikuva" 
                    class="profile-pic"
                    onclick="window.location.href='/profile?profileId=${post.userId}'">
                    <div class="post-userdata">
                    <h2 onclick="window.location.href='/profile?profileId=${post.userId
                        }'">${post.username}</h2>
                        <p>${formatTimestamp(post.timestamp)}</p>
                    </div>
                </div> 
                <p>${post.content}</p>
                ${post.picture === "" ? "" : `<img src="${post.picture}" alt="Post image" id="post-picture">`}
                <div id="likes-section">
                <button class="like-button" data-post-id="${postId}">${likeButtonText}</button>
                <button class="comment-button" data-post-id="${postId}">Comment</button>
                    <div class="post-likes-comments">
                    <span class="likes-count" data-post-id="${postId}">${likesCount}<img src="pictures/like.png" alt="Like"></span>
                        <span id="comments-count" data-post-id="${postId}">${commentsCount}<img src="pictures/comment.png" alt="Comment"></span>
                        </div>
                </div>
                <section id="comments-container">
                    <div id="comments-display">
                        <form class="comment-form" style="display: none;" data-post-id="${postId}">
                        <input type="text" id="comment-input" placeholder="Write your comment here" required>
                        <p id="comment-char-counter">0/100</p>
                        <button class="send-comment-button" id="send-button">Send</button>
                        </form>
                        <div class="comments-container" data-post-id="${postId}">
                        ${commentsHtml}
                    </div>
                </section>
            </section>
            `;
                    // Lisää postaus HTML:ään
                    postsContainer.appendChild(postElement);

                    // Lisää tapahtumankäsittelijä like-napille
                    const likeButton = document.querySelector(`.like-button[data-post-id="${post._id}"]`);
                    likeButton.addEventListener("click", function () {
                        const postId = this.dataset.postId;
                        const isLiked = post.likes.includes(userId);
                        const method = isLiked ? "DELETE" : "POST";
                        const url = `/api/posts/${postId}/like`;

                        fetch(url, {
                            method: method,
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: "Bearer " + token,
                            }
                        })
                            .then((response) => {
                                if (!response.ok) {
                                    throw new Error("Failed to toggle like");
                                }
                                return response.json();
                            })
                            .then((data) => {
                                console.log(data);
                                 // Päivitä tykkäysten määrä ja kuva käyttäen palvelimen palauttamaa tietoa
                                const likeCountElement = document.querySelector(`.likes-count[data-post-id="${postId}"]`);
                                if (likeCountElement) {
                                    likeCountElement.innerHTML = `${data.likesCount} <img src="pictures/like.png" alt="Like">`;
                                }

                                // Vaihda painikkeen tekstiä ja päivitä post.likes tilaa
                                if (isLiked) {
                                    // Poista tykkäys
                                    this.textContent = "Like";
                                    post.likes = post.likes.filter((id) => id !== userId);
                                } else {
                                    // Lisää tykkäys
                                    this.textContent = "Unlike";
                                    post.likes.push(userId);
                                }

                                
                            })
                            .catch((error) => {
                                console.error("Error:", error);
                            });
                    });
                });
            })
            .catch((error) => {
                console.error("Error fetching posts:", error);
            });

          // Kommenttein dropdownin toiminnallisuus. Kun hoverataan näkyy
          // Myös jos contenttiä hoverataan, niin dropdown pysyy näkyvissä
            // $(document).on("mouseover", "#dropdown-button", function () {
            //     $(this).next().toggle();
            // });

            // $(document).on("mouseleave", "#dropdown-button", function () {
            //     $(this).next().toggle();
            // });

            // $(document).on("mouseleave", ".dropdown-content-comment", function () {
            //     $(this).toggle();
            // });

            // Kun painetaan dropdownia näkyy vaihtoehdot
            $(document).on("click", "#dropdown-button", function () {
                $(this).next().toggle();
                // Sulkee aikaisemman dropdownin, jos toista painetaan
                $(".dropdown-content-comment").not($(this).next()).hide();
            });

            // Kun painetaan muualla kuin dropdownia, niin se sulkeutuu

             $(document).on("click", function (event) {
                if (!event.target.matches('.dropbtn')) {
                    var dropdowns = document.getElementsByClassName("dropdown-content-comment");
                    var i;
                    for (i = 0; i < dropdowns.length; i++) {
                        var openDropdown = dropdowns[i];
                        if (openDropdown.style.display === 'block') {
                            openDropdown.style.display = 'none';
                        }
                    }
                }
            });


            $(document).ready(function () {
                $(document).on("click", ".comment-button", function () {
                    let postId = $(this).data("post-id");
                    let commentForm = $(`.comment-form[data-post-id="${postId}"]`);
                    commentForm.toggle();
            
                    // Varmista, että käsittelijää ei lisätä uudelleen, jos se on jo liitetty
                    if (!commentForm.data('input-handler-added')) {
                        commentForm.find('#comment-input').on("input", function () {
                            let maxLength = 100;
                            if ($(this).val().length > maxLength) {
                                $(this).val($(this).val().substring(0, maxLength));
                            }
                            commentForm.find('#comment-char-counter').text($(this).val().length + '/100');
                        });
                        // Merkitään, että käsittelijä on liitetty
                        commentForm.data('input-handler-added', true);
                    }
                });
            });
            

        $(document).ready(function () {
            $(document).on("submit", ".comment-form", function (event) {
                event.preventDefault();

                const postId = $(this).data("post-id");
                const commentInput = $(this).find("#comment-input");
                const comment = commentInput.val();
                const token = localStorage.getItem("jwtToken");

                fetch(`/api/posts/${postId}/comments`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token,
                    },
                    body: JSON.stringify({ comment: comment }),
                })
                    .then((response) => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error("Failed to add comment");
                        }
                    })
                    .then((data) => {
                        console.log(data);
                        commentInput.val(""); // Tyhjennä kommenttikenttä
                        updateCommentsForPost(postId, userId); // Päivitä kommentit kyseiselle postaukselle
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                    });
            });
        });
    }
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

//=========================================FUNKTIOT=========================================

// Funktio kommentin poistamiseen
function deleteComment(commentId, postId, userId) {
    console.log("Poistetaan kommentti", commentId);

    //Kysyy käyttäjältä onko varma että haluaa poistaa kommentin
    if (confirm("Are you sure you want to delete this comment?")) {
        // Poista kommentti
        fetch(`/api/comments/${commentId}`, {
            method: "DELETE",
            headers: {
                Authorization: "Bearer " + localStorage.getItem("jwtToken"),
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to delete comment");
                }
                return response.json();
            })
            .then((data) => {
                console.log(data);
                // Päivitä kommentit
                console.log(postId);
                updateCommentsForPost(postId, userId);
            })
            .catch((error) => {
                console.error("Error deleting comment:", error);
            });
    }
}

// Funktio kommentin muokkaamiseen
function editComment(commentId) {
    console.log("Muokataan kommenttia", commentId);

    const commentParagraph = document.querySelector(`p[data-comment-id="${commentId}"]`);
    console.log(commentParagraph);
    
    if (commentParagraph) {
        const currentText = commentParagraph.innerText;

        // Tekee uuden input-elementin ja asettaa siihen kommentin nykyisen tekstin
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = currentText;
        inputElement.classList.add('comment-input'); 
        // <p data-comment-id="${comment._id}">${comment.comment}</p> 
        // Laita data kommenttiin


            // Lisää tapahtumankäsittelijä, joka tallentaa muokatun kommentin kun input-elementti menettää fokuksen
        inputElement.addEventListener('blur', function() {
            // Tallenna muokattu kommentti
            saveUpdatedComment(commentId, inputElement.value);

            // Luo uusi p-elementti ja asettaa siihen muokatun kommentin tekstin
            const updatedParagraph = document.createElement('p');
            updatedParagraph.innerText = inputElement.value;
                    // <p data-comment-id="${comment._id}">${comment.comment}</p> 
        // Laita data kommenttiin
            updatedParagraph.dataset.commentId = commentId;
            inputElement.replaceWith(updatedParagraph);
        });

        // Korvaa p-elementti input-elementillä
        commentParagraph.replaceWith(inputElement);

       // Aseta fokus input-elementtiin
        inputElement.focus();
    }
}

function saveUpdatedComment(commentId, updatedText) {
    fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: updatedText })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update comment');
        }
        return response.json();
    })
    .then(data => {
        console.log('Updated comment:', data);
    })
    .catch(error => {
        console.error('Error updating comment:', error);
    });
}

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

// Funktion määritelmä kommenttien päivittämiseksi tietylle postaukselle
function updateCommentsForPost(postId, userId) {
    const token = localStorage.getItem("jwtToken");
    fetch(`/api/posts/${postId}/comments`, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token,
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch comments");
            }
            return response.json();
        })
        .then((comments) => {
            const commentsContainer = document.querySelector(
                `.comments-container[data-post-id="${postId}"]`
            );
            let commentsHtml = comments
                .map((comment) => {
                    const ownComment = comment.userId === userId;
                    return `
                <div class="comment" data-post-id="${postId}">
                    <img class="profile-pic" onclick="window.location.href='/profile?profileId=${comment.userId
                    }'" src="${comment.profilePicture || "pictures/user.png"
                        }" alt="Profiilikuva">
                    <div class="comment-content">
                        <div class="comment-header">
                            <h4 class="comment-username" onclick="window.location.href='/profile?profileId=${comment.userId
                            }'">${comment.username || "Anonyymi"
                        }</h4>
                            <span class="comment-datetime">${formatTimestamp(comment.timestamp)}</span>

                        ${ownComment ? `
                        <img src="pictures/pisteet.png" alt="Options" class="dropbtn" id="dropdown-button">
                        <div class="dropdown-content-comment">
                            <p onClick="deleteComment('${comment._id}', '${postId}', '${userId}')">Delete</p>
                            <p onClick="editComment('${comment._id}')">Edit</p>
                        </div>
                        ` : ''}
                        </div>
                        <p data-comment-id="${comment._id}">${comment.comment}</p>
                    </div>
                </div>`;
                })
                .join("");
            commentsContainer.innerHTML = commentsHtml; // Päivitä kommentit sivulle

            // Päivitä kommenttien lukumäärä ja säilytä kuva
            const commentsCountElement = document.querySelector(
                `#comments-count[data-post-id="${postId}"]`
            );
            if (commentsCountElement) {
                commentsCountElement.innerHTML = `${comments.length} <img src="pictures/comment.png" alt="Comment">`; // Päivitä lukumäärä ja kuva
            }
        })
        .catch((error) => {
            console.error("Error updating comments:", error);
        });
}


function formatTimestamp(timestamp) {
    // Tämä funktio muuttaa aikaleiman luettavaan muotoon
    var postDate = new Date(timestamp);
    var currentDate = new Date();
    var comparisonDate = new Date(postDate.getTime());

    comparisonDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    if (comparisonDate.getTime() === currentDate.getTime()) {
        var timeFormatter = new Intl.DateTimeFormat("default", {
            hour: "numeric",
            minute: "numeric",
        });
        return timeFormatter.format(postDate);
    } else {
        return postDate.toLocaleDateString();
    }
}

// document.getElementById('comment-input').addEventListener('input', function () {
//     // Rajoitetaan merkkien määrä maksimissaan 100 merkkiin
//     if (this.value.length > 100) {
//         this.value = this.value.substring(0, 100);
//     }
//     // Päivitä merkkilaskuri
//     document.getElementById('comment-char-counter').innerText = `${this.value.length}/100`;
// });


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
