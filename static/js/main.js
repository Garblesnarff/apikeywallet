document.addEventListener('DOMContentLoaded', function() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-key-id');
            copyApiKey(keyId);
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-key-id');
            if (confirm('Are you sure you want to delete this API key?')) {
                deleteApiKey(keyId);
            }
        });
    });

    async function copyApiKey(keyId) {
        try {
            const response = await fetch(`/copy_key/${keyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrf_token')
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.key) {
                await navigator.clipboard.writeText(data.key);
                showFeedback('API Key copied to clipboard!', 'success');
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error('Unexpected response from server');
            }
        } catch (error) {
            console.error('Error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        }
    }

    async function deleteApiKey(keyId) {
        try {
            const response = await fetch(`/delete_key/${keyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrf_token')
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            location.reload(); // Reload the page to reflect the changes
        } catch (error) {
            console.error('Error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        }
    }

    function showFeedback(message, type) {
        const feedbackElement = document.createElement('div');
        feedbackElement.textContent = message;
        feedbackElement.className = `feedback ${type}`;
        document.body.appendChild(feedbackElement);

        setTimeout(() => {
            feedbackElement.remove();
        }, 3000);
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
});
