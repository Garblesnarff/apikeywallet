document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('deleteModal');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const copyButtons = document.querySelectorAll('.copy-btn');
    const categoryList = document.getElementById('category-list');
    const categorySelects = document.querySelectorAll('.category-select');
    const editButtons = document.querySelectorAll('.edit-btn');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editKeyForm');
    const editKeyNameInput = document.getElementById('editKeyName');
    const editKeyIdInput = document.getElementById('editKeyId');
    const cancelEditBtn = document.getElementById('cancelEdit');
    let currentKeyId = null;
    
    modal.style.display = 'none';

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

    const addKeyForm = document.getElementById('add-key-form');
    if (addKeyForm) {
        addKeyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitAddKeyForm(this);
        });
    }

    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-key-id');
            const keyName = this.closest('.api-key').querySelector('h4').textContent;
            editKeyIdInput.value = keyId;
            editKeyNameInput.value = keyName;
            editModal.style.display = 'block';
        });
    });

    cancelEditBtn.addEventListener('click', function() {
        editModal.style.display = 'none';
    });

    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const keyId = editKeyIdInput.value;
        const newKeyName = editKeyNameInput.value;
        editApiKey(keyId, newKeyName);
    });

    const carousels = document.querySelectorAll('.api-key-carousel');
    carousels.forEach(carousel => {
        const inner = carousel.querySelector('.carousel-inner');
        const prevBtn = carousel.querySelector('.prev');
        const nextBtn = carousel.querySelector('.next');
        let position = 0;

        nextBtn.addEventListener('click', () => {
            position--;
            updateCarouselPosition();
        });

        prevBtn.addEventListener('click', () => {
            position++;
            updateCarouselPosition();
        });

        function updateCarouselPosition() {
            const items = inner.querySelectorAll('.api-key');
            position = Math.min(Math.max(position, -items.length + 1), 0);
            inner.style.transform = `translateX(${position * 100}%)`;
        }
    });

    const toggleVisibilityButtons = document.querySelectorAll('.toggle-visibility-btn');
    toggleVisibilityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-key-id');
            const maskedKeyElement = this.closest('.api-key').querySelector('.masked-key');
            const icon = this.querySelector('i');
            if (icon.classList.contains('fa-eye')) {
                fetch(`/get_key/${keyId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrf_token')
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.key) {
                        maskedKeyElement.textContent = data.key;
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    } else if (data.error) {
                        throw new Error(data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showFeedback('Failed to retrieve API key: ' + error.message, 'error');
                });
            } else {
                maskedKeyElement.textContent = '••••••••••••••••';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    const editCategoryButtons = document.querySelectorAll('.edit-category-btn');
    const editCategoryModal = document.getElementById('editCategoryModal');
    const editCategoryForm = document.getElementById('editCategoryForm');
    const editCategoryNameInput = document.getElementById('editCategoryName');
    const cancelEditCategoryBtn = document.getElementById('cancelEditCategory');

    editCategoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-category-id');
            const categoryName = this.getAttribute('data-category-name');
            editCategoryNameInput.value = categoryName;
            editCategoryForm.setAttribute('action', `/edit_category/${categoryId}`);
            editCategoryModal.style.display = 'block';
        });
    });

    cancelEditCategoryBtn.addEventListener('click', function() {
        editCategoryModal.style.display = 'none';
    });

    editCategoryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrf_token')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showFeedback(data.message, 'success');
                editCategoryModal.style.display = 'none';
                location.reload();
            } else {
                showFeedback(data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showFeedback('An error occurred while updating the category.', 'error');
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target == editCategoryModal) {
            editCategoryModal.style.display = 'none';
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

    function filterApiKeys(categoryId) {
        const apiKeys = document.querySelectorAll('.api-key');
        const categoryGroups = document.querySelectorAll('.category-group');

        if (categoryId === 'all') {
            apiKeys.forEach(key => key.style.display = 'block');
            categoryGroups.forEach(group => group.style.display = 'block');
        } else {
            apiKeys.forEach(key => {
                if (key.getAttribute('data-category-id') === categoryId) {
                    key.style.display = 'block';
                } else {
                    key.style.display = 'none';
                }
            });

            categoryGroups.forEach(group => {
                if (group.getAttribute('data-category-id') === categoryId) {
                    group.style.display = 'block';
                } else {
                    group.style.display = 'none';
                }
            });
        }
    }

    async function updateKeyCategory(keyId, categoryId) {
        try {
            const response = await fetch(`/update_key_category/${keyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrf_token')
                },
                body: JSON.stringify({ category_id: parseInt(categoryId) })
            });

            if (!response.ok) {
                throw new Error('Failed to update category');
            }

            const data = await response.json();
            showFeedback(data.message, 'success');
            
            const apiKeyElement = document.querySelector(`.api-key[data-key-id="${keyId}"]`);
            if (apiKeyElement) {
                apiKeyElement.setAttribute('data-category-id', categoryId === '0' ? 'uncategorized' : categoryId);
            }

            setTimeout(() => {
                location.reload();
            }, 1000);
        } catch (error) {
            console.error('Error:', error);
            showFeedback('Failed to update category', 'error');
        }
    }

    async function submitAddKeyForm(form) {
        try {
            const formData = new FormData(form);
            const response = await fetch('/add_key', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrf_token')
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                showFeedback(result.message, 'success');
                setTimeout(() => {
                    window.location.href = '/wallet';
                }, 1000);
            } else {
                if (result.errors) {
                    Object.keys(result.errors).forEach(field => {
                        const errorElement = document.querySelector(`#${field}-error`);
                        if (errorElement) {
                            errorElement.textContent = result.errors[field].join(', ');
                        }
                    });
                } else {
                    showFeedback(result.error, 'error');
                }
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        }
    }

    async function editApiKey(keyId, newKeyName) {
        try {
            const response = await fetch(`/edit_key/${keyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrf_token')
                },
                body: JSON.stringify({ key_name: newKeyName })
            });

            const data = await response.json();

            if (response.ok) {
                showFeedback(data.message, 'success');
                editModal.style.display = 'none';
                const keyElement = document.querySelector(`.api-key[data-key-id="${keyId}"] h4`);
                if (keyElement) {
                    keyElement.textContent = newKeyName;
                }
            } else {
                throw new Error(data.error || 'Failed to update API key name');
            }
        } catch (error) {
            console.error('Error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        }
    }

    function showFeedback(message, type) {
        const feedbackElement = document.createElement('div');
        feedbackElement.textContent = message;
        feedbackElement.className = `alert alert-${type}`;
        document.querySelector('main').insertBefore(feedbackElement, document.querySelector('main').firstChild);

        setTimeout(() => {
            feedbackElement.remove();
        }, 5000);
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    const categoryListItems = document.querySelectorAll('#category-list li');
    categoryListItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target !== this.querySelector('a')) {
                e.preventDefault();
                this.querySelector('a').click();
            }
        });
    });
});