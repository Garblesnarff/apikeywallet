document.addEventListener('DOMContentLoaded', function() {
    // FAQ functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions && faqQuestions.length > 0) {
        faqQuestions.forEach(question => {
            if (question) {
                question.addEventListener('click', () => {
                    const answer = question.nextElementSibling;
                    if (answer) {
                        const currentDisplay = window.getComputedStyle(answer).display;
                        answer.style.display = currentDisplay === 'block' ? 'none' : 'block';
                        question.classList.toggle('active');
                    }
                });
            }
        });
    }

    // API Key functionality
    const deleteModal = document.getElementById('deleteModal');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const copyButtons = document.querySelectorAll('.copy-btn');
    const categoryList = document.getElementById('category-list');
    const categorySelects = document.querySelectorAll('.category-select');
    const editButtons = document.querySelectorAll('.edit-btn');
    const editModal = document.getElementById('editModal');
    const addKeyBtn = document.getElementById('add-new-api-key-btn');
    let currentKeyId = null;

    // Initialize modals if they exist
    if (deleteModal) {
        deleteModal.style.display = 'none';
    }

    if (editModal) {
        editModal.style.display = 'none';
    }

    // Add Key Button functionality
    if (addKeyBtn) {
        addKeyBtn.style.display = 'block';
        addKeyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/add_key';
        });
    }

    // Copy Button functionality
    if (copyButtons.length > 0) {
        copyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const keyId = this.getAttribute('data-key-id');
                if (keyId) {
                    copyApiKey(keyId);
                }
            });
        });
    }

    // Delete Button functionality
    if (deleteButtons.length > 0) {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                currentKeyId = this.getAttribute('data-key-id');
                if (currentKeyId && deleteModal) {
                    deleteModal.style.display = 'block';
                }
            });
        });
    }

    // Confirm Delete functionality
    if (confirmDeleteBtn && deleteModal) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (currentKeyId) {
                deleteApiKey(currentKeyId);
                deleteModal.style.display = 'none';
            }
        });
    }

    // Cancel Delete functionality
    if (cancelDeleteBtn && deleteModal) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteModal.style.display = 'none';
        });
    }

    // Modal click-outside functionality
    if (deleteModal) {
        window.addEventListener('click', function(event) {
            if (event.target === deleteModal) {
                deleteModal.style.display = 'none';
            }
        });
    }

    // Category list functionality
    if (categoryList) {
        categoryList.addEventListener('click', function(e) {
            const target = e.target.closest('li');
            if (target) {
                const categoryId = target.getAttribute('data-category-id');
                if (categoryId) {
                    const links = target.getElementsByTagName('a');
                    if (links.length > 0) {
                        links[0].click();
                    }
                }
            }
        });
    }

    // Category select functionality
    if (categorySelects.length > 0) {
        categorySelects.forEach(select => {
            select.addEventListener('change', function() {
                const keyId = this.getAttribute('data-key-id');
                const categoryId = this.value;
                if (keyId && categoryId) {
                    updateKeyCategory(keyId, categoryId);
                }
            });
        });
    }

    // Edit functionality
    if (editButtons.length > 0) {
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const keyId = this.getAttribute('data-key-id');
                if (keyId && editModal) {
                    const keyElement = this.closest('.api-key');
                    if (keyElement) {
                        const keyName = keyElement.querySelector('h4')?.textContent;
                        const editKeyIdInput = document.getElementById('editKeyId');
                        const editKeyNameInput = document.getElementById('editKeyName');
                        if (editKeyIdInput && editKeyNameInput && keyName) {
                            editKeyIdInput.value = keyId;
                            editKeyNameInput.value = keyName;
                            editModal.style.display = 'block';
                        }
                    }
                }
            });
        });
    }

    // Edit form functionality
    const editForm = document.getElementById('editKeyForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const editKeyIdInput = document.getElementById('editKeyId');
            const editKeyNameInput = document.getElementById('editKeyName');
            if (editKeyIdInput && editKeyNameInput) {
                const keyId = editKeyIdInput.value;
                const newKeyName = editKeyNameInput.value;
                if (keyId && newKeyName) {
                    editApiKey(keyId, newKeyName);
                }
            }
        });
    }

    // Cancel Edit functionality
    const cancelEditBtn = document.getElementById('cancelEdit');
    if (cancelEditBtn && editModal) {
        cancelEditBtn.addEventListener('click', function() {
            editModal.style.display = 'none';
        });
    }
});
