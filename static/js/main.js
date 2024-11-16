document.addEventListener('DOMContentLoaded', function() {
    // FAQ functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions && faqQuestions.length > 0) {
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                if (answer) {
                    if (answer.style.display === 'block') {
                        answer.style.display = 'none';
                        question.classList.remove('active');
                    } else {
                        answer.style.display = 'block';
                        question.classList.add('active');
                    }
                }
            });
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

    if (deleteModal) {
        deleteModal.style.display = 'none';
    }

    if (addKeyBtn) {
        addKeyBtn.style.display = 'block';
        addKeyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (editModal) {
                editModal.style.display = 'block';
            }
        });
    }

    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyId = this.getAttribute('data-key-id');
            if (keyId) {
                copyApiKey(keyId);
            }
        });
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentKeyId = this.getAttribute('data-key-id');
            if (deleteModal) {
                deleteModal.style.display = 'block';
            }
        });
    });

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (currentKeyId && deleteModal) {
                deleteApiKey(currentKeyId);
                deleteModal.style.display = 'none';
            }
        });
    }

    if (cancelDeleteBtn && deleteModal) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteModal.style.display = 'none';
        });
    }

    if (deleteModal) {
        window.addEventListener('click', function(event) {
            if (event.target == deleteModal) {
                deleteModal.style.display = 'none';
            }
        });
    }

    if (categoryList) {
        categoryList.addEventListener('click', function(e) {
            if (e.target.tagName === 'LI') {
                const categoryId = e.target.getAttribute('data-category-id');
                if (categoryId) {
                    filterApiKeys(categoryId);
                    document.querySelectorAll('#category-list li').forEach(li => li.classList.remove('active'));
                    e.target.classList.add('active');
                }
            }
        });
    }

    categorySelects.forEach(select => {
        select.addEventListener('change', function() {
            const keyId = this.getAttribute('data-key-id');
            const categoryId = this.value;
            if (keyId && categoryId) {
                updateKeyCategory(keyId, categoryId);
            }
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
            if (keyId && editModal) {
                const keyName = this.closest('.api-key').querySelector('h4').textContent;
                const editKeyIdInput = document.getElementById('editKeyId');
                const editKeyNameInput = document.getElementById('editKeyName');
                if (editKeyIdInput && editKeyNameInput) {
                    editKeyIdInput.value = keyId;
                    editKeyNameInput.value = keyName;
                    editModal.style.display = 'block';
                }
            }
        });
    });

    const cancelEditBtn = document.getElementById('cancelEdit');
    if (cancelEditBtn && editModal) {
        cancelEditBtn.addEventListener('click', function() {
            editModal.style.display = 'none';
        });
    }

    const editForm = document.getElementById('editKeyForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const editKeyIdInput = document.getElementById('editKeyId');
            const editKeyNameInput = document.getElementById('editKeyName');
            if (editKeyIdInput && editKeyNameInput) {
                const keyId = editKeyIdInput.value;
                const newKeyName = editKeyNameInput.value;
                editApiKey(keyId, newKeyName);
            }
        });
    }
});
