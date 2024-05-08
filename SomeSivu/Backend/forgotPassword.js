document.getElementById('emailForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        alert('Invalid email address');
        return;
    }

    fetch('/api/password-reset-req', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
        }),
    })
    .then(response => {
        if(response.ok){
            return response.json()
        }
    else {
        throw new Error('Reset request failed');
    }
})
    .then(data => {
        console.log(data);
        alert('Password reset request sent! Check email.');
        window.location.href = 'login';
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Error sending request.');
    });
});