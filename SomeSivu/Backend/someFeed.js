document.addEventListener("DOMContentLoaded", function () {
    //tämä funktio näyttää debug-dataa kun painetaan debug-nappia
    console.log("DOM fully loaded and parsed");

    const toggleDebugButton = document.getElementById("toggle-debug");
    const debugDataParagraphs = document.getElementsByClassName("debug-data");

    toggleDebugButton.addEventListener("click", function () {
        for (let i = 0; i < debugDataParagraphs.length; i++) {
            console.log("Toggling visibility for element", i);

            if (debugDataParagraphs[i].style.display === "none") {
                debugDataParagraphs[i].style.display = "block";
            } else {
                debugDataParagraphs[i].style.display = "none";
            }
        }
    });

    const logoutLink = document.getElementById('logout-link');

    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();

        // Poista token LocalStoragesta
        localStorage.removeItem('jwtToken');

        // Ohjaa käyttäjä kirjautumissivulle
        window.location.href = '/login';
    });
});

document.getElementById("search-button").addEventListener("click", function () {
    const searchInput = document.getElementById("search-input").value;

    fetch(`/api/users/search?q=${encodeURIComponent(searchInput)}`)
        .then((response) => response.json())
        .then((users) => {
            const resultsContainer = document.getElementById("user-search-results");
            resultsContainer.innerHTML = ""; // Tyhjennä aiemmat tulokset

            users.forEach((user) => {
                const userElement = document.createElement("div");
                userElement.textContent = user.username;
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
                console.log(userProfile);
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

                    const userHasLiked = post.likes.includes(userId);
                    const likeButtonText = userHasLiked ? "Unlike" : "Like";

                    let postId = post._id;
                    let likesCount = post.likes ? post.likes.length : 0;
                    let commentsCount = post.comments ? post.comments.length : 0;

                    let commentsHtml = post.comments
                        .map((comment) => {
                            return `
                        <div class="comment" data-post-id="${postId}">
                            <img class="profile-pic" src="${comment.profilePicture ||
                                "path/to/default-profile.png"
                                }" alt="Profiilikuva">
                            <div class="comment-content">
                                <div class="comment-header">
                                    <h4 class="comment-username">${comment.username || "Anonyymi"
                                }</h4>
                                    <span class="comment-datetime">${formatTimestamp(
                                    comment.timestamp
                                )}</span>
                                    <p style="color: gray;" class="debug-data"> comment.userId; ${comment.userId
                                }</p>
                                </div>
                                <p>${comment.comment}</p>
                                <p style="color: gray;" class="debug-data">comment._id; ${comment._id
                                }</p>
                            </div>
                        </div>`;
                        })
                        .join("");

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
                        <p style="color: gray;" class="debug-data">post.userId; ${post.userId
                        }</p>
                        <p>${formatTimestamp(post.timestamp)}</p>
                        <p style="color: gray;" class="debug-data">post._id; ${post._id
                        }</p>
                    </div>
                </div>
                <p>${post.content}</p>
                <div id="likes-section">
                <button class="like-button" data-post-id="${postId}">${likeButtonText}</button>
                <button class="comment-button" data-post-id="${postId}">Comment</button>
                    <div class="post-likes-comments">
                    <span class="likes-count" data-post-id="${postId}">${likesCount}<img src="like.png" alt="Like"></span>
                        <span id="comments-count" data-post-id="${postId}">${commentsCount}<img src="comment.png" alt="Comment"></span>
                        </div>
                </div>
                <section id="comments-container">
                    <div id="comments-display">
                        <form class="comment-form" style="display: none;" data-post-id="${postId}">
                            <input type="text" id="comment-input"
                                placeholder="Write your comment here" required>
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
                                    likeCountElement.innerHTML = `${data.likesCount} <img src="like.png" alt="Like">`;
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

        $(document).ready(function () {
            //tämä näyttää kommenttikentän kun painetaan comment-nappia
            $(document).on("click", ".comment-button", function () {
                let postId = $(this).data("post-id");
                $(`.comment-form[data-post-id="${postId}"]`).toggle();
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
                        updateCommentsForPost(postId); // Päivitä kommentit kyseiselle postaukselle
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                    });
            });
        });
    }
});

// Funktion määritelmä kommenttien päivittämiseksi tietylle postaukselle
function updateCommentsForPost(postId) {
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
                    return `
                <div class="comment" data-post-id="${postId}">
                    <img class="profile-pic" src="${comment.profilePicture || "path/to/default-profile.png"
                        }" alt="Profiilikuva">
                    <div class="comment-content">
                        <div class="comment-header">
                            <h4 class="comment-username">${comment.username || "Anonyymi"
                        }</h4>
                            <span class="comment-datetime">${comment.timestamp
                        }</span>
                            <p style="color: gray;" class="debug-data"> comment.userId; ${comment.userId
                        }</p>
                        </div>
                        <p>${comment.comment}</p>
                        <p style="color: gray;" class="debug-data">comment._id; ${comment._id
                        }</p>
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
                commentsCountElement.innerHTML = `${comments.length} <img src="comment.png" alt="Comment">`; // Päivitä lukumäärä ja kuva
            }
        })
        .catch((error) => {
            console.error("Error updating comments:", error);
        });
}
