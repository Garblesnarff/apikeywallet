document.addEventListener('DOMContentLoaded', function() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const addCategoryModal = document.getElementById('addCategoryModal');
    const confirmAddCategoryBtn = document.getElementById('confirmAddCategory');
    const cancelAddCategoryBtn = document.getElementById('cancelAddCategory');
    const newCategoryNameInput = document.getElementById('newCategoryName');
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
            deleteModal.style.display = 'block';
        });
    });

    confirmDeleteBtn.addEventListener('click', function() {
        if (currentKeyId) {
            deleteApiKey(currentKeyId);
            deleteModal.style.display = 'none';
        }
    });

    cancelDeleteBtn.addEventListener('click', function() {
        deleteModal.style.display = 'none';
    });

    addCategoryBtn.addEventListener('click', function() {
        addCategoryModal.style.display = 'block';
    });

    confirmAddCategoryBtn.addEventListener('click', function() {
        const categoryName = newCategoryNameInput.value.trim();
        if (categoryName) {
            addCategory(categoryName);
            addCategoryModal.style.display = 'none';
            newCategoryNameInput.value = '';
        }
    });

    cancelAddCategoryBtn.addEventListener('click', function() {
        addCategoryModal.style.display = 'none';
        newCategoryNameInput.value = '';
    });

    window.addEventListener('click', function(event) {
        if (event.target == deleteModal) {
            deleteModal.style.display = 'none';
        }
        if (event.target == addCategoryModal) {
            addCategoryModal.style.display = 'none';
            newCategoryNameInput.value = '';
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

    async function addCategory(categoryName) {
        try {
            const response = await fetch('/add_category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrf_token')
                },
                body: JSON.stringify({ name: categoryName })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            showFeedback(data.message, 'success');
            updateCategoryList(data);
        } catch (error) {
            console.error('Error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        }
    }

    function updateCategoryList(newCategory) {
        const categoryList = document.getElementById('category-list');
        const newItem = document.createElement('li');
        newItem.innerHTML = `<a href="/view_category/${newCategory.id}">${newCategory.name}</a>`;
        categoryList.appendChild(newItem);
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
});
