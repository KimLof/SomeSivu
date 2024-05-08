
document.getElementById('pswresetForm').addEventListener('submit', function(event) {
event.preventDefault();
const password = document.getElementById('newPassword').value;
const passwordCheck = document.getElementById('newPasswordCheck').value;
const token = window.location.pathname.split('/')[2];

console.log('Token: '   + token);
if (password !== passwordCheck) {
    alert('Passwords do not match!');
    return;
}
else if (password.length < 8) {
    alert('Salasanan pitää olla vähintään 8 merkkiä pitkä!');
    return;
}
else if (!password.match(/[a-z]/g) || !password.match(/[A-Z]/g) || !password.match(/[0-9]/g)) {
    alert('Salasanassa pitää olla vähintään yksi pieni kirjain, yksi iso kirjain ja yksi numero!');
    return;
}
else{
    hashPassword(password).then(hashedPassword => {
    fetch('/api/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            password: hashedPassword,
            token: token
        }),
    }).then(response => {
        if(response.ok) {
            alert('Password reset successful! You can now log in.');
            window.location.href = '/login';
            return response.json();
        } else {
            throw new Error('Password reset failed');
        }
        
        
    }).catch((error) => {
        console.error('Error:', error);
        alert('Password reset failed.');    

    });

}
)
}
 
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

});
    
