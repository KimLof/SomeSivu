document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    const passwordCheck = document.getElementById('newPasswordCheck').value;

    console.log('Rekisteröitymistiedot:', username, email, password, passwordCheck);

    if (password !== passwordCheck) {
        alert('Salasanat eivät täsmää!');
        return;
    }
    else if (password.length < 8) {
        alert('Salasanan pitää olla vähintään 8 merkkiä pitkä!');
        return;
    }
    else if (password.toLowerCase().includes(username.toLowerCase())) {
        alert('Salasana ei saa sisältää käyttäjänimeä!');
        return;
    }
    else if (password.toLowerCase().includes(email.toLowerCase())) {
        alert('Salasana ei saa sisältää sähköpostiosoitetta!');
        return;
    }
    else if (!password.match(/[a-z]/g) || !password.match(/[A-Z]/g) || !password.match(/[0-9]/g)) {
        alert('Salasanassa pitää olla vähintään yksi pieni kirjain, yksi iso kirjain ja yksi numero!');
        return;
    }
    else if (username.length < 3) {
        alert('Käyttäjänimen pitää olla vähintään 3 merkkiä pitkä!');
        return;
    }
    else {
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password, // Hashattua pitäisi olla
            }),
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            alert('Rekisteröityminen onnistui! Voit nyt kirjautua sisään.');
            window.location.href = 'login';
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Rekisteröityminen epäonnistui.');
        });
    }
});
