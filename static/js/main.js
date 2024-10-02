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

    // ... rest of the existing code ...

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
            if (categoryId === 'all' || categoryId === groupCategory || (categoryId === 'uncategorized' && groupCategory === 'uncategorized')) {
                group.style.display = 'block';
            } else {
                group.style.display = 'none';
            }
        });
    }

    // ... rest of the existing code ...

    console.log('Initial category selection');
    document.querySelector('#category-list li[data-category-id="all"]').click();
});
