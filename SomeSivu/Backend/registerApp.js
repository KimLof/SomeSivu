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
        hashPassword(password).then(hashedPassword => {
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: hashedPassword, // Hashattua on salasana
            }),
        })
        .then(response => {
            if(!response.ok) {
                if(response.status === 409){
                    throw new Error('Username or email already in use');
                    
                }
                else {
                    throw new Error('Error registering');
            }
            } 
            return response.json();
        })
        .then(data => {
            console.log(data);
            alert('Success! You can now login.');
            window.location.href = 'login';
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Error registering: ' + error.message);
        });
    })
    }
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
