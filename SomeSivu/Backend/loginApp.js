document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
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
});