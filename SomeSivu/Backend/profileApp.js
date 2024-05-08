document.addEventListener("DOMContentLoaded", function () {
  // Tarkistetaan onko token tallennettu
  if (!localStorage.getItem("jwtToken")) {
    // Jos tokenia ei ole, ohjataan käyttäjä kirjautumissivulle
    window.location.href = "/login";
  } else {
    const editProfileButton = document.getElementById('editProfileButton');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const bioInput = document.getElementById('bio');
    const locationInput = document.getElementById('location');
    const friendsVisibility = document.getElementById('friendsVisibility');
    const profilePictureInput = document.getElementById('profilepicture');
    const friendsCount = document.querySelector(".friendsCount");
    const profilePic = document.querySelector(".profile-pic");

    let userId = ""; // Tähän tulee kirjautuneen käyttäjän id
    let currentUserProfile = {}; // Tähän tulee kirjautuneen käyttäjän profiilitiedot

    fetchNotifications(); // Hae ilmoitukset ja päivitä dropdown

    const token = localStorage.getItem("jwtToken"); // Hakee tokenin selaimen Local Storagesta

    // Hae profileId URL-parametrista
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('profileId');

    // Jos profileId:tä ei ole annettu, ohjaa jonnekin, esim. etusivulle
    if (!profileId) {
      profileId = "own";
    }

    //console.log("profileId: " + profileId);
    
      //Profiilikuvan katsominen
      profilePic.addEventListener('click', function () {
      //  console.log("Profiilikuvaa klikattu");


        console.log("Profiilikuvan URL: " + currentUserProfile.profilePictureUrl || 'pictures/user.png')
        document.getElementById('profilePic-modal-content').innerHTML = `
        <img src="${currentUserProfile.profilePictureUrl || 'pictures/user.png'}" alt="Profiilikuva" id="profilePic">
        `;

        document.getElementById('profilePicModal').style.display = 'block';

      });

      // sulkee modalin kun painetaan rastia
      $(document).on('click', '.close', function () {
        $('#profilePicModal').hide();
      });

      // sulkee modalin kun painetaan ulkopuolelle
      $(document).on('click', '#profilePicModal', function (event) {

        if (event.target == this) {
          $(this).hide();
        }
      });

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
    
    
            // Sulje modaalissa oleva kuva kun käyttäjä painaa X-nappia
            document.getElementById("close-modal").addEventListener("click", function () {
                document.getElementById('image-modal').style.display = "none";
                document.getElementById('modal-image').innerHTML = "";
            });


    // Kaverien katsominen
    friendsCount.addEventListener('click', function () {
      fetch(`/api/friends?profileId=${profileId}`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("jwtToken"),
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Kaverien haku epäonnistui");
          }
          return response.json();
        })
        .then((data) => {
          document.getElementById('friends-modal-header').textContent = 'Friends of ' + currentUserProfile.username || "User";
          console.log(data);
          let friendsHtml = data.map(friend => {
            console.log("friend: " + friend.name);
            return `
            <div class="friend" data-profile-id="${friend.id}">
              <div class="friend-header">
                <h3 class="friend-profile-name" onclick="window.location.href='/profile?profileId=${friend.id}'">${friend.name}</h3>
                <img class="friend-profile-pic" onclick="window.location.href='/profile?profileId=${friend.id}'"
                src="${friend.profilePicture || 'pictures/user.png'}" alt="Profiilikuva">
              </div>
              <div class="friend-info" style="white-space: pre-line;">
                <h5>${friend.bio}</h5>
                <h7>${friend.location}</h7>
              </div>
            </div>`;
          }).join('');
          document.getElementById('friends-modal-content').innerHTML = friendsHtml;
          document.getElementById('friendsModal').style.display = 'block';
        })
        .catch((error) => {
          console.error("Virhe haettaessa kavereita:", error);
        });
    });

    editProfileButton.addEventListener('click', function () {
      bioInput.value = decodeHtmlEntities(currentUserProfile.bio);
      locationInput.value = decodeHtmlEntities(currentUserProfile.location);
      profilePictureInput.value = currentUserProfile.profilePictureUrl;
      friendsVisibility.value = currentUserProfile.friendsHidden;

      // console.log("Kavereiden näkyvyys: " + currentUserProfile.friendsHidden);

      // Show modal
      document.getElementById('editProfileModal').style.display = 'block';
    });

    saveProfileButton.addEventListener('click', function (event) {
      event.preventDefault();


      const updatedFriendsHidden = friendsVisibility.value;
      const updatedBio = htmlEncode(bioInput.value);
      const updatedLocation = htmlEncode(locationInput.value);
      const updatedProfilePicture = profilePictureInput.value;

      fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('jwtToken')
        },
        body: JSON.stringify({
          bio: updatedBio,
          location: updatedLocation,
          profilePicture: updatedProfilePicture,
          friendsHidden: updatedFriendsHidden
        })
      }).then(response => {
        if (response.ok) {
          alert('Profile updated successfully!');
          // TÄHÄN PITÄÄ LISÄTÄ PÄIVITYS NÄKYMÄÄN ====================================================================================================================
          location.reload(); // Esimerkki: päivitä sivu
        } else {
          alert('Failed to update profile. Please try again.');
        }
      });
    });

//HTML-encode XSS vastaan, esim '<' muutetaan '&lt;':ksi jne.
function htmlEncode(text) {
  var div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
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



//decode html että näkyy editissä kunnolla
function decodeHtmlEntities(html) {
  var textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
}

    // funktio hakee profiilin tiedot

      fetch(`/api/profile?profileId=${profileId}`, {
        method: "GET",
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
  
  
          userId = data.loggedUserId;
  
          if (data.ownProfile === true) {
            console.log("Oma profiili");
            document.getElementById('addFriendButton').style.display = 'none';
          }
          else {
            console.log("Ei oma profiili");
            document.getElementById('editProfileButton').style.display = 'none';
          }
  
          if (data.friends === "true") {
            console.log("Kaveri");
            document.getElementById('addFriendButton').style.display = 'none';
          }
          else if (data.friends === "pending") {
            console.log("Kaveripyyntö lähetetty");
            // lukee että kaveripyyntö lähetetty
            document.getElementById('addFriendButton').textContent = 'Friend request sent';
            document.getElementById('addFriendButton').disabled = true;
          }
  
          currentUserProfile = data;
  
       //   console.log("Kavereiden näkyvyys: " + data.friendsHidden);
  
          document.querySelector(".profile-pic").src =
            data.profilePictureUrl || "pictures/user.png";
          document.querySelector(".profile-card h2").textContent = data.username;
          document.querySelector(".bio").textContent = data.bio;
          document.querySelector(".bio").innerHTML = data.bio.replace(/\n/g, '<br>');
          document.querySelector(".friendsCount").textContent = "Friends: " + data.friendsCount;
          document.querySelector(".location").textContent =
            data.location;
          document.querySelector(".joined").textContent =
            "Joined: " + new Date(data.joined).toLocaleDateString();
          document.querySelector(".postsCount").textContent =
            "Posts: " + data.postsCount;
  
         // console.log("Onko kaveri:  " + data.friends);

         console.log(data)  
  
          if(data.ownProfile === true) {

          }
          else if (data.friendsHidden === "private") {
            document.querySelector(".friendsCount").style.display = 'none';
          }
          else if (data.friendsHidden === "friendsOnly" && data.friends === "false") {
            document.querySelector(".friendsCount").style.display = 'none';
          }

          fetchPosts();
        })
        .catch((error) => {
          console.error("Virhe haettaessa käyttäjän tietoja:", error);
          window.location.href = "/login"; //Pitää ehkä poistaa tulevaisuudessa
        });
      


      function fetchPosts() {
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
        postsContainer.innerHTML = '';

        if (postsWithUserInfo.length === 0) {
          const noPostsMessage = document.createElement('h5');
          noPostsMessage.textContent = 'No posts yet, start sharing your thoughts!';
          noPostsMessage.style.color = 'gray';
          postsContainer.appendChild(noPostsMessage);
        }

        postsWithUserInfo.forEach((post) => {
          const postElement = document.createElement("div");

          //console.log("post" + post._id)
      //    console.log("EKA userId: " + userId)
          const userHasLiked = post.likes.includes(userId);
      //    console.log("userHasLiked: " + userHasLiked);
          const likeButtonText = userHasLiked ? "Unlike" : "Like";


          let postId = post._id;
          let likesCount = post.likes ? post.likes.length : 0;
          let commentsCount = post.comments ? post.comments.length : 0;

          let commentsHtml = post.comments.map(comment => {
            return `
                <div class="comment" data-post-id="${postId}">
                    <img class="profile-pic" onclick="window.location.href='/profile?profileId=${comment.userId
                    }'" src="${comment.profilePicture || 'pictures/user.png'}" alt="Profiilikuva">
                    <div class="comment-content">
                        <div class="comment-header">
                            <h4 class="comment-username" onclick="window.location.href='/profile?profileId=${comment.userId
                            }'">${comment.username || 'Anonyymi'}</h4>
                            <span class="comment-datetime">${formatTimestamp(comment.timestamp)}</span>
                        </div>
                        <p>${comment.comment}</p>

                    </div>
                </div>`;
          }).join('');

          if( post.profilePicture === "") {
            post.profilePicture = "pictures/user.png";
        };

          postElement.innerHTML = `
          <section class="post">
          <div class="post-header">
            <img src="${post.profilePicture}" alt="Profiilikuva" class="profile-pic">
            <div class="post-userdata">
            <h2 onclick="window.location.href='/profile?profileId=${post.userId}'">${post.username}</h2>
                <p>${formatTimestamp(post.timestamp)}</p>
            </div>
          </div>
          <p>${post.content}</p>
          ${post.picture === "" ? "" : `<img src="${post.picture}" alt="Post image" id="post-picture">`}
          <div id="likes-section">
          <button class="like-button" data-post-id="${postId}">${likeButtonText}</button>
            <button class="comment-button" data-post-id="${postId}">Comment</button>
            
            ${post.ownProfile ? `<button class="edit-post-button" data-post-id="${postId}" data-post-content="${htmlEncode(post.content)}" data-post-image="${post.picture}">Edit</button>` : ""}
            <div class="post-likes-comments">
            <span class="likes-count" data-post-id="${postId}">${likesCount}<img src="pictures/like.png" alt="Like"></span>
                <span id="comments-count" data-post-id="${postId}">${commentsCount}<img src="pictures/comment.png" alt="Comment"></span>
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

          //  console.log("USERIIIID: " + userId);

          //  console.log("Is liked: " + isLiked)


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
      .catch(error => {
        console.error('Error fetching posts:', error);
      });
  }

    $(document).ready(function () { //tämä näyttää kommenttikentän kun painetaan comment-nappia
      $(document).on('click', '.comment-button', function () {
        let postId = $(this).data('post-id');
        $(`.comment-form[data-post-id="${postId}"]`).toggle();
      });
    });

    // ========================== friends modal alkaa =============================
    
    // sulkee modalin kun painetaan rastia
    $(document).on('click', '.close', function () {
      $('#friendsModal').hide();
    });

    // sulkee modalin kun painetaan ulkopuolelle
    $(document).on('click', '#friendsModal', function (event) {
      if (event.target == this) {
        $(this).hide();
      }
    });

    // ========================== friends modal päättyy =============================
    // ========================== edit post =============================
    $(document).ready(function () {
      // Kun muokkauspainiketta klikataan
      $(document).on('click', '.edit-post-button', function () {
        var postId = $(this).data('post-id'); // Hae postauksen ID
        var postContent = $(this).data('post-content'); // Hae postauksen sisältö
        var picture = $(this).data('post-image'); // Hae postauksen kuva

        postContent = postContent.replace('<br>', "\n"); // Korvataan kaikki rivinvaihdot <br>-tagilla

        // Aseta postauksen sisältö muokkausmodaalin tekstikenttään
        $('#post-content-textarea').val(postContent);

        //Aseta postauksen kuva muokkausmodaalin kuva kenttään
        $('#post-image-url').val(picture);

        // Tallenna postauksen ID muokkausmodaaliin, jotta sitä voidaan käyttää myöhemmin tallennettaessa muutoksia
        $('#editPostModal').data('post-id', postId);

        // Näytä muokkausmodaali
        $('#editPostModal').css('display', 'block');
      });
    });

    $('#editPostForm').on('submit', function (event) {
      event.preventDefault();

      var postId = $('#editPostModal').data('post-id'); // Hae tallennettu postauksen ID
      var updatedContent = $('#post-content-textarea').val();
      var picture = $('#post-image-url').val();

      updatedContent = updatedContent.replace(/\n/g, '<br>'); // Korvataan kaikki rivinvaihdot <br>-tagilla

      // Lähetä päivitetty sisältö backendiin
      fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + localStorage.getItem("jwtToken"),
        },
        body: JSON.stringify({ content: updatedContent, picture: picture })
      })
        .then(response => {
          if (response.ok) {
            // Päivitä näkymä uudella sisällöllä tai sulje modaali
            $('#editPostModal').hide();
            // TÄHÄN PITÄÄ LISÄTÄ PÄIVITYS NÄKYMÄÄN ====================================================================================================================
            location.reload(); // Esimerkki: päivitä sivu mutta huono tapa
          } else {
            throw new Error('Failed to update post');
          }
        })
        .catch(error => {
          console.error('Error updating post:', error);
        });
    });


    // When the user clicks on <span> (x), close the modal
    $(document).on('click', '.close', function () {
      $('#editPostModal').hide();
    });

    // When the user clicks anywhere outside of the modal, close it
    $(document).on('click', '#editPostModal', function (event) {
      if (event.target == this) {
        $(this).hide();
      }
    });

    $(document).on('click', '#deletePostButton', function (event) {
      event.preventDefault();

      var postId = $('#editPostModal').data('post-id');
      const confirmDelete = confirm("Are you sure you want to delete this post?");

      if (confirmDelete) {
        // Lähetä DELETE-pyyntö palvelimelle poistettavan postauksen ID:llä
        fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: "Bearer " + localStorage.getItem("jwtToken"),
          }
        })
          .then(response => {
            if (response.ok) {
              // Poisto onnistui, päivitä sivu tai tee muuta toimenpidettä
            //  console.log('Post deleted successfully');
              // TÄHÄN PITÄÄ LISÄTÄ PÄIVITYS NÄKYMÄÄN ====================================================================================================================
              location.reload(); // Esimerkki: päivitä sivu
            } else {
              throw new Error('Failed to delete post');
            }
          })
          .catch(error => {
            console.error('Error deleting post:', error);
          });
      }
    });


    // ========================== edit post päättyy =============================
    // ========================== edit profile alkaa =============================
    window.onload = function () {

      const modalImage = document.getElementById("image-modal");

      var modal = document.getElementById('editProfileModal');
     // var friendsModal = document.getElementById('friendsModal');

      // saadaan nappi joka avaa modali
      var btn = document.getElementById('editProfileButton');

      // Kun käyttäjä klikkaa nappia, avaa modali
      btn.onclick = function () {
        modal.style.display = "block";
        document.body.style.overflowY = 'hidden';
      }

      var span = document.getElementsByClassName("close")[0];

      // Kun käyttäjä klikkaa rastia, sulje modali
      span.onclick = function () {
        modal.style.display = "none";
        document.body.style.overflowY = 'auto';
      }

      // Kun käyttäjä klikkaa ulkopuolelle, sulje modali
      window.onclick = function (event) {
        if (event.target == modal) {
          modal.style.display = "none";
          document.body.style.overflowY = 'auto';
        }
        if (event.target == modalImage ) {
            document.getElementById('image-modal').style.display = "none";
            document.getElementById('modal-image').innerHTML = "";
        }
      }
    }
    // ========================== edit profile päättyy =============================
    // ==========================  friend modal alkaa =============================  
    // window.onload = function () {
    //   var friendsModal = document.getElementById('friendsModal');

    //   var span = document.getElementsByClassName("close")[0];

    //   // Kun käyttäjä klikkaa rastia, sulje modali
    //   span.onclick = function () {
    //     friendsModal.style.display = "none";
    //     document.body.style.overflowY = 'auto';
    //   }

    //   // Kun käyttäjä klikkaa ulkopuolelle, sulje modali
    //   window.onclick = function (event) {
    //     if (event.target == modal) {
    //       friendsModal.style.display = "none";
    //       document.body.style.overflowY = 'auto';
    //     }
    //   }
    // }
    // ==========================  friend modal päättyy =============================

    // ========================== add friend alkaa =============================
    $(document).ready(function () {
      $(document).on('click', '.addFriendButton', function () {
        const confirmation = confirm("Are you sure you want to add this user as a friend?");

        if (confirmation) {
          const token = localStorage.getItem('jwtToken');

          fetch(`/api/friendreq`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ friendId: profileId })
          })
            .then(response => {
              if (response.ok) {
                window.location.reload();
              } else {
                throw new Error('Failed to add friend');
              }
            })
            .catch(error => {
              console.error('Error:', error);
            });
        }
      });
    });

    // ========================== add friend päättyy =============================

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
           // console.log(data);
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
            <img class="profile-pic" onclick="window.location.href='/profile?profileId=${comment.userId
            }'" src="${comment.profilePicture || 'pictures/user.png'}" alt="Profiilikuva">
            <div class="comment-content">
                <div class="comment-header">
                    <h4 class="comment-username" onclick="window.location.href='/profile?profileId=${comment.userId
                    }'" >${comment.username || 'Anonyymi'}</h4>
                    <span class="comment-datetime">${formatTimestamp(comment.timestamp)}</span>
                </div>
                <p>${comment.comment}</p>
            </div>
        </div>`;
      }).join('');
      commentsContainer.innerHTML = commentsHtml; // Päivitä kommentit sivulle
      // Päivitä kommenttien lukumäärä ja säilytä kuva
      const commentsCountElement = document.querySelector(`#comments-count[data-post-id="${postId}"]`);
      if (commentsCountElement) {
        commentsCountElement.innerHTML = `${comments.length} <img src="pictures/comment.png" alt="Comment">`; // Päivitä lukumäärä ja kuva
      }


    })
    .catch(error => {
      console.error('Error updating comments:', error);
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
