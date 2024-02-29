
var modal = document.getElementById("create-post-modal");

var createpost = document.getElementById("create-post-form");


var btn = document.getElementById("create-post-button");
var sendbtn = document.getElementById("submit");

var span = document.getElementsByClassName("close")[0];

// Kun käyttäjä klikkaa nappia, avaa modali
btn.onclick = function () {
    modal.style.display = "block";
}

span.onclick = function () {
    modal.style.display = "none";
}

// Kun käyttäjä klikkaa lähetä-nappia, sulje modali
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

document.getElementById('create-post-form').addEventListener('keydown', function (event) {
    if (event.keyCode == 13 && event.target.nodeName != 'TEXTAREA') {
        event.preventDefault();
    }
});

document.getElementById('create-post-form').addEventListener('submit', function (event) {
    event.preventDefault();

    let postContent = document.getElementById('post-content-textarea').value;
    postContent = postContent.replace(/\n/g, '<br>'); // Korvataan kaikki rivinvaihdot <br>-tagilla
    const token = localStorage.getItem('jwtToken');

    if (!token) {
        alert('You must be logged in to create a post!');
        return;
    }

    fetch('/api/posts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            content: postContent // Lähetetään lomakkeen tiedot JSON-muodossa
        })
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Failed to create post');
            }
        })
        .then(data => {
            console.log('Post created:', data);
            alert('Post created successfully!');
            modal.style.display = "none";
            window.location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error creating post: ' + error.message);
        });
});
