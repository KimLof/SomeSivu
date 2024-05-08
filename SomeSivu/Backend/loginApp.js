

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

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    hashPassword(password).then(hashedPassword => {
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: hashedPassword,
        }),
    })
    .then(response => {
        if(response.ok) {
            return response.json();
        } else {
            throw new Error('Kirjautuminen epäonnistui');
        }
    })
    .then(data => {
        console.log('Login Response:', data);
        // Tarkistetaan, sisältääkö vastaus tokenin
        if(data.token) {
            // Tallennetaan token selaimen Local Storageen
            localStorage.setItem('jwtToken', data.token);
            alert('Kirjautuminen onnistui! Token tallennettu.');
            // Siirrytään someFeed-sivulle
            window.location.href = '/someFeed.html';
        } else {
            throw new Error('Tokenia ei saatu!');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert(error.message);
        });
    })   
});