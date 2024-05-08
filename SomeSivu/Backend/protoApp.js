const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
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
            throw new Error('Login failed!');
        }
    })
    .then(data => {
        console.log('Login Response:', data);
        // Tarkistetaan, sisältääkö vastaus tokenin
        if(data.token) {
            // Tallennetaan token selaimen Local Storageen
            localStorage.setItem('jwtToken', data.token);
            alert('Login successful! Redirecting...');
            // Siirrytään someFeed-sivulle
            window.location.href = '/someFeed.html';
        } else {
            throw new Error('No token aquired!');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert(error.message);
        });
    })   
});



registerForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    const passwordCheck = document.getElementById('newPassword').value;

    console.log('Rekisteröitymistiedot:', username, email, password, passwordCheck);

    if (password !== passwordCheck) {
        alert('Passwords dont match!');
        return;
    }
    else if (password.length < 8) {
        alert('Password must be atleast 8 characters!');
        return;
    }
    else if (password.toLowerCase().includes(username.toLowerCase())) {
        alert('Password cant contain username!');
        return;
    }
    else if (password.toLowerCase().includes(email.toLowerCase())) {
        alert('Password cant contain email!');
        return;
    }
    else if (!password.match(/[a-z]/g) || !password.match(/[A-Z]/g) || !password.match(/[0-9]/g)) {
        alert('Password must contain atleast: 1 uppercase letter, 1 lowercase letter and 1 number!');
        return;
    }
    else if (username.length < 3) {
        alert('Username must be longer than 3 characters!');
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