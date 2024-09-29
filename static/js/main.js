document.addEventListener('DOMContentLoaded', function() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const modal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    let currentKeyId = null;
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-key-id');
            copyApiKey(keyId);
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentKeyId = this.getAttribute('data-key-id');
            modal.style.display = 'block';
        });
    });

    confirmDeleteBtn.addEventListener('click', function() {
        if (currentKeyId) {
            deleteApiKey(currentKeyId);
            modal.style.display = 'none';
        }
    });

    cancelDeleteBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            showFeedback(data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
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
            feedbackElement.classList.add('show');
        }, 100);

        setTimeout(() => {
            feedbackElement.classList.remove('show');
            setTimeout(() => {
                feedbackElement.remove();
            }, 300);
        }, 3000);
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // New code for category filtering and updating
    const categoryList = document.getElementById('category-list');
    const categorySelects = document.querySelectorAll('.category-select');
    const apiKeys = document.querySelectorAll('.api-key');

    categoryList.addEventListener('click', function(e) {
        if (e.target.tagName === 'LI') {
            const categoryId = e.target.getAttribute('data-category-id');
            filterApiKeys(categoryId);
            document.querySelectorAll('#category-list li').forEach(li => li.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    categorySelects.forEach(select => {
        select.addEventListener('change', function() {
            const keyId = this.getAttribute('data-key-id');
            const categoryId = this.value;
            updateKeyCategory(keyId, categoryId);
        });
    });

    function filterApiKeys(categoryId) {
        apiKeys.forEach(key => {
            if (categoryId === 'all' || key.getAttribute('data-category-id') === categoryId) {
                key.style.display = 'block';
            } else {
                key.style.display = 'none';
            }
        });
    }

    async function updateKeyCategory(keyId, categoryId) {
        try {
            const response = await fetch('/update_key_category/' + keyId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrf_token')
                },
                body: JSON.stringify({ key_id: keyId, category_id: categoryId })
            });

            if (!response.ok) {
                throw new Error('Failed to update category');
            }

            const data = await response.json();
            showFeedback(data.message, 'success');
            
            // Update the data-category-id attribute of the API key element
            const apiKeyElement = document.querySelector(`.api-key[data-key-id="${keyId}"]`);
            if (apiKeyElement) {
                apiKeyElement.setAttribute('data-category-id', categoryId || 'none');
            }
        } catch (error) {
            console.error('Error:', error);
            showFeedback('Failed to update category', 'error');
        }
    }
});
