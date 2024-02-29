window.onload = function () {
    
    var modal = document.getElementById('editProfileModal');

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
    }
}