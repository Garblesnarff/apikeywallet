document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
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
            console.log(`Category clicked: ${categoryId}`);
            filterApiKeys(categoryId);
            document.querySelectorAll('#category-list li').forEach(li => {
                li.classList.remove('active');
            });
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
        console.log(`Filtering by category: ${categoryId}`);
        const apiKeys = document.querySelectorAll('.api-key');
        const categoryGroups = document.querySelectorAll('.category-group');

        apiKeys.forEach(key => {
            const keyCategory = key.getAttribute('data-category-id');
            console.log(`Key ${key.getAttribute('data-key-id')} category: ${keyCategory}, Filtering category: ${categoryId}`);
            if (categoryId === 'all' || categoryId === keyCategory || (categoryId === 'uncategorized' && (!keyCategory || keyCategory === '0'))) {
                key.style.display = 'block';
            } else {
                key.style.display = 'none';
            }
        });

        categoryGroups.forEach(group => {
            const groupCategory = group.getAttribute('data-category-id');
            console.log(`Category group: ${groupCategory}, Filtering category: ${categoryId}`);
            if (categoryId === 'all') {
                group.style.display = 'block';
            } else if (categoryId === groupCategory || (categoryId === 'uncategorized' && groupCategory === 'uncategorized')) {
                group.style.display = 'block';
            } else {
                group.style.display = 'none';
            }
        });
    }

    function updateKeyCategory(keyId, categoryId) {
        console.log(`Updating category for key ${keyId} to ${categoryId}`);
        const csrfToken = getCsrfToken();
        console.log('CSRF Token for update:', csrfToken);

        if (!csrfToken) {
            console.error('CSRF token not found');
            showFeedback('Error: CSRF token not found. Please refresh the page and try again.', 'error');
            return;
        }

        fetch(`/update_key_category/${keyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ category_id: categoryId })
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.message) {
                console.log(`Category update successful: ${data.message}`);
                showFeedback(data.message, 'success');
                const apiKey = document.querySelector(`.api-key[data-key-id="${keyId}"]`);
                if (apiKey) {
                    const oldCategoryId = apiKey.getAttribute('data-category-id');
                    apiKey.setAttribute('data-category-id', categoryId);
                    
                    // Move the API key to the correct category group
                    const newCategoryGroup = document.querySelector(`.category-group[data-category-id="${categoryId}"]`);
                    const oldCategoryGroup = apiKey.closest('.category-group');
                    
                    if (newCategoryGroup && oldCategoryGroup) {
                        newCategoryGroup.querySelector('.carousel-inner').appendChild(apiKey);
                        
                        // Hide old category group if it's empty
                        if (oldCategoryGroup.querySelectorAll('.api-key').length === 0) {
                            oldCategoryGroup.style.display = 'none';
                        }
                        
                        // Show new category group
                        newCategoryGroup.style.display = 'block';
                    }
                    
                    // Update the active category view
                    const activeCategory = document.querySelector('#category-list li.active');
                    if (activeCategory) {
                        filterApiKeys(activeCategory.getAttribute('data-category-id'));
                    } else {
                        filterApiKeys('all');
                    }
                } else {
                    console.error(`API key element with id ${keyId} not found`);
                }
            } else if (data.error) {
                console.error(`Category update failed: ${data.error}`);
                showFeedback(data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error updating category:', error);
            showFeedback('Failed to update category: ' + error.message, 'error');
        });
    }

    function getCsrfToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        const token = metaTag ? metaTag.getAttribute('content') : null;
        console.log('Retrieved CSRF token:', token);
        return token;
    }

    function showFeedback(message, type) {
        const feedbackElement = document.createElement('div');
        feedbackElement.textContent = message;
        feedbackElement.className = `alert alert-${type}`;
        document.body.insertBefore(feedbackElement, document.body.firstChild);
        setTimeout(() => {
            feedbackElement.remove();
        }, 3000);
    }

    console.log('Initial category selection');
    const allCategoryLi = document.querySelector('#category-list li[data-category-id="all"]');
    if (allCategoryLi) {
        allCategoryLi.click();
    } else {
        console.error('All category list item not found');
    }
});
