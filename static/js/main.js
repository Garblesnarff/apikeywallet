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

    function initializeCarousels() {
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
    }

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

            if (response.ok) {
                showFeedback(data.message, 'success');
                refreshWallet();
            } else {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
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
            refreshWallet();
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
                refreshWallet();
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
                refreshWallet();
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

    function toggleVisibility(event) {
        const button = event.currentTarget;
        const keyId = button.getAttribute('data-key-id');
        const maskedKeyElement = button.closest('.api-key').querySelector('.masked-key');
        const icon = button.querySelector('i');
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
    }

    function showEditModal(event) {
        const button = event.currentTarget;
        const keyId = button.getAttribute('data-key-id');
        const keyName = button.closest('.api-key').querySelector('h4').textContent;
        editKeyIdInput.value = keyId;
        editKeyNameInput.value = keyName;
        editModal.style.display = 'block';
    }

    function showDeleteModal(event) {
        const button = event.currentTarget;
        currentKeyId = button.getAttribute('data-key-id');
        modal.style.display = 'block';
    }

    function updateCategoryListAndDisplay() {
        fetch('/get_categories_and_keys')
            .then(response => response.json())
            .then(data => {
                // Update category list in sidebar
                const categoryList = document.getElementById('category-list');
                categoryList.innerHTML = `
                    <li data-category-id="all" class="active">
                        <a href="#"><i class="fas fa-layer-group"></i> All Keys</a>
                    </li>
                `;
                data.categories.forEach(category => {
                    categoryList.innerHTML += `
                        <li data-category-id="${category.id}">
                            <a href="#"><i class="fas fa-folder"></i> ${category.name}</a>
                        </li>
                    `;
                });
                categoryList.innerHTML += `
                    <li data-category-id="uncategorized">
                        <a href="#"><i class="fas fa-question-circle"></i> Uncategorized</a>
                    </li>
                `;

                // Update API key display
                const apiKeyContent = document.querySelector('.api-key-content');
                apiKeyContent.innerHTML = '<h2>Your KeyGuardian Wallet</h2>';
                
                Object.entries(data.grouped_keys).forEach(([categoryName, keys]) => {
                    const categoryGroup = document.createElement('div');
                    categoryGroup.className = 'category-group';
                    categoryGroup.setAttribute('data-category-id', categoryName === 'Uncategorized' ? 'uncategorized' : data.categories.find(c => c.name === categoryName)?.id);
                    
                    categoryGroup.innerHTML = `
                        <h3>${categoryName}</h3>
                        <div class="api-key-carousel">
                            <div class="carousel-inner">
                                ${keys.map(key => `
                                    <div class="api-key" data-category-id="${key.category_id || 'uncategorized'}" data-key-id="${key.id}">
                                        <h4>${key.key_name}</h4>
                                        <p class="masked-key">••••••••••••••••</p>
                                        <div class="key-actions">
                                            <button class="toggle-visibility-btn" data-key-id="${key.id}" title="Toggle Visibility"><i class="fas fa-eye"></i></button>
                                            <button class="copy-btn" data-key-id="${key.id}" title="Copy Key"><i class="fas fa-copy"></i></button>
                                            <button class="edit-btn" data-key-id="${key.id}" title="Edit Key"><i class="fas fa-edit"></i></button>
                                            <button class="delete-btn" data-key-id="${key.id}" title="Delete Key"><i class="fas fa-trash-alt"></i></button>
                                            <select class="category-select" data-key-id="${key.id}">
                                                <option value="0">Uncategorized</option>
                                                ${data.categories.map(c => `<option value="${c.id}" ${c.id === key.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                            </select>
                                        </div>
                                        <p class="date-added">Added on: ${new Date(key.date_added).toLocaleString()}</p>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="carousel-control prev">&lt;</button>
                            <button class="carousel-control next">&gt;</button>
                        </div>
                    `;
                    
                    apiKeyContent.appendChild(categoryGroup);
                });

                // Re-attach event listeners
                attachEventListeners();
            })
            .catch(error => {
                console.error('Error updating categories and keys:', error);
                showFeedback('Failed to update categories and keys', 'error');
            });
    }

    function attachEventListeners() {
        // Re-attach event listeners for all dynamic elements
        document.querySelectorAll('.toggle-visibility-btn').forEach(btn => btn.addEventListener('click', toggleVisibility));
        document.querySelectorAll('.copy-btn').forEach(btn => btn.addEventListener('click', (e) => copyApiKey(btn.getAttribute('data-key-id'))));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', showEditModal));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', showDeleteModal));
        document.querySelectorAll('.category-select').forEach(select => select.addEventListener('change', (e) => updateKeyCategory(select.getAttribute('data-key-id'), select.value)));
        
        // Re-initialize carousels
        initializeCarousels();

        // Re-attach category list item click events
        const categoryListItems = document.querySelectorAll('#category-list li');
        categoryListItems.forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target !== this.querySelector('a')) {
                    e.preventDefault();
                    this.querySelector('a').click();
                }
            });
        });
    }

    // Call this function after any operation that modifies categories or keys
    function refreshWallet() {
        updateCategoryListAndDisplay();
    }

    // Initial call to set up the wallet
    refreshWallet();
});