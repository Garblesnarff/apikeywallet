document.addEventListener('DOMContentLoaded', function() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-key-id');
            copyApiKey(keyId);
        });
    });

    function copyApiKey(keyId) {
        fetch(`/copy_key/${keyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrf_token')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.key) {
                navigator.clipboard.writeText(data.key)
                    .then(() => {
                        alert('API Key copied to clipboard!');
                    })
                    .catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
            } else {
                alert('Failed to retrieve API Key');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while copying the API Key');
        });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
