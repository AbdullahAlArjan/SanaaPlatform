document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Simple validation
        let isValid = true;
        
        if(username.trim() === '') {
            document.getElementById('username-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('username-error').style.display = 'none';
        }
        
        if(password.length < 6) {
            document.getElementById('password-error').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('password-error').style.display = 'none';
        }
        
        if(isValid) {
            // Here you would typically send the data to the server
            console.log('Login submitted', {username, password});
            // For demo purposes, we'll just show an alert
            alert('Login successful! (This is a demo)');
        }
    });
});