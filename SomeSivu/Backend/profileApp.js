document.addEventListener("DOMContentLoaded", function () {
  // Tarkistetaan onko token tallennettu
  if (!localStorage.getItem("jwtToken")) {
    // Jos tokenia ei ole, ohjataan käyttäjä kirjautumissivulle
    window.location.href = "/login";
  } else {
    let userId = ""; // Tähän tulee kirjautuneen käyttäjän id
    
    const token = localStorage.getItem("jwtToken"); // Hakee tokenin selaimen Local Storagesta

    // Hae profileId URL-parametrista
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('profileId');

    // Jos profileId:tä ei ole annettu, ohjaa jonnekin, esim. etusivulle
    if (!profileId) {
      profileId = "own";
    }




    fetch(`/api/profile?profileId=${profileId}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("jwtToken"),
      },
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Jos käyttäjä ei ole autentikoitu, ohjataan kirjautumissivulle
            window.location.href = "/login";
            return;
          }
          throw new Error("Profiilin haku epäonnistui");
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        document.querySelector(".profile-pic").src =
          data.profilePictureUrl || "fallback_profiilikuva.png";
        document.querySelector(".profile-card h2").textContent = data.username;
        document.querySelector(".bio").textContent = data.bio;
        document.querySelector(".location").textContent =
          data.location;
        document.querySelector(".joined").textContent =
          "Joined: " + new Date(data.joined).toLocaleDateString();
        document.querySelector(".postsCount").textContent =
          "Posts: " + data.postsCount;
      })
      .catch((error) => {
        console.error("Virhe haettaessa käyttäjän tietoja:", error);
        window.location.href = "/login"; //Pitää ehkä poistaa tulevaisuudessa
      });


    fetch(`/api/posts?profileId=${profileId}`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("jwtToken"),
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch posts"); // Heitä virhe, jos vastaus ei ole ok
        }
        return response.json();
      })
      .then((postsWithUserInfo) => {
        const postsContainer = document.getElementById("posts-container");
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

          let commentsHtml = post.comments.map(comment => {
            return `
                <div class="comment" data-post-id="${postId}">
                    <img class="profile-pic" src="${comment.profilePicture || 'path/to/default-profile.png'}" alt="Profiilikuva">
                    <div class="comment-content">
                        <div class="comment-header">
                            <h4 class="comment-username">${comment.username || 'Anonyymi'}</h4>
                            <span class="comment-datetime">${formatTimestamp(comment.timestamp)}</span>
                            <p style="color: gray;" class="debug-data"> comment.userId; ${comment.userId}</p>
                        </div>
                        <p>${comment.comment}</p>
                        <p style="color: gray;" class="debug-data">comment._id; ${comment._id}</p>
                    </div>
                </div>`;
          }).join('');


          postElement.innerHTML = `
        <section class="post">
        <div class="post-header">
            <img src="${post.profilePicture}" alt="Profiilikuva" class="profile-pic">
            <div class="post-userdata">
            <h2 onclick="window.location.href='/profile?profileId=${post.userId}'">${post.username}</h2>
                <p style="color: gray;" class="debug-data">post.userId; ${post.userId}</p>
                <p>${formatTimestamp(post.timestamp)}</p>
                <p style="color: gray;" class="debug-data">post._id; ${post._id}</p>
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
                // Oletetaan, että palvelin palauttaa päivitetyn tykkäysten määrän
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
          .catch(error => {
            console.error('Error fetching posts:', error);
          });

        $(document).ready(function () { //tämä näyttää kommenttikentän kun painetaan comment-nappia
          $(document).on('click', '.comment-button', function () {
            let postId = $(this).data('post-id');
            $(`.comment-form[data-post-id="${postId}"]`).toggle();
          });
        });

        $(document).ready(function () {
          $(document).on('submit', '.comment-form', function (event) {
            event.preventDefault();

            const postId = $(this).data('post-id');
            const commentInput = $(this).find('#comment-input');
            const comment = commentInput.val();
            const token = localStorage.getItem('jwtToken');

            fetch(`/api/posts/${postId}/comments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({ comment: comment })
            })
              .then(response => {
                if (response.ok) {
                  return response.json();
                } else {
                  throw new Error('Failed to add comment');
                }
              })
              .then(data => {
                console.log(data);
                commentInput.val(''); // Tyhjennä kommenttikenttä
                updateCommentsForPost(postId); // Päivitä kommentit kyseiselle postaukselle
              })
              .catch(error => {
                console.error('Error:', error);
              });
          });
        });
      }
});


// Funktion määritelmä kommenttien päivittämiseksi tietylle postaukselle
function updateCommentsForPost(postId) {
  const token = localStorage.getItem('jwtToken');
  fetch(`/api/posts/${postId}/comments`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json();
    })
    .then(comments => {
      const commentsContainer = document.querySelector(`.comments-container[data-post-id="${postId}"]`);
      let commentsHtml = comments.map(comment => {
        return `
        <div class="comment" data-post-id="${postId}">
            <img class="profile-pic" src="${comment.profilePicture || 'path/to/default-profile.png'}" alt="Profiilikuva">
            <div class="comment-content">
                <div class="comment-header">
                    <h4 class="comment-username">${comment.username || 'Anonyymi'}</h4>
                    <span class="comment-datetime">${comment.timestamp}</span>
                    <p style="color: gray;" class="debug-data"> comment.userId; ${comment.userId}</p>
                </div>
                <p>${comment.comment}</p>
                <p style="color: gray;" class="debug-data">comment._id; ${comment._id}</p>
            </div>
        </div>`;
      }).join('');
      commentsContainer.innerHTML = commentsHtml; // Päivitä kommentit sivulle
      // Päivitä kommenttien lukumäärä ja säilytä kuva
      const commentsCountElement = document.querySelector(`#comments-count[data-post-id="${postId}"]`);
      if (commentsCountElement) {
        commentsCountElement.innerHTML = `${comments.length} <img src="comment.png" alt="Comment">`; // Päivitä lukumäärä ja kuva
      }


    })
    .catch(error => {
      console.error('Error updating comments:', error);
    });
}