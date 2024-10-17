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
    const addKeyBtn = document.getElementById('add-new-api-key-btn');
    const addKeyModal = document.getElementById('addKeyModal');
    let currentKeyId = null;
    
    modal.style.display = 'none';

    if (addKeyBtn) {
        console.log('Add New API Key button found');
        addKeyBtn.style.display = 'block';
        addKeyBtn.addEventListener('click', function(e) {
            console.log('Add New API Key button clicked');
            e.preventDefault();
            addKeyModal.style.display = 'block';
        });
    } else {
        console.error('Add New API Key button not found');
    }

    setInterval(() => {
        const addKeyBtn = document.getElementById('add-new-api-key-btn');
        if (addKeyBtn) {
            console.log('Add New API Key button visibility:', getComputedStyle(addKeyBtn).display);
        } else {
            console.error('Add New API Key button not found in DOM');
        }
    }, 5000);

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

    // FAQ functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            answer.style.display = answer.style.display === 'block' ? 'none' : 'block';
            question.classList.toggle('active');
        });
    });
});
